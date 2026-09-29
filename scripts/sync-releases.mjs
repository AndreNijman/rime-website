#!/usr/bin/env node
// ─── sync-releases.mjs ───────────────────────────────────────────────────────
// A release record for every Rime release that has none, so rimeos.com never
// lacks the page an updated machine is waiting to open (rime-shell's
// ReleaseService holds it PENDING until /updates/<id> answers 200).
//
// Where a release comes from, all of it public and nothing of it typed by hand:
//   · every successful build-image run on rime-os main (GitHub API) since the
//     newest record is a publish; its per-commit image `rime-os:daily-<sha>`
//     carries the release id, the Shell revision it vendored and the digest
//     (GHCR labels);
//   · the first run with an id is the release, a later run with the same id is
//     a reissue (the weekly cron rebuilding the same source);
//   · its changes are the pull requests merged into rime-os and rime-shell
//     between the previous release's revisions and this one's.
//
// A record that exists is never touched: a hand-written or hand-polished
// content/updates/<id>/release.yaml always wins. The deploy workflow keeps the
// ones this writes on the `release-records` branch, so each is made once. A pull request can give its
// own words for the page with a "## Release note" section in its body.
//
//   node scripts/sync-releases.mjs              write the missing records
//   node scripts/sync-releases.mjs --dry-run    print them instead
//   node scripts/sync-releases.mjs --check-live list releases rimeos.com lacks
//
// GITHUB_TOKEN (or GH_TOKEN), when set, only raises the API rate limit.
// ─────────────────────────────────────────────────────────────────────────────
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UPDATES = join(ROOT, "content/updates");
const OWNER = "AndreNijman";
const OS = "rime-os";
const SHELL = "rime-shell";
const IMAGE = "andrenijman/rime-os";
const SITE = "https://rimeos.com";
// The first image that says which release it is (/usr/share/rime/release.json,
// rime-os #72). Earlier releases have hand-written records.
const FIRST_STAMPED = "2026-09-29T00:00:00Z";
const RELEASE_ID = /^\d{4}\.\d{2}\.\d{2}(\.\d+)?$/;  // src/content.config.ts, less the apex-v ids
const CHANNELS = ["apex", "daily", "edge", "gaming-mesa", "gaming-nvidia", "platform-apex", "platform-daily",
  "platform-gaming-mesa", "platform-gaming-nvidia", "platform-rime", "rime"];

// ── turning a pull request into a line on the page ───────────────────────────
const KIND = { feat: "new", fix: "fixed", perf: "improved", refactor: "improved", security: "security", revert: "removed" };
// Changes nobody running Rime would notice.
const QUIET = new Set(["docs", "chore", "ci", "test", "tests", "build", "style"]);

export function parseTitle(title) {
  const m = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/.exec(title.trim());
  if (!m) return { type: null, scope: "", breaking: false, text: title.trim() };
  return { type: m[1].toLowerCase(), scope: (m[2] || "").toLowerCase(), breaking: !!m[3], text: m[4].trim() };
}

function sentenceCase(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

export function plainText(md) {
  return md
    .replace(/<!--[\s\S]*?-->/g, " ")  // the pull request template's guidance
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|\*|_)(\S[^*_]*?)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

function clip(s, max = 320) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

// The words for the page come ONLY from a "## Release note" section the
// author wrote for it. A pull request's body is written for its reviewer —
// it quotes people, names machines, walks through a diagnosis — and the first
// run of this script, taking the body's first paragraph instead, put a quote
// of Andre's request on the draft of a public release page.
export function summaryFrom(body) {
  if (!body) return null;
  const note = /^#{1,6}[ \t]*release notes?[ \t]*$([\s\S]*?)(?=^#{1,6}\s|(?![\s\S]))/im.exec(body.replace(/\r\n/g, "\n"));
  const text = note ? plainText(note[1]) : "";
  return text ? clip(text) : null;
}

function areaOf(repo, scope, text) {
  if (repo === SHELL) return "shell";
  const s = `${scope} ${text}`.toLowerCase();
  if (/\b(agents?|agentd|remote|relay|codex|claude)\b/.test(s)) return "agents";
  if (/\b(gaming|steam|gamescope|scx|proton)\b/.test(s)) return "gaming";
  if (/\b(security|trust|signature|signing|firewall|keyring|luks|secret|cve)\b/.test(s)) return "security";
  return "system";
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48).replace(/-+$/, "") || "change";
}

// null for a change the page should not list.
export function changeFrom(repo, pr) {
  if ((pr.labels || []).some((l) => /^(skip-release-notes?|no-release-notes?)$/i.test(l.name || l))) return null;
  const t = parseTitle(pr.title);
  if (t.type && QUIET.has(t.type)) return null;
  const note = summaryFrom(pr.body);
  if (note && /^(none|n\/a|-)\.?$/i.test(note)) return null;  // "## Release note: none" keeps it off the page
  const title = sentenceCase(t.text);
  const summary = note || `From ${repo} pull request #${pr.number}.`;
  return {
    id: slug(t.text),
    area: areaOf(repo, t.scope, t.text),
    kind: (t.type && KIND[t.type]) || "improved",
    title,
    summary,
    source: [pr.html_url],
    breaking: t.breaking,
  };
}

