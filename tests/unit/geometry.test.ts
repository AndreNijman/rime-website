// The families the site drives, swept through real recorded trajectories
// (open, close, reversals): every number finite, the body starting as the
// notch and ending as the finished surface, the clip inside the bounds.
import { test, expect } from "vitest";
import * as Geo from "../../src/vendor/rime-shell/geometry.mjs";
import { record } from "../../src/motion/record";

const bloomG = { cx: 720, strip: 6, notchW: 300, notchH: 40, shoulder: 15, notchBottom: 14, w: 900, h: 560, r: 24, shoulderW1: 28, shoulderH1: 22 };
const pourG = { winW: 1440, strip: 6, seam: 40, shoulder: 15, notchBottom: 14, notchW: 200, w: 495, h: 372, r: 17 };
const nums = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const traj = [record(), record({ closeAt: 120 }), record({ closeAt: 260 }), record({ hz: 60 }), record({ hz: 144, closeAt: 200 })];

test("CENTER_BLOOM starts as the notch and ends as the Dashboard", () => {
  const p0 = Geo.centerBloom(0, bloomG).params;
  expect(p0.W).toBe(300); expect(p0.D).toBe(40);
  const p1 = Geo.centerBloom(1, bloomG).params;
  expect(p1.W).toBe(900); expect(p1.D).toBe(560); expect(p1.rb).toBe(24);
});
test("CENTER_BLOOM stays finite and bounded along every trajectory", () => {
  for (const rec of traj) for (const s of rec) {
    const r = Geo.centerBloom(s.progress, { ...bloomG, ch: { w: s.lead, d: s.body, n: s.trail, fw: s.leadFlow, fd: s.bodyFlow } });
    for (const n of nums(r.path)) expect(Number.isFinite(n)).toBe(true);
    expect(r.params.W).toBeGreaterThanOrEqual(300 - 1e-6);
    expect(r.params.W).toBeLessThanOrEqual(900 + 4 + 1e-6);   // the soft-capped swell
    expect(r.params.D).toBeLessThanOrEqual(560 + 6 + 1e-6);
    const c = r.clip, b = r.bounds;
    expect(c.x).toBeGreaterThanOrEqual(b.x - 1e-6);
    expect(c.x + c.w).toBeLessThanOrEqual(b.x + b.w + 1e-6);
  }
});
test("RIGHT_POUR stays finite, anchored to the right edge, and lands on its panel", () => {
  for (const rec of traj) for (const s of rec) {
    const r = Geo.rightPour(s.progress, { ...pourG, ch: { d: s.lead, w: s.body, n: s.trail, fd: s.leadFlow, fw: s.bodyFlow } });
    for (const n of nums(r.path)) expect(Number.isFinite(n)).toBe(true);
    expect(r.bounds.x + r.bounds.w).toBeCloseTo(1440, 6);
  }
  const done = Geo.rightPour(1, { ...pourG, ch: { d: 1, w: 1, n: 1, fd: 0, fw: 0 } }).params;
  expect(done.X0).toBe(1440 - 495);
  expect(done.Dr).toBe(372);
});
test("the bar silhouette's centre notch is where the bloom starts", () => {
  const bar = Geo.barSilhouette({ w: 1440, strip: 6, h: 40, shoulder: 15, bottom: 14, leftW: 137, centerW: 300, rightW: 200, rightBottomL: 14 }).params;
  const bloom = Geo.centerBloom(0, bloomG).params;
  expect(bloom.L).toBe(bar.cS);
  expect(bloom.R).toBe(bar.cE);
});
