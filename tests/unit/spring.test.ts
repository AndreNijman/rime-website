// The physics: closed form, so the frame rate cannot change where a spring is.
import { test, expect } from "vitest";
import { step } from "../../src/vendor/rime-shell/spring.mjs";

function run(hz: number, seconds: number, response = 0.478, damping = 0.8) {
  let x = 0, v = 0;
  const n = Math.round(seconds * hz);
  for (let i = 0; i < n; i++) [x, v] = step(x, v, 1, response, damping, 1 / hz);
  return x;
}
test("60, 120 and 144 Hz reach the same value at the same time", () => {
  for (const t of [0.25, 0.5, 1]) {   // whole numbers of frames at 60, 120, 144 and 1000 Hz
    const ref = run(1000, t);
    for (const hz of [60, 120, 144]) expect(Math.abs(run(hz, t) - ref)).toBeLessThan(1e-9);
  }
});
test("a retarget keeps velocity", () => {
  let x = 0, v = 0;
  for (let i = 0; i < 12; i++) [x, v] = step(x, v, 1, 0.5, 1, 1 / 60);
  const vBefore = v;
  const [, v2] = step(x, v, 0, 0.5, 1, 1 / 1000);
  expect(vBefore).toBeGreaterThan(0);
  expect(v2).toBeGreaterThan(0.9 * vBefore); // still moving the old way for an instant: no restart from rest
});
