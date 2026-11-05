// scripts/sync-releases.mjs: how a merged pull request becomes a line on a
// public release page, without the network (the sources are read in CI).
import { test, expect, vi, afterEach } from "vitest";
import { parseTitle, summaryFrom, changeFrom, recordFor, latestRunPerCommit, publishingRun, branchType,
  imageLabels, nixReleases, mergeReleases, compareIds } from "../../scripts/sync-releases.mjs";

const pr = (title: string, body = "", extra: Record<string, unknown> = {}) =>
  ({ number: 7, title, body, html_url: "https://github.com/AndreNijman/rime-os/pull/7", labels: [], ...extra });

test("a conventional title splits into type, scope and text", () => {
  expect(parseTitle("fix(agentd): pasting an image did nothing")).toEqual(
    { type: "fix", scope: "agentd", breaking: false, text: "pasting an image did nothing" });
  expect(parseTitle("feat!: a new layout").breaking).toBe(true);
  expect(parseTitle("Rime installer ISO: built in CI")).toMatchObject({ type: null });
  // A one-word prefix written for users is part of the title, not a type.
  expect(parseTitle("Shell: the dock keeps its icons")).toEqual(
    { type: null, scope: "", breaking: false, text: "Shell: the dock keeps its icons" });
});

test("a user-facing prefix does not override the branch's type", () => {
  const c = changeFrom("rime-shell", pr("Shell: the dock keeps its icons", "", { branch: "fix/dock-icons" }));
  expect(c?.kind).toBe("fixed");
  expect(c?.title).toBe("Shell: the dock keeps its icons");
});

test("a summary comes only from a Release note section, never from the rest of the body", () => {
  // The body the first draft of this script quoted on a public page.
  const reviewerBody = '## Why\n\nAndre: *"fix it on all machines"*.\n\n#74 installed gnome-keyring-pam on the L16.';
  expect(summaryFrom(reviewerBody)).toBeNull();
  expect(summaryFrom("## Why\n\nstuff\n\n## Release note\n\nLogging in **unlocks** your `keyring`.\n\n## Verified\n\nx"))
    .toBe("Logging in unlocks your keyring.");
  expect(summaryFrom("## Release notes\nText at the end")).toBe("Text at the end");
  expect(summaryFrom("## Release note\n\n")).toBeNull();
  // The template's guidance comment is never page copy, filled in or not.
  expect(summaryFrom("## Release note\n\n<!-- What someone using Rime notices. -->\n")).toBeNull();
  expect(summaryFrom("## Release note\n\n<!-- guidance -->\nAlt+Tab works again.")).toBe("Alt+Tab works again.");
  expect(summaryFrom(null)).toBeNull();
});

test("changes nobody running Rime would notice are left off the page", () => {
  for (const t of ["docs: x", "chore(deps): y", "ci: z", "test: w", "build: v", "style: u"])
    expect(changeFrom("rime-os", pr(t))).toBeNull();
  expect(changeFrom("rime-os", pr("fix: a", "", { labels: [{ name: "skip-release-notes" }] }))).toBeNull();
  expect(changeFrom("rime-os", pr("fix: a", "## Release note\n\nnone\n"))).toBeNull();
  expect(changeFrom("rime-os", pr("fix: a", "## Release note\n\nN/A."))).toBeNull();
});

test("kind and area follow the title and the repository", () => {
  expect(changeFrom("rime-os", pr("feat(gaming): a thing"))).toMatchObject({ kind: "new", area: "gaming" });
  expect(changeFrom("rime-os", pr("fix(agentd): paste"))).toMatchObject({ kind: "fixed", area: "agents" });
  expect(changeFrom("rime-os", pr("fix(login): the keyring"))).toMatchObject({ area: "security" });
  expect(changeFrom("rime-shell", pr("perf: faster dots"))).toMatchObject({ kind: "improved", area: "shell" });
  expect(changeFrom("rime-os", pr("Something without a type"))).toMatchObject({ kind: "improved", area: "system" });
});

