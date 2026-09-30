#!/usr/bin/env node
// ─── build-scenes.mjs ────────────────────────────────────────────────────────
// Wallpaper → matugen → Rime Shell roles → web tokens, for every published
// scene in content/wallpapers.json. Also the responsive wallpaper images and
// each scene's Light Field (spec §2.3, §2.4, §14.3).
//
//   node scripts/build-scenes.mjs            regenerate everything (needs matugen)
//   node scripts/build-scenes.mjs --check    regenerate palettes and diff them
//                                            against the committed src/data/scenes.json
//                                            (skipped, loudly, where matugen is absent)
//
// The command is WallpaperService.qml's own, in a throwaway HOME so no user
// config leaks in (the provenance line of rime-shell's
// tests/fixtures/palettes-matugen-4.2.0.json):
//
//     matugen image <wall> --source-color-index 0 --type scheme-content -m <mode> --dry-run -j hex
//
// mapped as src/config/rime-shell-colors.json.example maps it, then resolved by
// the Shell's own roles.js. Before any of that, this script regenerates the
// Rime default wallpaper and compares it with that fixture: if the pipeline no
// longer reproduces what the Shell's tests pin, nothing is written.
//
// GATE: a published palette whose roles miss WCAG AA where the site uses them
// fails the build. roles.js's own fallbacks (`fired`) are normal and recorded.
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import * as Roles from "../src/vendor/rime-shell/roles.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = JSON.parse(readFileSync(join(ROOT, "content/wallpapers.json"), "utf8"));
const WALLS = join(ROOT, "assets/wallpapers");
const OUT_JSON = join(ROOT, "src/data/scenes.json");
const OUT_CSS = join(ROOT, "src/styles/generated/scenes.css");
const MEDIA = join(ROOT, "public/media/scenes");
const SHELL_REF = JSON.parse(readFileSync(join(ROOT, "src/vendor/rime-shell/SOURCE.json"), "utf8")).ref;
const CHECK = process.argv.includes("--check");

// The fixture the Shell's own tests pin for its default wallpaper.
const FIXTURE = {
  dark:  { background: "#121315", active: "#b2c8ec", text: "#e3e2e5", subtext: "#c4c6ce", border: "#44474d", iconFont: "#061f3b" },
  light: { background: "#faf9fb", active: "#000613", text: "#1b1c1e", subtext: "#44474d", border: "#c4c6ce", iconFont: "#061f3b" },
};
const FIELD_MAP = { background: "surface", active: "primary", text: "on_surface", subtext: "on_surface_variant", border: "outline_variant", iconFont: "primary_container" };

// ── colour helpers ───────────────────────────────────────────────────────────
const hexToRgb = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const to2 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0");
const rgbToHex = (c) => `#${to2(c.r)}${to2(c.g)}${to2(c.b)}`;
const kebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

// ── matugen ──────────────────────────────────────────────────────────────────
let matugenVersion = null;
try { matugenVersion = execFileSync("matugen", ["--version"], { encoding: "utf8" }).trim(); } catch { /* absent */ }

