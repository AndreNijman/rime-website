// The footer's Appearance and Motion choices (spec §14.3: an in-site Reduce
// Motion toggle). Stored in this browser only; "Auto"/"System" removes the
// override and follows the operating system again.
import { setMotionMode, hasOverride, motionMode, type MotionMode } from "../motion/policy";
import { syncSegmented } from "./segmented";

const KEY_SCHEME = "rime.scheme";
function store(k: string, v: string | null) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* blocked */ } }
function read(k: string) { try { return localStorage.getItem(k); } catch { return null; } }

export function currentScheme(): "dark" | "light" {
  const d = document.documentElement.dataset.scheme;
  if (d === "dark" || d === "light") return d;
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
const schemeListeners = new Set<(s: "dark" | "light") => void>();
export function onSchemeChange(f: (s: "dark" | "light") => void) { schemeListeners.add(f); return () => schemeListeners.delete(f); }
function emitScheme() { const s = currentScheme(); schemeListeners.forEach((f) => f(s)); }
matchMedia("(prefers-color-scheme: light)").addEventListener("change", emitScheme);

export function setScheme(v: "auto" | "dark" | "light") {
  const d = document.documentElement;
  if (v === "auto") { delete d.dataset.scheme; store(KEY_SCHEME, null); }
  else { d.dataset.scheme = v; store(KEY_SCHEME, v); }
  emitScheme();
}

export function initPrefs(): void {
  const root = document.querySelector<HTMLElement>("[data-prefs]");
  if (!root) return;
  const scheme = root.querySelector<HTMLElement>('[data-name="scheme"]')!;
  const motion = root.querySelector<HTMLElement>('[data-name="motion"]')!;
  const s = read(KEY_SCHEME);
  const sv = s === "dark" || s === "light" ? s : "auto";
  scheme.querySelector<HTMLInputElement>(`input[value="${sv}"]`)!.checked = true;
  const mv = hasOverride() ? motionMode() : "system";
  motion.querySelector<HTMLInputElement>(`input[value="${mv}"]`)!.checked = true;
  requestAnimationFrame(() => { syncSegmented(scheme); syncSegmented(motion); });
  scheme.addEventListener("change", (e) => setScheme((e.target as HTMLInputElement).value as "auto" | "dark" | "light"));
  motion.addEventListener("change", (e) => {
    const v = (e.target as HTMLInputElement).value;
    setMotionMode(v === "system" ? null : (v as MotionMode));
  });
}
