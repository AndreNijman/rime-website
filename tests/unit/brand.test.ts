// The Rime mark is the layered ridge, read from rime-os's own masters (vendored
// by scripts/sync-brand.mjs), and only its third plane ever takes a colour.
import { test, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { MARK } from "../../src/brand/mark";
import { markSvg, parsePlanes } from "../../src/brand/ridge.mjs";

const SRC = JSON.parse(readFileSync("src/brand/SOURCE.json", "utf8"));
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
const polys = (svg: string) => [...svg.matchAll(/<polygon\b[^>]*>/g)].map((m) => ({
  points: /\spoints="([^"]*)"/.exec(m[0])![1],
  fill: /\sfill="([^"]*)"/.exec(m[0])?.[1],
}));

test.each(Object.entries({ ...SRC.files, ...SRC.derived }))("%s matches src/brand/SOURCE.json", (path, rec: any) => {
  expect(sha(path)).toBe(rec.sha256);
});

test("the mark is four planes, bottom to peak, and plane 3 alone is the accent", () => {
  for (const planes of [MARK.planes, MARK.small, MARK.lockup.planes]) {
    expect(planes.map((p) => p.id)).toEqual(["plane-1", "plane-2", "plane-3", "plane-4"]);
  }
  expect(MARK.planes.map((p) => p.role)).toEqual(["base", "structure", "accent", "peak"]);
  expect(MARK.lockup.planes.map((p) => p.role ?? "ink")).toEqual(["ink", "ink", "accent", "ink"]);
  expect(MARK.lockup.planes.map((p) => p.points)).toEqual(MARK.planes.map((p) => p.points));
  expect(MARK.viewBox).toBe("0 0 240 175");
  expect(MARK.lockup.wordPaths).toHaveLength(4);  // r, i, m, e
  expect(MARK.accent.toUpperCase()).toBe("#91C2DC");
  expect(MARK.status).toBe("final");
});

test("markSvg colours plane 3 and nothing else with the accent", () => {
  const out = polys(markSvg({ planes: MARK.planes, lockup: MARK.lockup, ink: "INK", accent: "ACC" }));
  expect(out.map((p) => p.fill)).toEqual(["INK", "INK", "ACC", "INK"]);
  const word = markSvg({ planes: MARK.small, lockup: MARK.lockup, ink: "INK", accent: "ACC", wordmark: true });
  expect(word.match(/fill="ACC"/g)).toHaveLength(1);
  expect(word).toContain(`<g transform="${MARK.lockup.wordTransform}" fill="INK">`);
});

test("parsePlanes refuses a mark that is not four ordered planes", () => {
  expect(() => parsePlanes(`<svg viewBox="0 0 1 1"><polygon id="plane-1" points="0,0"/></svg>`)).toThrow(/4 planes/);
  const swapped = readFileSync("src/brand/ridge/rime-ridge-symbol.svg", "utf8").replace('id="plane-1"', 'id="plane-x"');
  expect(() => parsePlanes(swapped)).toThrow(/plane 1/);
});

test("the favicon is the small-size master with Rime Blue on plane 3 only", () => {
  const fav = polys(readFileSync("public/favicon.svg", "utf8"));
  expect(fav.map((p) => p.points)).toEqual(MARK.small.map((p) => p.points));
  expect(fav[2].fill?.toUpperCase()).toBe("#91C2DC");
  for (const i of [0, 1, 3]) expect(fav[i].fill?.toUpperCase()).not.toBe("#91C2DC");
});

test("no spark geometry is left anywhere in the site", () => {
  const SPARK = /M256 82 L292 264|L384 298 L292 332/;
  const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? (n === "media" ? [] : walk(p)) : /\.(astro|ts|mjs|js|svg|css)$/.test(n) ? [p] : [];
  });
  const hits = ["src", "scripts", "public"].flatMap(walk).filter((p) => SPARK.test(readFileSync(p, "utf8")));
  expect(hits).toEqual([]);
});

test("every file the brand page offers exists", () => {
  const page = readFileSync("src/pages/brand.astro", "utf8");
  const offered = [...page.matchAll(/\["(rime-[^"]+\.(?:svg|png))"/g)].map((m) => m[1]);
  expect(offered.length).toBeGreaterThanOrEqual(10);
  for (const f of offered) expect(existsSync(`public/brand/${f}`), f).toBe(true);
});