function matugen(file, mode) {
  const home = mkdtempSync(join(tmpdir(), "rime-matugen-"));
  try {
    const out = execFileSync("matugen", ["image", file, "--source-color-index", "0", "--type", "scheme-content",
      "-m", mode, "--dry-run", "-j", "hex"], { encoding: "utf8", env: { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config") }, maxBuffer: 1 << 26 });
    const c = JSON.parse(out).colors;
    const pick = (n) => { const v = c[n].default; return (typeof v === "string" ? v : v.color).toLowerCase(); };
    return Object.fromEntries(Object.entries(FIELD_MAP).map(([k, n]) => [k, pick(n)]));
  } finally { rmSync(home, { recursive: true, force: true }); }
}

// ── the web's contrast gate ──────────────────────────────────────────────────
// [foreground role, background roles, WCAG floor that fails the build, the
// Shell's target that only warns]. accentText / tertiary are only ever used
// for large type, icons and decoration on this site, so 3:1 is their floor.
const CHECKS = [
  ["textPrimary",       ["surfaceBase", "surfaceRaised", "surfaceOverlay", "surfaceHigh", "surfaceSelected"], 4.5, 7.0],
  ["textSecondary",     ["surfaceBase", "surfaceRaised", "surfaceOverlay", "surfaceHigh", "surfaceSelected"], 4.5, 4.5],
  // Tertiary is drawn on the base surface only (placeholders, decoration),
  // as in the Shell: on surfaceRaised it reads 2.96:1 on every light scheme.
  ["textTertiary",      ["surfaceBase"], 3.0, 3.0],
  ["accentText",        ["surfaceBase", "surfaceRaised"], 3.0, 3.0],
  ["onAccentContainer", ["accentContainer"], 4.5, 4.5],
  ["textPrimary",       ["accentContainer"], 4.5, 4.5],
  ["outlineStrong",     ["surfaceBase"], 1.3, 1.3],
];

function resolveScheme(src) {
  const { roles, fired } = Roles.resolve({ background: hexToRgb(src.background), active: hexToRgb(src.active), text: hexToRgb(src.text) });
  const r = { ...roles };
  r.hover = Roles.hover(roles.surfaceBase, roles.textPrimary);
  r.pressed = Roles.pressed(roles.surfaceBase, roles.textPrimary);
  const hex = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, rgbToHex(v)]));
  const checks = [];
  for (const [fg, bgs, floor, target] of CHECKS)
    for (const bg of bgs) {
      const ratio = Roles.contrast(r[fg], r[bg]);
      checks.push({ fg, bg, ratio: Math.round(ratio * 100) / 100, floor, target, ok: ratio >= floor, onTarget: ratio >= target });
    }
  return { source: src, roles: hex, fired, checks };
}

// ── images ───────────────────────────────────────────────────────────────────
const WIDTHS = [640, 1280, 1920, 2560];

async function responsive(id, file, hash) {
  const img = sharp(file);
  const meta = await img.metadata();
  const out = { width: meta.width, height: meta.height, sources: {} };
  for (const fmt of ["avif", "webp", "jpg"]) out.sources[fmt] = [];
  for (const w of WIDTHS.filter((w) => w <= meta.width).concat(meta.width < WIDTHS[0] ? [meta.width] : [])) {
    for (const fmt of ["avif", "webp", "jpg"]) {
      const name = `${id}.${hash}.${w}.${fmt}`;
      const dest = join(MEDIA, name);
      if (!existsSync(dest)) {
        let p = sharp(file).resize({ width: w });
        p = fmt === "avif" ? p.avif({ quality: 52, effort: 4 }) : fmt === "webp" ? p.webp({ quality: 76 }) : p.jpeg({ quality: 80, mozjpeg: true, progressive: true });
        await p.toFile(dest);
      }
      out.sources[fmt].push({ w, src: `/media/scenes/${name}` });
    }
  }
  // A tiny placeholder: the first frame of a stage is never empty (spec §3.5).
  const ph = await sharp(file).resize(32, 18, { fit: "cover" }).webp({ quality: 50 }).toBuffer();
  out.placeholder = `data:image/webp;base64,${ph.toString("base64")}`;
  return out;
}

