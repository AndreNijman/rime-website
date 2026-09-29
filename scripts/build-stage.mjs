#!/usr/bin/env node
// ─── build-stage.mjs ─────────────────────────────────────────────────────────
// Publishes the recordings of the real Rime Shell (scripts/capture/) as the
// site's stages:
//
//   node scripts/build-stage.mjs WORK_DIR
//
// WORK_DIR/clips/<variant>/ holds what cut.py made from each take: clips.json,
// rest.png (the resting desktop), one still per settled surface and every
// transition as AV1 and H.264. This writes
//
//   public/media/shell/<variant>/…   content-hashed clips and stills
//   src/data/stage.json               what ProductStage and stage.ts read
//
// Stills are AVIF at four widths plus one JPEG for browsers without AVIF. The
// Reduce Motion variants share their full-motion twin's stills: a desktop at
// rest looks the same either way.
// ─────────────────────────────────────────────────────────────────────────────
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const work = process.argv[2];
if (!work) { console.error("usage: build-stage.mjs WORK_DIR"); process.exit(2); }
const clipsDir = join(work, "clips");
const OUT = join(ROOT, "public/media/shell");
const WIDTHS = [1280, 1920, 2560, 3840];

const hash = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

async function still(png, dest, name) {
  const src = readFileSync(png);
  const h = hash(src);
  const avif = [];
  for (const w of WIDTHS) {
    const f = `${name}.${h}.${w}.avif`;
    if (!existsSync(join(dest, f)))
      await sharp(src).resize(w).avif({ quality: w >= 2560 ? 58 : 62, effort: 6, chromaSubsampling: "4:4:4" }).toFile(join(dest, f));
    published.add(join(dest, f));
    avif.push({ w, src: f });
  }
  const jpg = `${name}.${h}.1920.jpg`;
  if (!existsSync(join(dest, jpg))) await sharp(src).resize(1920).jpeg({ quality: 84, mozjpeg: true }).toFile(join(dest, jpg));
  published.add(join(dest, jpg));
  return { avif, jpg };
}

const variants = readdirSync(clipsDir).filter((v) => existsSync(join(clipsDir, v, "clips.json"))).sort();
// Content-hashed names: what is already there is reused, and whatever this run
// does not publish is removed at the end.
mkdirSync(OUT, { recursive: true });
const published = new Set();
const manifest = { variants: {} };
let shell = null, speed = null;

for (const v of variants) {
  const dir = join(clipsDir, v);
  const m = JSON.parse(readFileSync(join(dir, "clips.json"), "utf8"));
  shell ??= m.shell; speed ??= m.speed;
  if (m.shell !== shell) throw new Error(`${v} was recorded from ${m.shell}, the others from ${shell}`);
  const dest = join(OUT, v);
  mkdirSync(dest, { recursive: true });
  const rel = (f) => `/media/shell/${v}/${f}`;
  const entry = { scene: m.scene, scheme: m.scheme, reduced: m.reduced, clips: {} };

  if (!m.reduced) {
    const r = await still(join(dir, "rest.png"), dest, "rest");
    entry.rest = { avif: r.avif.map((x) => ({ w: x.w, src: rel(x.src) })), jpg: rel(r.jpg) };
    // The settled Dashboard and Agent Center: what a stage shows without JavaScript.
    for (const name of ["dashboard", "agents"])
      if (existsSync(join(dir, `${name}.png`))) {
        const d = await still(join(dir, `${name}.png`), dest, name);
        entry[name] = { avif: d.avif.map((x) => ({ w: x.w, src: rel(x.src) })), jpg: rel(d.jpg) };
      }
  } else {
    entry.restFrom = v.replace(/-reduced$/, "");
  }

  for (const [name, c] of Object.entries(m.clips)) {
    const out = {};
    for (const codec of ["av1", "h264"]) {
      const src = join(dir, `${name}.${codec}.mp4`);
      const buf = readFileSync(src);
      const f = `${name}.${hash(buf)}.${codec}.mp4`;
      if (!existsSync(join(dest, f))) copyFileSync(src, join(dest, f));
      published.add(join(dest, f));
      out[codec] = rel(f);
    }
    entry.clips[name] = { from: c.from, to: c.to, box: c.box, duration: c.duration, settle: c.settle ?? c.duration, ...out };
  }
  manifest.variants[v] = entry;
  console.log(`${v}: ${Object.keys(entry.clips).length} clips${entry.rest ? ", stills" : ""}`);
}

manifest.shell = shell;
manifest.size = [3840, 2400];
manifest.logical = [1920, 1200];
manifest.recording = { dilation: speed, fps: 60 };
for (const v of Object.values(manifest.variants)) if (v.restFrom) {
  if (!manifest.variants[v.restFrom]?.rest) throw new Error(`no stills for ${v.restFrom}`);
}
for (const v of readdirSync(OUT)) {
  if (!variants.includes(v)) { rmSync(join(OUT, v), { recursive: true, force: true }); continue; }
  for (const f of readdirSync(join(OUT, v))) if (!published.has(join(OUT, v, f))) rmSync(join(OUT, v, f));
}
writeFileSync(join(ROOT, "src/data/stage.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log(`wrote src/data/stage.json (${variants.length} variants, shell ${shell.slice(0, 8)})`);
