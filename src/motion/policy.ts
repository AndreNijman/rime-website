// ─── Motion policy ───────────────────────────────────────────────────────────
// The web half of rime-shell's theme/Motion.qml: which setting scales what, and
// what Reduce Motion removes. The numbers are the Shell's (vendored motion.js).
//
//   full      every spatial motion runs, at the Shell's Balanced speed
//   reduced   spatial motion snaps (springs respond in 0 s); effects stay but
//             are capped at REDUCED_EFFECT_CAP (160 ms); decorative loops stop
//   off       nothing animates at all — "motion disabled" in the §19.1 matrix
//
// The visitor's system setting (prefers-reduced-motion) picks the default; the
// in-page toggle (spec §14.3) overrides it for this browser. The document
// carries the result as <html data-motion="…"> so CSS can follow it too.
// ─────────────────────────────────────────────────────────────────────────────
import * as M from "../vendor/rime-shell/motion.mjs";

export type MotionMode = "full" | "reduced" | "off";
const KEY = "rime.motion";
const listeners = new Set<(m: MotionMode) => void>();

function systemMode(): MotionMode {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduced" : "full";
}
function stored(): MotionMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "full" || v === "reduced" || v === "off" ? v : null;
  } catch { return null; }
}

let mode: MotionMode = typeof window === "undefined" ? "full" : (stored() ?? systemMode());

export function motionMode(): MotionMode { return mode; }
export function isReduced(): boolean { return mode !== "full"; }
export function hasOverride(): boolean { return stored() !== null; }

export function setMotionMode(next: MotionMode | null): void {
  try {
    if (next === null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, next);
  } catch { /* storage blocked: the choice lasts for this page only */ }
  mode = next ?? systemMode();
  document.documentElement.dataset.motion = mode;
  for (const f of listeners) f(mode);
}

export function onMotionChange(f: (m: MotionMode) => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

if (typeof window !== "undefined") {
  document.documentElement.dataset.motion = mode;
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => {
    if (stored() === null) setMotionMode(null);
  });
}

// ── The Shell's arithmetic at the current policy ────────────────────────────
// Balanced speed (1.0): the website offers no speed preset; that is a user's
// setting on their own desktop, not a visitor's.
const SCALE = M.speedScale("balanced", 1.0);

/** A spatial duration in ms: 0 under Reduce Motion or with motion off. */
export function spatial(ms: number): number { return mode === "off" ? 0 : M.spatial(ms, SCALE, mode === "reduced"); }
/** An effect duration in ms: capped under Reduce Motion, 0 with motion off. */
export function effect(ms: number): number { return mode === "off" ? 0 : M.effect(ms, SCALE, mode === "reduced"); }
/** A spring role {response s, damping}: response 0 (snap) unless motion is full. */
export function springRole(role: keyof typeof M.SPRINGS): { response: number; damping: number } {
  return M.spring(role, SCALE, mode !== "full");
}
/** Distance content travels as it fades (Motion.travel): 0 unless full. */
export function travel(px: number): number { return mode === "full" ? px : 0; }
/** Loops (spinners that carry information) run unless motion is off; ambient drift only when full. */
export function loopsAllowed(): boolean { return mode !== "off"; }
export function ambientAllowed(): boolean { return mode === "full"; }

export const BASE = M.BASE;
export const CURVES = M.CURVES;
export const ease = M.ease;
export const PRESS_SCALE = M.PRESS_SCALE;
export const REDUCED_EFFECT_CAP: number = M.REDUCED_EFFECT_CAP;