const AREA_WORDS = { shell: "Rime Shell", system: "the system", security: "security", gaming: "gaming",
  agents: "agents", developer: "developer tools" };
const andList = (xs) => xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

export function recordFor(rel, changes) {
  const seen = new Map();
  for (const c of changes) {
    const n = (seen.get(c.id) || 0) + 1;
    seen.set(c.id, n);
    if (n > 1) c.id = `${c.id}-${n}`;
  }
  const lead = changes.find((c) => c.kind === "new") || changes.find((c) => c.kind === "fixed") || changes[0];
  return {
    schema: 1,
    id: rel.id,
    product: "rime",
    name: `Rime ${rel.id}`,
    title: lead ? lead.title : "A rebuild with nothing new in Rime itself",
    date: rel.date,
    channels: CHANNELS,
    summary: changes.length === 0 ? "This release rebuilds the image from the same Rime code with newer packages underneath."
      : changes.length === 1 ? changes[0].summary
      : `${changes.length} changes, to ${andList([...new Set(changes.map((c) => AREA_WORDS[c.area]))])}.`,
    predecessor: rel.predecessor,
    provenance: {
      osRevision: rel.osRevision,
      shellRevision: rel.shellRevision,
      imageDigest: rel.digest,
      build: rel.build,
      iso: null,
      reissues: rel.reissues,
    },
    highlights: changes.slice(0, 3).map((c) => c.id),
    changes,
    knownIssues: [],
    rollback: null,
  };
}

// ── the sources ──────────────────────────────────────────────────────────────
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";

async function fetchRetry(url, init = {}) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, init);
      if (r.status < 500) return r;
      last = new Error(`${url}: HTTP ${r.status}`);
    } catch (e) { last = e; }
    await new Promise((ok) => setTimeout(ok, 1000 * (i + 1)));
  }
  throw last;
}

async function github(path) {
  const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  const url = `https://api.github.com/${path}`;
  let r = await fetchRetry(url, TOKEN ? { headers: { ...headers, Authorization: `Bearer ${TOKEN}` } } : { headers });
  // A workflow's token is scoped to its own repository; everything read here
  // is public, so a refusal is retried without it (at the anonymous rate).
  if (TOKEN && (r.status === 401 || r.status === 403)) r = await fetchRetry(url, { headers });
  if (!r.ok) throw new Error(`GitHub ${path}: HTTP ${r.status}`);
  return r.json();
}

let registryToken;
const MANIFEST_TYPES = [
  "application/vnd.oci.image.manifest.v1+json", "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json", "application/vnd.docker.distribution.manifest.list.v2+json",
].join(", ");

// { digest, labels } of ghcr.io/<IMAGE>:<tag>, or null when there is no such tag.
export async function imageLabels(tag) {
  if (!registryToken) {
    const r = await fetchRetry(`https://ghcr.io/token?scope=repository:${IMAGE}:pull`);
    registryToken = (await r.json()).token;
  }
  const headers = { Authorization: `Bearer ${registryToken}`, Accept: MANIFEST_TYPES };
  let r = await fetchRetry(`https://ghcr.io/v2/${IMAGE}/manifests/${tag}`, { headers });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GHCR ${tag}: HTTP ${r.status}`);
  let digest = r.headers.get("docker-content-digest");
  let m = await r.json();
  if (m.manifests) {  // an index: the amd64 image is the one machines run
    const pick = m.manifests.find((x) => x.platform?.architecture === "amd64") || m.manifests[0];
    r = await fetchRetry(`https://ghcr.io/v2/${IMAGE}/manifests/${pick.digest}`, { headers });
    digest = pick.digest;
    m = await r.json();
  }
  const c = await fetchRetry(`https://ghcr.io/v2/${IMAGE}/blobs/${m.config.digest}`, { headers });
  const config = await c.json();
  return { digest, labels: config.config?.Labels || {} };
}

