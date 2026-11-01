#!/usr/bin/env node
// Vendors the Rime layered-ridge identity, byte for byte, from a pinned rime-os
// revision (files/branding/ridge/, the generated exports and their masters).
// Nothing here draws the mark: every shape and colour on the site comes from
// these files, read at build time by src/brand/ridge.mjs.
//
//   node scripts/sync-brand.mjs --check          offline: every vendored file still
//                                                matches its sha256 in src/brand/SOURCE.json
//   node scripts/sync-brand.mjs --check-upstream also compare with `git show <ref>:<path>`
//                                                in a rime-os checkout (--repo, default ../rime-os)
//   node scripts/sync-brand.mjs --ref <rev>      re-vendor from a rime-os checkout at <rev>
//
// One file is DERIVED here rather than copied, and recorded as such:
// apple-touch-icon.png is the dark app tile rendered full-bleed at 180 px (iOS
// rounds the corners itself and paints transparent ones black). Social cards
// are drawn by postbuild.mjs from the masters.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "src/brand/SOURCE.json");
const RIDGE = "files/branding/ridge";
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const sha256 = (b) => createHash("sha256").update(b).digest("hex");

// site path (relative to the repo root) → path in rime-os
const FILES = {
  // masters the components and social cards read
  "src/brand/ridge/rime-ridge-symbol.svg": `${RIDGE}/src/rime-ridge-symbol.svg`,
  "src/brand/ridge/rime-ridge-symbol-small.svg": `${RIDGE}/src/rime-ridge-symbol-small.svg`,
  "src/brand/ridge/rime-lockup-horizontal.svg.in": `${RIDGE}/templates/rime-lockup-horizontal.svg.in`,
  "src/brand/ridge/rime-app-icon-dark.svg": `${RIDGE}/svg/rime-app-icon-dark.svg`,
  "src/brand/ridge/palette.json": `${RIDGE}/src/palette.json`,
  // browser icons
  "public/favicon.svg": `${RIDGE}/favicon/favicon.svg`,
  "public/favicon.ico": `${RIDGE}/favicon/favicon.ico`,
  "public/favicon-16.png": `${RIDGE}/favicon/favicon-16.png`,
  "public/favicon-32.png": `${RIDGE}/favicon/favicon-32.png`,
  "public/favicon-48.png": `${RIDGE}/favicon/favicon-48.png`,
  // downloads on /brand (the two old names keep working: they are the mono symbol now)
  "public/brand/rime-mark-black.svg": `${RIDGE}/svg/rime-symbol-mono-black.svg`,
  "public/brand/rime-mark-white.svg": `${RIDGE}/svg/rime-symbol-mono-white.svg`,
  "public/brand/rime-symbol-light.svg": `${RIDGE}/svg/rime-symbol-light.svg`,
  "public/brand/rime-symbol-dark.svg": `${RIDGE}/svg/rime-symbol-dark.svg`,
  "public/brand/rime-lockup-light.svg": `${RIDGE}/svg/rime-lockup-horizontal-light.svg`,
  "public/brand/rime-lockup-dark.svg": `${RIDGE}/svg/rime-lockup-horizontal-dark.svg`,
  "public/brand/rime-lockup-mono-black.svg": `${RIDGE}/svg/rime-lockup-horizontal-mono-black.svg`,
  "public/brand/rime-lockup-mono-white.svg": `${RIDGE}/svg/rime-lockup-horizontal-mono-white.svg`,
  "public/brand/rime-app-icon-dark-512.png": `${RIDGE}/icons/app/rime-app-icon-dark-512.png`,
  "public/brand/rime-app-icon-light-512.png": `${RIDGE}/icons/app/rime-app-icon-light-512.png`,
};
const LICENCE_NOTE = "The Rime mark and wordmark are Rime's own artwork (rime-os docs/branding.md). The wordmark is outlined from Golos Text (SIL OFL 1.1); no font file is vendored.";

// Full-bleed dark tile: the app icon's own SVG with its corner radius removed.
async function appleTouch(appIconSvg) {
  const flat = appIconSvg.toString("utf8").replace(/(<rect\b[^>]*?)\s+rx="[^"]*"/, "$1");
  if (flat === appIconSvg.toString("utf8")) throw new Error("app icon has no rounded tile rect to flatten");
  return sharp(Buffer.from(flat), { density: 72 }).resize(180, 180).png({ compressionLevel: 9 }).toBuffer();
}
const DERIVED = { "public/apple-touch-icon.png": { from: "src/brand/ridge/rime-app-icon-dark.svg", how: "app tile, corner radius removed, 180 px (sharp)" } };

if (flag("--check") || flag("--check-upstream")) {
  const src = JSON.parse(readFileSync(SOURCE, "utf8"));
  let bad = 0;
  const all = { ...src.files, ...src.derived };
  for (const [site, rec] of Object.entries(all)) {
    const p = join(ROOT, site);
    if (!existsSync(p)) { console.error(`✗ ${site}: missing`); bad++; continue; }
    if (sha256(readFileSync(p)) !== rec.sha256) { console.error(`✗ ${site}: edited locally (sha256 differs from src/brand/SOURCE.json)`); bad++; }
  }
  for (const site of Object.keys(FILES)) if (!src.files[site]) { console.error(`✗ ${site}: not in SOURCE.json (re-vendor)`); bad++; }
  if (flag("--check-upstream")) {
    const repo = resolve(opt("--repo", join(ROOT, "../rime-os")));
    for (const [site, rec] of Object.entries(src.files)) {
      const up = execFileSync("git", ["-C", repo, "show", `${src.ref}:${rec.path}`]);
      if (!up.equals(readFileSync(join(ROOT, site)))) { console.error(`✗ ${site}: differs from rime-os ${src.ref}:${rec.path}`); bad++; }
    }
  }
  if (bad) process.exit(1);
  console.log(`✓ Rime brand files match rime-os ${src.ref.slice(0, 9)} (${Object.keys(src.files).length} vendored, ${Object.keys(src.derived).length} derived)`);
  process.exit(0);
}

const repo = resolve(opt("--repo", join(ROOT, "../rime-os")));
const prev = existsSync(SOURCE) ? JSON.parse(readFileSync(SOURCE, "utf8")) : null;
const ref = execFileSync("git", ["-C", repo, "rev-parse", opt("--ref", prev?.ref ?? "origin/main")], { encoding: "utf8" }).trim();
const record = { repo: "https://github.com/AndreNijman/rime-os", ref, note: LICENCE_NOTE, files: {}, derived: {} };
for (const [site, path] of Object.entries(FILES)) {
  const bytes = execFileSync("git", ["-C", repo, "show", `${ref}:${path}`], { maxBuffer: 1 << 26 });
  mkdirSync(dirname(join(ROOT, site)), { recursive: true });
  writeFileSync(join(ROOT, site), bytes);
  record.files[site] = { path, sha256: sha256(bytes) };
}
for (const [site, d] of Object.entries(DERIVED)) {
  const bytes = await appleTouch(readFileSync(join(ROOT, d.from)));
  writeFileSync(join(ROOT, site), bytes);
  record.derived[site] = { ...d, sha256: sha256(bytes) };
}
writeFileSync(SOURCE, JSON.stringify(record, null, 2) + "\n");
console.log(`vendored ${Object.keys(FILES).length} brand files from rime-os ${ref.slice(0, 9)}, derived ${Object.keys(DERIVED).length}`);
