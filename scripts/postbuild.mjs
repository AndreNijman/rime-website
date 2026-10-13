#!/usr/bin/env node
// ─── postbuild.mjs ───────────────────────────────────────────────────────────
// Runs on dist/ after `astro build`. Writes the files that depend on the built
// site (_redirects, security.txt, social cards) and then GATES the build
// (spec §9.2, §19.2):
//   • every release in the index has its page and its JSON, and they agree
//   • every internal link and asset reference resolves to a built file
//   • every <img> has an alt attribute
//   • no HTML style="" attributes (the CSP forbids them)
//   • JavaScript per page stays under budget
// Any failure exits non-zero.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const SITE = "https://rimeos.com";
const failures = [];
const fail = (m) => failures.push(m);

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(DIST);
const html = files.filter((f) => f.endsWith(".html"));
const rel = (f) => "/" + f.slice(DIST.length + 1);

// ── releases ──────────────────────────────────────────────────────────────────
const index = JSON.parse(readFileSync(join(DIST, "updates/index.json"), "utf8"));
for (const r of index.releases) {
  const page = join(DIST, "updates", `${r.id}.html`), json = join(DIST, "updates", `${r.id}.json`);
  if (!existsSync(page)) fail(`release ${r.id}: no page`);
  if (!existsSync(json)) { fail(`release ${r.id}: no JSON`); continue; }
  const j = JSON.parse(readFileSync(json, "utf8"));
  if (j.id !== r.id || j.provenance.osRevision !== r.provenance.osRevision) fail(`release ${r.id}: page and JSON disagree`);
  if (r.predecessor && !index.releases.some((x) => x.id === r.predecessor)) fail(`release ${r.id}: predecessor ${r.predecessor} is not published`);
  if (existsSync(page) && !readFileSync(page, "utf8").includes(r.provenance.osRevision)) fail(`release ${r.id}: page does not show its OS revision`);
}

// ── _redirects (Cloudflare Pages; other hosts use the fallback pages) ─────────
writeFileSync(join(DIST, "_redirects"), [
  `/updates/latest  /updates/${index.latest}  302`,
  `/install  /docs/install  301`,
  `/updates/  /updates  301`,
  "",
].join("\n"));

// ── security.txt (RFC 9116) ───────────────────────────────────────────────────
const expires = new Date(Date.now() + 330 * 864e5).toISOString().replace(/\.\d+Z$/, "Z");
mkdirSync(join(DIST, ".well-known"), { recursive: true });
writeFileSync(join(DIST, ".well-known/security.txt"), [
  "Contact: https://github.com/AndreNijman/rime-os/security/advisories/new",
  `Expires: ${expires}`,
  "Preferred-Languages: en",
  `Canonical: ${SITE}/.well-known/security.txt`,
  `Policy: ${SITE}/security#reporting`,
  "",
].join("\n"));

// ── social cards (spec §17.2): the mark, the title, the default scene's field ─
const scenes = JSON.parse(readFileSync(join(ROOT, "src/data/scenes.json"), "utf8"));
const def = scenes.scenes.find((s) => s.default);
const roles = def.dark.roles;
const field = join(ROOT, "public", def.dark.field.src);
const MARK = "M256 82 L292 264 L384 298 L292 332 L256 430 L220 332 L128 298 L220 264 Z";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// The title is laid out by MEASURING each line as the renderer draws it, with
// whatever font this machine has: a character count let a wider fallback font
// (CI's runners had no Noto Sans) run the headline off the card, and a fourth
// line was silently dropped. Nothing is cut: the type steps down until every
// word fits, and a title that still cannot fit fails the build.
const TITLE_X = 84, TITLE_MAX_W = 1200 - 2 * TITLE_X, TITLE_TOP = 340, TITLE_FOOT = 500;
const titleText = (s, size, x, y, fill) =>
  `<text x="${x}" y="${y}" font-family="Noto Sans, sans-serif" font-weight="600" font-size="${size}" letter-spacing="${(-2 * size / 76).toFixed(2)}" fill="${fill}">${esc(s)}</text>`;
