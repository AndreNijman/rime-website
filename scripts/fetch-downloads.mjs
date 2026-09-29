#!/usr/bin/env node
// ─── fetch-downloads.mjs ─────────────────────────────────────────────────────
// content/downloads.json from what GitHub actually publishes (spec §16.2: "the
// page renders only what is in the published manifest"). Reads rime-os's
// releases with `gh`: the newest one that carries an installer ISO (not simply
// the newest: Rime Remote's releases live in the same repository), keeping each
// ISO whose checksum file is published beside it and cross-checking that file
// against GitHub's own asset digest; and the newest Rime Remote release
// (`android-v<code>`), whose APK must agree with its checksum file, its
// metadata and GitHub's digest. Anything that does not verify is left out,
// loudly.
//
//   node scripts/fetch-downloads.mjs [--tag v2.1.0]
//
// The committed content/downloads.json is what the site builds from; CI can
// re-run this and diff to catch a release the site does not know about.
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "content/downloads.json");
const REPO = "AndreNijman/rime-os";
const args = process.argv.slice(2);
const tagArg = args.includes("--tag") ? args[args.indexOf("--tag") + 1] : null;
const gh = (...a) => JSON.parse(execFileSync("gh", a, { encoding: "utf8" }));

const releases = gh("api", `repos/${REPO}/releases?per_page=20`);
const published = releases.filter((r) => !r.draft && !r.prerelease);
const hasIso = (r) => r.assets.some((a) => /\.iso$/.test(a.name));
const current = tagArg ? published.find((r) => r.tag_name === tagArg) : published.find(hasIso);
if (!current) { console.error("no published release found"); process.exit(1); }

function artifactsOf(rel) {
  const out = [];
  for (const a of rel.assets) {
    if (!/\.iso$/.test(a.name)) continue;
    const sum = rel.assets.find((x) => x.name === `${a.name}.sha256`);
    const digest = (a.digest || "").replace(/^sha256:/, "");
    if (!sum) { console.warn(`! ${rel.tag_name}/${a.name}: no .sha256 published beside it — left out`); continue; }
    const text = execFileSync("curl", ["-fsSL", sum.browser_download_url], { encoding: "utf8" }).trim();
    const listed = text.split(/\s+/)[0];
    if (digest && listed !== digest) { console.error(`✗ ${a.name}: checksum file says ${listed}, GitHub says ${digest} — left out`); continue; }
    out.push({
      kind: "iso",
      flavour: /netinstall/.test(a.name) ? "netinstall" : "offline",
      arch: /x86_64|amd64/.test(a.name) ? "x86_64" : "unknown",
      name: a.name,
      url: a.browser_download_url,
      bytes: a.size,
      sha256: listed,
      checksumUrl: sum.browser_download_url,
      checksumFile: text,
      signature: null,
    });
  }
  return out;
}

const pinOf = (body) => {
  const m = body.match(/installs image `(sha256:[0-9a-f]{64})`, pinned as `([^`]+)`/);
  return m ? { imageDigest: m[1], pin: m[2] } : null;
};

const entry = (rel) => ({
  tag: rel.tag_name,
  name: rel.name,
  publishedAt: rel.published_at,
  url: rel.html_url,
  targetCommitish: rel.target_commitish,
  installs: pinOf(rel.body || ""),
  artifacts: artifactsOf(rel),
});

const cur = entry(current);
const prevRel = published.find((r) => r.tag_name !== current.tag_name && hasIso(r) && new Date(r.published_at) < new Date(current.published_at));

// Rime Remote for Android: the newest android-v<code> release, verified three ways.
function remoteOf() {
  const rel = published.find((r) => /^android-v\d+$/.test(r.tag_name) && r.assets.some((a) => /\.apk$/.test(a.name)));
  if (!rel) return null;
  const asset = (re) => rel.assets.find((a) => re.test(a.name));
  const apk = asset(/\.apk$/), sum = asset(/\.apk\.sha256$/), meta = asset(/\.json$/), sig = asset(/\.apk\.sig$/), pem = asset(/\.apk\.pem$/);
  if (!sum || !meta) { console.error(`✗ ${rel.tag_name}: no checksum or metadata beside the APK — left out`); return null; }
  const listed = execFileSync("curl", ["-fsSL", sum.browser_download_url], { encoding: "utf8" }).trim().split(/\s+/)[0];
  const m = JSON.parse(execFileSync("curl", ["-fsSL", meta.browser_download_url], { encoding: "utf8" }));
  const digest = (apk.digest || "").replace(/^sha256:/, "");
  if (listed !== m.sha256 || (digest && digest !== listed) || m.apk !== apk.name) {
    console.error(`✗ ${rel.tag_name}: checksum file ${listed}, metadata ${m.sha256}, GitHub ${digest || "?"} disagree — left out`);
    return null;
  }
  // What signs it and what it runs on, read from the commit it was built from.
  const at = (path) => execFileSync("gh", ["api", "-H", "Accept: application/vnd.github.raw", `repos/${REPO}/contents/${path}?ref=${m.commit}`], { encoding: "utf8" });
  const certs = at("android/signing-certificate.sha256").split("\n").map((l) => l.trim()).filter((l) => /^[0-9a-f]{64}$/.test(l));
  const minSdk = Number((at("android/app/build.gradle.kts").match(/minSdk\s*=\s*(\d+)/) || [])[1]) || null;
  return {
    tag: rel.tag_name, name: rel.name, publishedAt: rel.published_at, url: rel.html_url,
    versionName: m.versionName, versionCode: m.versionCode, commit: m.commit, minSdk, signingCertificates: certs,
    apk: { name: apk.name, url: apk.browser_download_url, bytes: apk.size, sha256: listed },
    checksumUrl: sum.browser_download_url, metadataUrl: meta.browser_download_url,
    signatureUrl: sig?.browser_download_url ?? null, certificateUrl: pem?.browser_download_url ?? null,
  };
}
const remote = remoteOf();
const manifest = {
  $comment: "GENERATED by scripts/fetch-downloads.mjs from GitHub releases. Edit the release, not this file.",
  generatedAt: new Date().toISOString(),
  repo: `https://github.com/${REPO}`,
  current: cur,
  previous: prevRel ? entry(prevRel) : null,
  remote,
};
if (!cur.artifacts.length) { console.error("✗ the current release has no verifiable artifact"); process.exit(1); }
const before = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + "\n");
console.log(`wrote content/downloads.json: ${cur.tag} (${cur.artifacts.length} artifact), previous ${manifest.previous?.tag ?? "none"}, Rime Remote ${remote ? remote.versionName : "none"}${before ? "" : " (new)"}`);