// The Light Field: the wallpaper's light, pulled toward the page's own base
// surface just far enough that primary text on it still clears the Shell's
// 7:1 target at its worst pixel. The strength is SOLVED, not chosen.
async function lightField(id, file, hash, scheme, roles) {
  // 320 × 180, pre-blurred, so it can be drawn full-screen with no runtime
  // filter: the page composites it once and scrolls over it.
  const { data, info } = await sharp(file).resize(320, 180, { fit: "cover" }).blur(14).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const base = hexToRgb(roles.surfaceBase), text = hexToRgb(roles.textPrimary);
  let k = 0.3, worst = 0, buf;
  for (; k <= 0.96; k = Math.round((k + 0.02) * 100) / 100) {
    buf = Buffer.alloc(data.length);
    worst = Infinity;
    for (let i = 0; i < data.length; i += 3) {
      const px = { r: data[i] / 255, g: data[i + 1] / 255, b: data[i + 2] / 255 };
      const m = Roles.mix(px, base, k);
      buf[i] = Math.round(m.r * 255); buf[i + 1] = Math.round(m.g * 255); buf[i + 2] = Math.round(m.b * 255);
      worst = Math.min(worst, Roles.contrast(text, m));
    }
    if (worst >= 7.0) break;
  }
  if (worst < 7.0) throw new Error(`${id}/${scheme}: no Light Field strength keeps text at 7:1 (best ${worst.toFixed(2)})`);
  const name = `${id}.${hash}.field-${scheme}.webp`;
  await sharp(buf, { raw: { width: info.width, height: info.height, channels: 3 } }).webp({ quality: 82 }).toFile(join(MEDIA, name));
  return { src: `/media/scenes/${name}`, strength: k, worstTextContrast: Math.round(worst * 100) / 100 };
}

// ── run ──────────────────────────────────────────────────────────────────────
if (!matugenVersion) {
  const msg = "matugen is not installed: palettes cannot be regenerated here; using the committed src/data/scenes.json";
  if (CHECK) { console.warn(`! ${msg}`); process.exit(0); }
  console.error(`✗ ${msg}`); process.exit(1);
}

// Truth check first: the pipeline must reproduce the Shell's pinned fixture.
for (const mode of ["dark", "light"]) {
  const got = matugen(join(WALLS, "rime-wallpaper-default.jpg"), mode);
  for (const k of Object.keys(FIXTURE[mode]))
    if (got[k] !== FIXTURE[mode][k]) {
      console.error(`✗ ${mode}.${k}: matugen gave ${got[k]}, the Shell's fixture pins ${FIXTURE[mode][k]} — refusing to write palettes`);
      process.exit(1);
    }
}
console.log(`✓ reproduces rime-shell's palettes-matugen-4.2.0 fixture for the default wallpaper (${matugenVersion})`);

mkdirSync(MEDIA, { recursive: true });
mkdirSync(dirname(OUT_JSON), { recursive: true });
mkdirSync(dirname(OUT_CSS), { recursive: true });

const scenes = [];
let failed = 0;
for (const w of MANIFEST.wallpapers.filter((w) => w.publish)) {
  const file = join(WALLS, w.file);
  const bytes = readFileSync(file);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
  const scene = { id: w.id, name: w.name, kind: w.kind, note: w.note, source: w.source, licence: w.licence, default: !!w.default, sha256: createHash("sha256").update(bytes).digest("hex") };
  for (const mode of ["dark", "light"]) {
    scene[mode] = resolveScheme(matugen(file, mode));
    for (const c of scene[mode].checks.filter((c) => !c.ok)) {
      console.error(`✗ ${w.id}/${mode}: ${c.fg} on ${c.bg} = ${c.ratio}:1, below the ${c.floor}:1 floor`);
      failed++;
    }
    for (const c of scene[mode].checks.filter((c) => c.ok && !c.onTarget))
      console.warn(`  ${w.id}/${mode}: ${c.fg} on ${c.bg} = ${c.ratio}:1 (passes AA, under the Shell's ${c.target}:1 target)`);
    if (scene[mode].fired.length) console.log(`  ${w.id}/${mode}: roles.js fallbacks: ${scene[mode].fired.join("; ")}`);
  }
  if (!CHECK) {
    scene.image = await responsive(w.id, file, hash);
    for (const mode of ["dark", "light"]) scene[mode].field = await lightField(w.id, file, hash, mode, scene[mode].roles);
  }
  scenes.push(scene);
}
if (failed) { console.error(`✗ ${failed} contrast failure(s): palette role mapping rejected`); process.exit(1); }

