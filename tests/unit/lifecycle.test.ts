// SurfaceLifecycle port: the behaviours the Shell's own tests hold it to.
import { test, expect } from "vitest";
import { SurfaceLifecycle } from "../../src/motion/lifecycle";
import { record } from "../../src/motion/record";

function drive(life: SurfaceLifecycle, ms: number, hz = 240, t0 = { now: 1000 }) {
  for (let t = 0; t < ms; t += 1000 / hz) { t0.now += 1000 / hz; life.advanceForTest(1 / hz, t0.now); }
}
test("an open arrives, announces itself once, and a close releases the surface", () => {
  let opened = 0, closed = 0;
  const life = new SurfaceLifecycle({ liquid: true, manual: true, ignorePolicy: true, onOpened: () => opened++, onClosed: () => closed++ });
  const clock = { now: 1000 };
  life.setOpen(true);
  drive(life, 1200, 240, clock);
  expect(life.phase).toBe("Open");
  expect(opened).toBe(1);
  expect(life.content).toBeCloseTo(1, 3);
  life.setOpen(false);
  drive(life, 1200, 240, clock);
  expect(life.mapped).toBe(false);
  expect(closed).toBe(1);
});
test("the lead moves first and the body follows once it crosses openRelease", () => {
  const rec = record();
  const firstBody = rec.find((s) => s.body > 0.001)!;
  const leadThen = rec.find((s) => s.t === firstBody.t)!.lead;
  expect(leadThen).toBeGreaterThanOrEqual(0.12 - 0.02);
});
test("a reversal halfway bends back instead of restarting from rest", () => {
  const rec = record({ closeAt: 190 });
  const i = rec.findIndex((s) => s.t >= 190);
  // the body is still rising for a moment after the close: velocity carried over
  expect(rec[i + 1].body).toBeGreaterThanOrEqual(rec[i].body - 1e-6);
  const peak = Math.max(...rec.map((s) => s.progress));
  expect(peak).toBeLessThan(0.95);
  expect(rec[rec.length - 1].progress).toBe(0);
});
test("Reduce Motion snaps the shape and fades it instead", () => {
  const life = new SurfaceLifecycle({ liquid: true, manual: true, forceReduced: true });
  life.advanceForTest(0, 1984);   // start the recording's clock
  life.setOpen(true);
  life.advanceForTest(1 / 60, 2000);
  life.advanceForTest(1 / 60, 2016);
  expect(life.progress).toBe(1);
  expect(life.alpha).toBeLessThan(1); // fading in, not growing
});
test("recordings are finite and bounded", () => {
  for (const s of record({ hz: 60 })) for (const v of Object.values(s)) expect(Number.isFinite(v)).toBe(true);
});
