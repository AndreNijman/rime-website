#!/usr/bin/env node
// ─── launch-gates.mjs ────────────────────────────────────────────────────────
// What must be true before rimeos.com goes public (spec §21), checked against
// the world rather than the repository. Outside the build on purpose: these are
// facts about GitHub, the registry and the product, not about this code.
//
//   node scripts/launch-gates.mjs      exits non-zero while anything is open
// ─────────────────────────────────────────────────────────────────────────────
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const gh = (...a) => { try { return JSON.parse(execFileSync("gh", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })); } catch { return null; } };
const run = (cmd, args) => { try { execFileSync(cmd, args, { stdio: "ignore" }); return true; } catch { return false; } };
const gates = [];
const gate = (name, ok, fix) => gates.push({ name, ok: !!ok, fix });

for (const repo of ["AndreNijman/rime-os", "AndreNijman/rime-shell"]) {
  const pvr = gh("api", `repos/${repo}/private-vulnerability-reporting`);
  gate(`${repo}: private vulnerability reporting is on`, pvr?.enabled, `Settings → Security → Private vulnerability reporting. /security and security.txt point at it.`);
}
const osRepo = gh("api", "repos/AndreNijman/rime-os");
gate("rime-os has a LICENSE file", osRepo?.license, "Commit the MIT licence text the metadata already declares.");

const downloads = JSON.parse(readFileSync("content/downloads.json", "utf8"));
const iso = downloads.current.artifacts[0];
gate("the published installer carries the Rime name", /rime/i.test(iso.name) && !/apex/i.test(downloads.current.name),
  "Publish an ISO built from rime-os main: it records rime-os:rime and trusts the new signer, which removes the first-update known issue.");

const latest = gh("api", "repos/AndreNijman/rime-os/releases/latest");
gate("content/downloads.json matches the latest GitHub release", latest && latest.tag_name === downloads.current.tag, "npm run downloads");

const mark = readFileSync("src/brand/mark.ts", "utf8");
gate("the Rime mark is final", /status:\s*"final"/.test(mark), "Swap the path in src/brand/mark.ts and set status to \"final\".");

const walls = JSON.parse(readFileSync("content/wallpapers.json", "utf8")).wallpapers;
gate("every shipped wallpaper on the site has a recorded licence", walls.filter((w) => w.publish && w.kind === "shipped").every((w) => !/unknown/i.test(w.licence)), "Clear the artwork, or keep it off the site.");

gate("vendored Shell files match rime-shell upstream", run("node", ["scripts/sync-shell.mjs", "--check-upstream"]), "npm run vendor:shell -- --ref <rev>, then review");
gate("committed palettes match a fresh matugen run", run("node", ["scripts/build-scenes.mjs", "--check"]), "npm run scenes");

const agentsOff = /agentsPublished:\s*false/.test(readFileSync("src/data/site.ts", "utf8"));
gate("/agents stays unpublished until Rime Remote ships (spec §6.4)", agentsOff, "Keep SITE.agentsPublished false until the Android app is released.");

let open = 0;
for (const g of gates) {
  console.log(`${g.ok ? "✓" : "✗"} ${g.name}${g.ok ? "" : `\n    → ${g.fix}`}`);
  if (!g.ok) open++;
}
console.log(open ? `\n${open} launch gate(s) open.` : "\nAll launch gates pass.");
process.exit(open ? 1 : 0);