test("a change with no release note says where it came from instead of repeating its title", () => {
  const c = changeFrom("rime-shell", pr("fix: the dots came back"))!;
  expect(c.title).toBe("The dots came back");
  expect(c.summary).toBe("From rime-shell pull request #7.");
  expect(c.source).toEqual(["https://github.com/AndreNijman/rime-os/pull/7"]);
  expect(c.id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
});

const rel = {
  id: "2026.10.01", date: "2026-10-01T00:00:00Z", predecessor: "2026.09.29.3",
  osRevision: "a".repeat(40), shellRevision: "b".repeat(40), digest: "sha256:" + "c".repeat(64),
  build: "https://github.com/AndreNijman/rime-os/actions/runs/1", reissues: [],
};

test("a record has the site's shape, unique change ids and highlights that exist", () => {
  const changes = [changeFrom("rime-os", pr("fix: same")), changeFrom("rime-shell", pr("fix: same")),
    changeFrom("rime-os", pr("feat: new thing"))];
  const r = recordFor(rel, changes);
  expect(r).toMatchObject({ schema: 1, id: "2026.10.01", product: "rime", name: "Rime 2026.10.01", predecessor: "2026.09.29.3" });
  expect(r.title).toBe("New thing");  // a new feature leads
  expect(r.summary).toBe("3 changes, to the system and Rime Shell.");
  expect(new Set(r.changes.map((c: any) => c.id)).size).toBe(3);
  for (const h of r.highlights) expect(r.changes.some((c: any) => c.id === h)).toBe(true);
  expect(r.provenance).toMatchObject({ osRevision: rel.osRevision, imageDigest: rel.digest, iso: null, reissues: [] });
});

test("a release with nothing user-facing still gets a page, marked as maintenance", () => {
  const r = recordFor(rel, []);
  expect(r.changes).toEqual([]);
  expect(r.highlights).toEqual([]);
  expect(r.maintenance).toBe(true);
  expect(r.title).toBe("Maintenance build");
  // Not "the same Rime code": a Dependabot merge changes the revision without changing anything you see.
  expect(r.summary).not.toMatch(/same Rime code/);
  expect(recordFor(rel, [changeFrom("rime-os", pr("fix: a"))]).maintenance).toBe(false);
});

test("a title written for users takes its kind from the branch", () => {
  expect(branchType("fix/gaming-mode-volume-overlay")).toBe("fix");
  expect(branchType("feat/live-update")).toBe("feat");
  expect(branchType("AndreNijman:feature/x")).toBe("feat");
  expect(branchType("dependabot/cargo/rustls")).toBe("build");
  expect(branchType("main")).toBeNull();
  expect(branchType(undefined)).toBeNull();
  const title = "Gaming Mode: the volume keys work";
  expect(changeFrom("rime-os", pr(title, "", { branch: "fix/volume" }))).toMatchObject({ kind: "fixed" });
  expect(changeFrom("rime-os", pr(title, "", { head: { ref: "feat/volume" } }))).toMatchObject({ kind: "new" });
  expect(changeFrom("rime-os", pr(title, "", { branch: "perf/volume" }))).toMatchObject({ kind: "improved" });
  expect(changeFrom("rime-os", pr(title, "", { branch: "update/kernel" }))).toMatchObject({ kind: "improved" });
  // A conventional title still wins over the branch.
  expect(changeFrom("rime-os", pr("feat: volume", "", { branch: "fix/volume" }))).toMatchObject({ kind: "new" });
});

test("a quiet branch stays off the page unless its author wrote a release note", () => {
  expect(changeFrom("rime-os", pr("Bump rustls", "", { branch: "dependabot/cargo/rustls" }))).toBeNull();
  expect(changeFrom("rime-os", pr("Relay dependency", "", { branch: "chore/relay-sharp" }))).toBeNull();
  const kept = changeFrom("rime-os", pr("Faster CI images", "## Release note\n\nUpdates download faster.", { branch: "ci/cache" }));
  expect(kept).toMatchObject({ summary: "Updates download faster.", kind: "improved" });
});

test("a rebuild of the same commit is dated by the rebuild, not the first build", () => {
  const run = (id: number, sha: string, at: string) => ({ id, head_sha: sha, created_at: at, updated_at: at });
  const runs = [
    run(3, "d4fbe14", "2026-10-08T11:51:36Z"),   // dispatched rebuild: newer Rime Shell
    run(1, "aaaaaaa", "2026-10-08T10:00:00Z"),
    run(2, "d4fbe14", "2026-10-08T11:27:29Z"),   // the push build of the same commit
  ];
  expect(latestRunPerCommit(runs).map((r) => r.id)).toEqual([1, 3]);
});

test("the build that asks for its page is still running, and counts", () => {
  expect(publishingRun({ status: "in_progress", conclusion: null })).toBe(true);
  expect(publishingRun({ status: "completed", conclusion: "success" })).toBe(true);
  expect(publishingRun({ status: "completed", conclusion: "failure" })).toBe(false);
  expect(publishingRun({ status: "completed", conclusion: "cancelled" })).toBe(false);
});

// ── the NixOS edition, against a fake registry ───────────────────────────────
const sha = (c: string) => "sha256:" + c.repeat(64);
const OS_REV = "a".repeat(40), SHELL_REV = "b".repeat(40);
const RELEASE_TYPE = "application/vnd.rimeos.nix-release.v1+json";
const CHANNELS_TYPE = "application/vnd.rimeos.nix-channels.v1+json";

// Answers ghcr.io for the given manifests and blobs (keyed by tag or digest);
// anything else is a 404, so a request the code should not make fails the test.
function fakeRegistry(objects: Record<string, { body: unknown; digest?: string }>) {
  const asked: string[] = [];
  const fetch = vi.fn(async (url: string) => {
    if (url.startsWith("https://ghcr.io/token")) return Response.json({ token: "t" });
    const m = /^https:\/\/ghcr\.io\/v2\/andrenijman\/rime-os\/(?:manifests|blobs)\/(.+)$/.exec(url);
    if (m) asked.push(m[1]);
    const o = m && objects[m[1]];
    if (!o) return new Response("", { status: 404 });
    return Response.json(o.body, { headers: o.digest ? { "docker-content-digest": o.digest } : {} });
  });
  vi.stubGlobal("fetch", fetch);
  return asked;
}
afterEach(() => vi.unstubAllGlobals());

// rime-os nix/release/rime_nix_release.py pack(): config `{}`, one layer, identity in annotations.
const artifact = (media: string, layer: string, annotations: Record<string, string>) => ({
  schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json", artifactType: media,
  config: { mediaType: "application/vnd.oci.image.config.v1+json", digest: sha("e"), size: 2 },
  layers: [{ mediaType: media, digest: layer, size: 1 }], annotations,
});
const nixAnnotations = (id: string) => ({ "org.rimeos.release.id": id, "org.opencontainers.image.revision": OS_REV,
  "org.rimeos.rime-shell.ref": SHELL_REV, "org.rimeos.product": "nixos" });

test("a NixOS release manifest's labels are its annotations, its config being {}", async () => {
  fakeRegistry({
    [`nix-${OS_REV}-${SHELL_REV}`]: { body: artifact(RELEASE_TYPE, sha("4"), nixAnnotations("2026.11.05")), digest: sha("2") },
    [sha("e")]: { body: {} },
  });
  expect(await imageLabels(`nix-${OS_REV}-${SHELL_REV}`)).toEqual({ digest: sha("2"), labels: nixAnnotations("2026.11.05") });
});

test("a bootc image's labels still come from its config", async () => {
  fakeRegistry({
    "daily-abc": { body: { config: { mediaType: "application/vnd.oci.image.config.v1+json", digest: sha("c") },
      layers: [], annotations: { "org.rimeos.release.id": "wrong" } }, digest: sha("9") },
    [sha("c")]: { body: { config: { Labels: { "org.rimeos.release.id": "2026.11.05" } } } },
  });
  expect(await imageLabels("daily-abc")).toEqual({ digest: sha("9"), labels: { "org.rimeos.release.id": "2026.11.05" } });
  expect(await imageLabels("daily-missing")).toBeNull();
});

const known = [{ id: "2026.11.04", date: "2026-11-04T02:00:00.000Z", osRevision: "f".repeat(40), shellRevision: null }];
const channelDoc = (entries: unknown[]) => ({
  "nix-channels": { body: artifact(CHANNELS_TYPE, sha("1"), { "org.rimeos.product": "nixos" }), digest: sha("d") },
  [sha("1")]: { body: { schema: 1, serial: 3, issued: 1794000000, expires: 1795000000, repository: "x", channels: entries } },
});

test("a NixOS release is found through the channel document, dated by its manifest", async () => {
  const asked = fakeRegistry({
    ...channelDoc([
      { channel: "edge", digest: sha("2"), release: "2026.11.05", percent: 100, halt: false },
      { channel: "beta", digest: sha("2"), percent: 100, halt: false },
      { channel: "stable", digest: sha("3"), release: "2026.11.01", percent: 100, halt: false },
    ]),
    [sha("2")]: { body: artifact(RELEASE_TYPE, sha("4"), nixAnnotations("2026.11.05")) },
    [sha("4")]: { body: { schema: 1, kind: "rime-nixos-release", release: "2026.11.05", issued: 1793847600,
      source: { rime_os: OS_REV, rime_shell: SHELL_REV } } },
    [sha("3")]: { body: artifact(RELEASE_TYPE, sha("5"), nixAnnotations("2026.11.01")) },
  });
  expect(await nixReleases(known)).toEqual([{
    id: "2026.11.05", digest: null, nixManifest: sha("2"), build: null, date: "2026-11-05T03:00:00Z",
    osRevision: OS_REV, shellRevision: SHELL_REV, reissues: [], editions: ["nixos"], channels: ["beta", "edge"],
  }]);
  // The older release on stable is not new: its (closure-sized) payload is never fetched.
  expect(asked).not.toContain(sha("5"));
});

test("no channel document yet means no NixOS release", async () => {
  fakeRegistry({});
  expect(await nixReleases(known)).toEqual([]);
});

test("a NixOS release id the site cannot use is refused", async () => {
  fakeRegistry({
    ...channelDoc([{ channel: "edge", digest: sha("2"), percent: 100, halt: false }]),
    [sha("2")]: { body: artifact(RELEASE_TYPE, sha("4"), nixAnnotations("2026.11.05; rm -rf ~")) },
  });
  await expect(nixReleases(known)).rejects.toThrow(/release id the site cannot use/);
});

test("a channel entry and its manifest must agree on the release", async () => {
  fakeRegistry({
    ...channelDoc([{ channel: "edge", digest: sha("2"), release: "2026.11.06", percent: 100, halt: false }]),
    [sha("2")]: { body: artifact(RELEASE_TYPE, sha("4"), nixAnnotations("2026.11.05")) },
  });
  await expect(nixReleases(known)).rejects.toThrow(/calls .* 2026\.11\.06/);
});

test("both editions merge into one chain; an id from both is one release", () => {
  const bootc = [
    { id: "2026.11.05.2", date: "2026-11-05T09:00:00Z", digest: sha("7"), build: "https://github.com/AndreNijman/rime-os/actions/runs/2",
      osRevision: OS_REV, shellRevision: SHELL_REV, reissues: [], editions: ["bootc"] },
    { id: "2026.11.05", date: "2026-11-05T03:10:00Z", digest: sha("6"), build: "https://github.com/AndreNijman/rime-os/actions/runs/1",
      osRevision: OS_REV, shellRevision: SHELL_REV, reissues: [], editions: ["bootc"] },
  ];
  const nix = [
    { id: "2026.11.05", date: "2026-11-05T03:00:00Z", digest: null, nixManifest: sha("2"), build: null,
      osRevision: OS_REV, shellRevision: SHELL_REV, reissues: [], editions: ["nixos"], channels: ["edge"] },
    { id: "2026.11.05.3", date: "2026-11-05T11:00:00Z", digest: null, nixManifest: sha("8"), build: null,
      osRevision: OS_REV, shellRevision: SHELL_REV, reissues: [], editions: ["nixos"], channels: ["edge"] },
  ];
  const out = mergeReleases(known[0], bootc, nix);
  expect(out.map((r: any) => [r.id, r.predecessor])).toEqual([
    ["2026.11.05", "2026.11.04"], ["2026.11.05.2", "2026.11.05"], ["2026.11.05.3", "2026.11.05.2"]]);
  expect(out[0]).toMatchObject({ editions: ["bootc", "nixos"], digest: sha("6"), nixManifest: sha("2"),
    build: "https://github.com/AndreNijman/rime-os/actions/runs/1", date: "2026-11-05T03:00:00Z" });
  // A release both published keeps the image tags; one only NixOS published lists its channels.
  expect(recordFor(out[0], []).channels).toContain("rime");
  const nixOnly = recordFor(out[2], []);
  expect(nixOnly).toMatchObject({ channels: ["edge"], editions: ["nixos"], predecessor: "2026.11.05.2" });
  expect(nixOnly.provenance).toMatchObject({ imageDigest: null, nixManifest: sha("8"), build: null, osRevision: OS_REV });
  expect(recordFor(rel, []).editions).toEqual(["bootc"]);
  expect(recordFor(rel, []).provenance).not.toHaveProperty("nixManifest");
});

test("release ids order by date, then by number within a day", () => {
  expect(compareIds("2026.11.05", "2026.11.05.2")).toBe(-1);
  expect(compareIds("2026.11.05.10", "2026.11.05.9")).toBe(1);
  expect(compareIds("2026.11.05", "2026.11.05")).toBe(0);
  expect(compareIds("apex-v2.1.0", "2026.09.28")).toBe(-1);
});
