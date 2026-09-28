// Release records: one unbroken chain, highlights that exist, sources on every
// change, and the ?from= arithmetic.
import { test, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { parse } from "yaml";
import { crossedIds } from "../../src/scripts/release-from";
const all = readdirSync("content/updates").map((d) => parse(readFileSync(`content/updates/${d}/release.yaml`, "utf8")));

test("ids are unique and the directory names match", () => {
  const ids = all.map((r) => r.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const d of readdirSync("content/updates")) expect(all.some((r) => r.id === d)).toBe(true);
});
test("the predecessor chain is one line from the newest to the first", () => {
  const byId = new Map(all.map((r) => [r.id, r]));
  const roots = all.filter((r) => !r.predecessor);
  expect(roots.length).toBe(1);
  const newest = [...all].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
  let cur: any = newest, n = 0;
  while (cur) { n++; cur = cur.predecessor ? byId.get(cur.predecessor) : null; }
  expect(n).toBe(all.length);
});
test("highlights exist and every change cites a source", () => {
  for (const r of all) {
    for (const h of r.highlights ?? []) expect(r.changes.some((c: any) => c.id === h), `${r.id}: ${h}`).toBe(true);
    for (const c of r.changes) expect((c.source ?? []).length, `${r.id}: ${c.id}`).toBeGreaterThan(0);
  }
});
test("?from= lists what a machine crossed, and nothing for a rollback", () => {
  const idx = all.map((r) => ({ id: r.id, predecessor: r.predecessor }));
  expect(crossedIds(idx, "2026.09.27.3", "2026.09.28.4")).toEqual(["2026.09.28.4", "2026.09.28.3", "2026.09.28.2", "2026.09.28"]);
  expect(crossedIds(idx, "2026.09.28.4", "2026.09.28.3")).toBeNull();
  expect(crossedIds(idx, "2026.09.28.4", "2026.09.28.4")).toBeNull();
  expect(crossedIds(idx, "not-a-release", "2026.09.28.4")).toBeNull();
  expect(crossedIds(idx, "apex-v2.1.0", "2026.09.28.4")?.length).toBe(7);
});