// The records this checkout already has: id, date and revisions.
export function knownRecords(dir = UPDATES) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const id of readdirSync(dir)) {
    const file = join(dir, id, "release.yaml");
    if (!existsSync(file)) continue;
    const r = YAML.parse(readFileSync(file, "utf8"));
    out.push({ id: r.id, date: new Date(r.date).toISOString(), osRevision: r.provenance?.osRevision,
      shellRevision: r.provenance?.shellRevision ?? null });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Releases published after the newest record, oldest first, each with its
// predecessor. Only runs from two days before that record on are looked at,
// so a check every 15 minutes costs a few requests, not one per release ever.
export async function newReleases(known) {
  const newest = known[known.length - 1];
  const since = newest ? new Date(Date.parse(newest.date) - 2 * 86400e3).toISOString() : FIRST_STAMPED;
  const runs = [];
  for (let page = 1; page <= 5; page++) {
    const res = await github(`repos/${OWNER}/${OS}/actions/workflows/build-image.yml/runs?branch=main&status=success&per_page=100&page=${page}&created=%3E%3D${since.slice(0, 10)}`);
    runs.push(...res.workflow_runs);
    if (res.workflow_runs.length < 100) break;
  }
  runs.sort((a, b) => a.created_at.localeCompare(b.created_at));
  const knownIds = new Set(known.map((k) => k.id));
  const releases = [];
  const byId = new Map();
  for (const run of runs) {
    const img = await imageLabels(`daily-${run.head_sha}`);
    const id = img?.labels["org.rimeos.release.id"];
    if (!id || id === "dev" || knownIds.has(id)) continue;  // unpublished, pre-id, or already on the site
    // It becomes a directory name and a word in the deploy workflow's shell:
    // only the site's own id shape gets that far.
    if (!RELEASE_ID.test(id)) throw new Error(`build ${run.html_url} published a release id the site cannot use: ${JSON.stringify(id)}`);
    const at = { digest: img.digest, build: run.html_url, date: run.updated_at };
    if (byId.has(id)) {  // the same id built again: a reissue
      const rel = byId.get(id);
      if (rel.digest !== at.digest) rel.reissues.push({ ...at, note: "Rebuilt from the same Rime source." });
      continue;
    }
    const rel = {
      id, ...at,
      osRevision: img.labels["org.opencontainers.image.revision"] || run.head_sha,
      shellRevision: img.labels["org.rimeos.rime-shell.ref"] || null,
      reissues: [],
    };
    byId.set(id, rel);
    releases.push(rel);
  }
  let prev = newest || null;
  for (const r of releases) { r.prev = prev; r.predecessor = prev ? prev.id : null; prev = r; }
  return releases;
}

async function mergedPulls(repo, base, head) {
  if (!base || !head || base === head) return [];
  const numbers = [];
  for (let page = 1; page <= 3; page++) {
    const cmp = await github(`repos/${OWNER}/${repo}/compare/${base}...${head}?per_page=100&page=${page}`);
    for (const c of cmp.commits) {
      const first = c.commit.message.split("\n")[0];
      const m = /^Merge pull request #(\d+) /.exec(first) || /\(#(\d+)\)$/.exec(first);
      if (m && !numbers.includes(Number(m[1]))) numbers.push(Number(m[1]));
    }
    if (cmp.commits.length < 100) break;
  }
  const pulls = [];
  for (const n of numbers) pulls.push(await github(`repos/${OWNER}/${repo}/pulls/${n}`));
  return pulls.filter((p) => p.merged_at);
}

export async function changesFor(rel) {
  const prev = rel.prev;
  if (!prev) return [];
  const out = [];
  for (const pr of await mergedPulls(OS, prev.osRevision, rel.osRevision)) {
    const c = changeFrom(OS, pr);
    if (c) out.push(c);
  }
  for (const pr of await mergedPulls(SHELL, prev.shellRevision, rel.shellRevision)) {
    const c = changeFrom(SHELL, pr);
    if (c) out.push(c);
  }
  return out;
}

const HEADER = (rel) => `# Written by scripts/sync-releases.mjs from the published image and the pull
# requests merged since ${rel.predecessor ?? "the previous release"}. Edit freely: the script never
# touches a record that exists.
`;

async function main() {
  const args = process.argv.slice(2);
  const known = knownRecords();
  const fresh = await newReleases(known);
  if (args.includes("--check-live")) {
    // The newest few records and anything newer: every deploy carries all of
    // them, so a gap further back cannot open on its own.
    const ids = [...known.slice(-3).map((k) => k.id), ...fresh.map((r) => r.id)];
    const missing = [];
    for (const id of ids) {
      const res = await fetchRetry(`${SITE}/updates/${id}.json`, { redirect: "manual" });
      if (res.status !== 200) missing.push(id);
    }
    console.log(missing.length ? `not on ${SITE}: ${missing.join(" ")}` : `every published release is on ${SITE} (${ids.join(" ")})`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `missing=${missing.join(" ")}\n`);
    return;
  }
  const written = [];
  for (const rel of fresh) {
    const record = recordFor(rel, await changesFor(rel));
    const text = HEADER(rel) + YAML.stringify(record, { lineWidth: 0, defaultStringType: "QUOTE_DOUBLE", defaultKeyType: "PLAIN" });
    if (args.includes("--dry-run")) { console.log(text); continue; }
    mkdirSync(join(UPDATES, rel.id), { recursive: true });
    writeFileSync(join(UPDATES, rel.id, "release.yaml"), text);
    written.push(rel.id);
  }
  if (args.includes("--dry-run")) return;
  console.log(written.length ? `wrote ${written.join(" ")}` : `no release newer than ${known.at(-1)?.id ?? "none"} is missing a record`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `written=${written.join(" ")}\n`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(`sync-releases: ${e.message}`); process.exit(1); });
}
