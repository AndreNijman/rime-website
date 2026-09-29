// scripts/sync-releases.mjs: how a merged pull request becomes a line on a
// public release page, without the network (the sources are read in CI).
import { test, expect } from "vitest";
import { parseTitle, summaryFrom, changeFrom, recordFor } from "../../scripts/sync-releases.mjs";

const pr = (title: string, body = "", extra: Record<string, unknown> = {}) =>
  ({ number: 7, title, body, html_url: "https://github.com/AndreNijman/rime-os/pull/7", labels: [], ...extra });

test("a conventional title splits into type, scope and text", () => {
  expect(parseTitle("fix(agentd): pasting an image did nothing")).toEqual(
    { type: "fix", scope: "agentd", breaking: false, text: "pasting an image did nothing" });
  expect(parseTitle("feat!: a new layout").breaking).toBe(true);
  expect(parseTitle("Rime installer ISO: built in CI")).toMatchObject({ type: null });
});

test("a summary comes only from a Release note section, never from the rest of the body", () => {
  // The body the first draft of this script quoted on a public page.
  const reviewerBody = '## Why\n\nAndre: *"fix it on all machines"*.\n\n#74 installed gnome-keyring-pam on the L16.';
  expect(summaryFrom(reviewerBody)).toBeNull();
  expect(summaryFrom("## Why\n\nstuff\n\n## Release note\n\nLogging in **unlocks** your `keyring`.\n\n## Verified\n\nx"))
    .toBe("Logging in unlocks your keyring.");
  expect(summaryFrom("## Release notes\nText at the end")).toBe("Text at the end");
  expect(summaryFrom("## Release note\n\n")).toBeNull();
  expect(summaryFrom(null)).toBeNull();
});

test("changes nobody running Rime would notice are left off the page", () => {
  for (const t of ["docs: x", "chore(deps): y", "ci: z", "test: w", "build: v", "style: u"])
    expect(changeFrom("rime-os", pr(t))).toBeNull();
  expect(changeFrom("rime-os", pr("fix: a", "", { labels: [{ name: "skip-release-notes" }] }))).toBeNull();
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

test("a release with nothing user-facing still gets a page that says so", () => {
  const r = recordFor(rel, []);
  expect(r.changes).toEqual([]);
  expect(r.highlights).toEqual([]);
  expect(r.summary).toMatch(/same Rime code/);
});
