// The published recordings (src/data/stage.json, scripts/build-stage.mjs):
// what the stages need to exist, exists, and was recorded from the Shell the
// site says it describes.
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import stage from "../../src/data/stage.json";
import { SITE } from "../../src/data/site";

type Clip = { from: string; to: string; box: number[]; duration: number; settle: number; av1: string; h264: string };
type Variant = { scene: string; scheme: string; reduced: boolean; rest?: unknown; restFrom?: string; clips: Record<string, Clip> };
const V = stage.variants as unknown as Record<string, Variant>;
const STATES = ["rest", "dashboard", "network", "notifications"];
const ALL = STATES.flatMap((a) => STATES.filter((b) => b !== a).map((b) => `${a}-${b}`));
const CORE = ["rest-dashboard", "dashboard-rest", "rest-network", "network-rest", "rest-notifications", "notifications-rest", "network-notifications", "notifications-network"];
const pub = (p: string) => join(__dirname, "../../public", p);

describe("recorded stage", () => {
  it("was recorded from the Shell revision the site pins", () => {
    expect(stage.shell.startsWith(SITE.pinned.shell)).toBe(true);
  });

  it("has every published scene, dark and light, with its stills and core transitions", () => {
    for (const scene of ["rime-default", "harbour-dusk", "deep-water", "fern", "ember", "chalk"])
      for (const scheme of ["dark", "light"]) {
        const v = V[`${scene}-${scheme}`];
        expect(v, `${scene}-${scheme}`).toBeTruthy();
        expect(v.rest, `${scene}-${scheme} rest still`).toBeTruthy();
        for (const c of CORE) expect(v.clips[c], `${scene}-${scheme} ${c}`).toBeTruthy();
      }
  });

  it("has every transition for the default scene, with full motion and with Reduce Motion", () => {
    for (const k of ["rime-default-dark", "rime-default-light", "rime-default-dark-reduced", "rime-default-light-reduced"])
      for (const c of ALL) expect(V[k]?.clips[c], `${k} ${c}`).toBeTruthy();
    expect(V["rime-default-dark-reduced"].restFrom).toBe("rime-default-dark");
  });

  it("keeps every clip inside the frame, settling within its length, with both codecs on disk", () => {
    const [W, H] = stage.size;
    for (const [k, v] of Object.entries(V))
      for (const [name, c] of Object.entries(v.clips)) {
        const [x, y, w, h] = c.box;
        expect(x >= 0 && y >= 0 && x + w <= W && y + h <= H, `${k}/${name} box`).toBe(true);
        expect(c.settle).toBeLessThanOrEqual(c.duration);
        expect(c.duration).toBeGreaterThan(0.1);   // a Reduce Motion close is a 160 ms fade
        expect(name).toBe(`${c.from}-${c.to}`);
        expect(existsSync(pub(c.av1)) && existsSync(pub(c.h264)), `${k}/${name} files`).toBe(true);
      }
  });
});