const widths = new Map();
async function lineWidth(s, size) {
  const key = `${size}\u0000${s}`;
  if (widths.has(key)) return widths.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="3000" height="${Math.ceil(size * 1.6)}">${titleText(s, size, 0, Math.round(size * 1.2), "#fff")}</svg>`;
  const { info } = await sharp(Buffer.from(svg)).trim().toBuffer({ resolveWithObject: true });
  const w = info.width + Math.max(0, -(info.trimOffsetLeft ?? 0));
  widths.set(key, w);
  return w;
}
async function wrapMeasured(text, size) {
  const lines = [];
  let cur = "";
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && await lineWidth(next, size) > TITLE_MAX_W) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}
async function layoutTitle(text) {
  for (const size of [76, 68, 60, 54, 48, 42]) {
    const lines = await wrapMeasured(text, size);
    const step = Math.round(size * 1.1);
    const fits = (await Promise.all(lines.map((l) => lineWidth(l, size)))).every((w) => w <= TITLE_MAX_W);
    if (fits && TITLE_TOP + (lines.length - 1) * step <= TITLE_FOOT) return { size, step, lines };
  }
  return null;
}
async function card(out, kicker, title) {
  const layout = await layoutTitle(title);
  if (!layout) { fail(`social card ${rel(out)}: "${title}" does not fit the card at any size`); return; }
  const { size, step, lines } = layout;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect width="1200" height="630" fill="${roles.surfaceBase}"/>
    <g transform="translate(88 92) scale(0.16)"><path d="${MARK}" transform="translate(-108 -72)" fill="${roles.accent}"/></g>
    <text x="88" y="250" font-family="JetBrains Mono, monospace" font-size="30" fill="${roles.accentText}">${esc(kicker)}</text>
    ${lines.map((l, i) => titleText(l, size, TITLE_X, TITLE_TOP + i * step, roles.textPrimary)).join("")}
    <text x="88" y="570" font-family="Noto Sans, sans-serif" font-size="28" fill="${roles.textSecondary}">rimeos.com</text>
  </svg>`;
  const bg = await sharp(field).resize(1200, 630, { fit: "cover" }).blur(30).toBuffer();
  const overlay = await sharp(Buffer.from(svg)).png().toBuffer();
  const base = await sharp(bg).composite([{ input: Buffer.from(`<svg width="1200" height="630"><rect width="1200" height="630" fill="${roles.surfaceBase}" fill-opacity="0.55"/></svg>`) }]).png().toBuffer();
  mkdirSync(dirname(out), { recursive: true });
  // The field pre-blend already clears 7:1 for text; the card darkens it further.
  await sharp(base).composite([{ input: overlay }]).png({ compressionLevel: 9 }).toFile(out);
}
// The site's own tagline (src/data/site.ts), so the card says what the page says.
const tagline = /tagline:\s*"([^"]+)"/.exec(readFileSync(join(ROOT, "src/data/site.ts"), "utf8"))[1];
await card(join(DIST, "og/default.png"), "Rime", tagline);
for (const r of index.releases) await card(join(DIST, `og/updates/${r.id}.png`), r.name, r.title);

// ── links, assets, alt text, CSP-safe markup, JS budget ───────────────────────
const exists = (p) => {
  const clean = decodeURIComponent(p.split("#")[0].split("?")[0]);
  if (clean === "/" || clean === "") return existsSync(join(DIST, "index.html"));
  const f = join(DIST, clean);
  return existsSync(f) && statSync(f).isFile() || existsSync(f + ".html") || existsSync(join(f, "index.html"));
};
const JS_BUDGET = 160 * 1024;   // uncompressed, per page
for (const f of html) {
  const t = readFileSync(f, "utf8");
  for (const m of t.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)) {
    const u = m[1];
    if (u.startsWith("//")) continue;
    if (!exists(u)) { fail(`${rel(f)}: broken link ${u}`); continue; }
    const hash = u.split("#")[1];
    if (hash) {
      const target = u.split("#")[0].split("?")[0] || rel(f).replace(/\.html$/, "");
      const tf = target === "/" ? join(DIST, "index.html") : existsSync(join(DIST, target + ".html")) ? join(DIST, target + ".html") : join(DIST, target);
      if (existsSync(tf) && statSync(tf).isFile() && tf.endsWith(".html") && !readFileSync(tf, "utf8").includes(`id="${hash}"`)) fail(`${rel(f)}: ${u} — no element with id "${hash}"`);
    }
  }
  for (const m of t.matchAll(/\ssrcset="([^"]+)"/g))
    for (const part of m[1].split(",")) { const u = part.trim().split(/\s+/)[0]; if (u.startsWith("/") && !exists(u)) fail(`${rel(f)}: missing srcset ${u}`); }
  for (const m of t.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) fail(`${rel(f)}: <img> without alt`);
  if (/<[a-z][^>]*\sstyle="/i.test(t)) fail(`${rel(f)}: style="" attribute (blocked by the CSP)`);
  let js = 0;
  for (const m of t.matchAll(/<script[^>]+src="(\/[^"]+)"/g)) { const p = join(DIST, m[1]); if (existsSync(p)) js += statSync(p).size; }
  for (const m of t.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) js += m[1].length;
  // module imports pulled in by the entry scripts
  if (js > JS_BUDGET) fail(`${rel(f)}: ${Math.round(js / 1024)} KB of JavaScript (budget ${JS_BUDGET / 1024} KB)`);
}

const jsTotal = files.filter((f) => f.endsWith(".js")).reduce((a, f) => a + statSync(f).size, 0);
console.log(`postbuild: ${html.length} pages, ${index.releases.length} releases, ${Math.round(jsTotal / 1024)} KB JS in total`);
if (failures.length) { console.error(failures.map((m) => "✗ " + m).join("\n")); process.exit(1); }
console.log("✓ release pages, links, assets, alt text, CSP-safe markup and JS budget");
