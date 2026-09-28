// Every published palette: the Shell's roles, and the web's contrast floors.
import { test, expect } from "vitest";
import scenes from "../../src/data/scenes.json";
import * as Roles from "../../src/vendor/rime-shell/roles.mjs";
const rgb = (h: string) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });

test("the default scene is the Shell's fixture, byte for byte", () => {
  const d = scenes.scenes.find((s) => s.default)!;
  expect(d.dark.source).toEqual({ background: "#121315", active: "#b2c8ec", text: "#e3e2e5", subtext: "#c4c6ce", border: "#44474d", iconFont: "#061f3b" });
  expect(d.light.source).toEqual({ background: "#faf9fb", active: "#000613", text: "#1b1c1e", subtext: "#44474d", border: "#c4c6ce", iconFont: "#061f3b" });
});
test.each(scenes.scenes.flatMap((s) => (["dark", "light"] as const).map((m) => [s.id, m] as const)))("%s/%s clears every floor the site depends on", (id, m) => {
  const s = scenes.scenes.find((x) => x.id === id)![m];
  for (const c of s.checks) expect(c.ok, `${c.fg} on ${c.bg} = ${c.ratio}`).toBe(true);
  const R = s.roles as Record<string, string>;
  expect(Roles.contrast(rgb(R.textPrimary), rgb(R.surfaceBase))).toBeGreaterThanOrEqual(7);
  // the focus ring is drawn in textPrimary: visible on every surface
  for (const bg of ["surfaceBase", "surfaceRaised", "surfaceHigh", "surfaceSelected"]) expect(Roles.contrast(rgb(R.textPrimary), rgb(R[bg]))).toBeGreaterThanOrEqual(4.5);
  expect(s.field.worstTextContrast).toBeGreaterThanOrEqual(7);
});