const generator = {
  matugen: matugenVersion,
  command: "matugen image <wall> --source-color-index 0 --type scheme-content -m <mode> --dry-run -j hex",
  mapping: "rime-shell src/config/rime-shell-colors.json.example",
  roles: `rime-shell src/theme/roles.js @ ${SHELL_REF.slice(0, 8)}`,
};

if (CHECK) {
  const committed = JSON.parse(readFileSync(OUT_JSON, "utf8"));
  let drift = 0;
  for (const s of scenes) {
    const c = committed.scenes.find((x) => x.id === s.id);
    for (const mode of ["dark", "light"])
      if (!c || JSON.stringify(c[mode].roles) !== JSON.stringify(s[mode].roles)) { console.error(`✗ ${s.id}/${mode}: committed palette differs from a fresh matugen run`); drift++; }
  }
  if (drift) process.exit(1);
  console.log(`✓ committed palettes match a fresh run (${scenes.length} scenes)`);
  process.exit(0);
}

// Drop media no scene references any more.
const keep = new Set(scenes.flatMap((s) => [...Object.values(s.image.sources).flat().map((x) => x.src), s.dark.field.src, s.light.field.src]).map((p) => p.split("/").pop()));
for (const f of readdirSync(MEDIA)) if (!keep.has(f)) rmSync(join(MEDIA, f));

writeFileSync(OUT_JSON, JSON.stringify({ generator, scenes }, null, 2) + "\n");

// ── CSS ──────────────────────────────────────────────────────────────────────
// A palette can sit on any element (the demo stage carries its own); the
// scheme is the document's. Dark unless the visitor chose otherwise: no
// data-scheme (nothing stored, or no JS) is dark, data-scheme="light" is light,
// and data-scheme="auto" follows prefers-color-scheme.
const ROLE_VARS = ["surfaceBase", "surfaceRaised", "surfaceOverlay", "surfaceHigh", "surfaceSelected", "surfaceOnSelected",
  "accent", "accentContainer", "onAccentContainer", "accentText", "textPrimary", "textSecondary", "textTertiary",
  "outlineSoft", "outlineStrong", "hairline", "iconDefault", "iconActive", "hover", "pressed"];
const block = (s, mode) => [
  ...ROLE_VARS.map((r) => `  --rime-${kebab(r)}: ${s[mode].roles[r]};`),
  `  --rime-src-subtext: ${s[mode].source.subtext};`,
  `  --rime-src-border: ${s[mode].source.border};`,
  `  --rime-src-icon: ${s[mode].source.iconFont};`,
  `  --rime-field: url("${s[mode].field.src}");`,
  `  color-scheme: ${mode};`,
].join("\n");
let css = `/* GENERATED by scripts/build-scenes.mjs from content/wallpapers.json — do not edit.\n` +
  ` * matugen ${matugenVersion}; roles: rime-shell roles.js @ ${SHELL_REF.slice(0, 8)}. */\n`;
for (const s of scenes) {
  const sel = (extra) => `${extra}[data-palette="${s.id}"]`;
  css += `\n${s.default ? ":root,\n" : ""}${sel("")} {\n${block(s, "dark")}\n}\n`;
  css += `:root[data-scheme="light"]${sel("")},\n:root[data-scheme="light"] ${sel("")}${s.default ? `,\n:root[data-scheme="light"]:not([data-palette])` : ""} {\n${block(s, "light")}\n}\n`;
  css += `@media (prefers-color-scheme: light) {\n  :root[data-scheme="auto"]${sel("")},\n  :root[data-scheme="auto"] ${sel("")}${s.default ? `,\n  :root[data-scheme="auto"]:not([data-palette])` : ""} {\n${block(s, "light").replace(/^/gm, "  ")}\n  }\n}\n`;
}
writeFileSync(OUT_CSS, css);
console.log(`wrote ${scenes.length} scenes → src/data/scenes.json, src/styles/generated/scenes.css, public/media/scenes/`);
