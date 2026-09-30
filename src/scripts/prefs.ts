// The footer's Appearance and Motion choices (spec §14.3: an in-site Reduce
// Motion toggle). Stored in this browser only. Appearance is dark until the
// visitor chooses: "Light", or "Auto" to follow the operating system, is stored
// as rime.scheme. Motion's "System" removes its override and follows the
// operating system again.
import { setMotionMode, hasOverride, motionMode, type MotionMode } from "../motion/policy";
import { syncSegmented } from "./segmented";

const KEY_SCHEME = "rime.scheme";
function store(k: string, v: string | null) { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* blocked */ } }
function read(k: string) { try { return localStorage.getItem(k); } catch { return null; } }

export type SchemeChoice = "auto" | "dark" | "light";
const isChoice = (v: string | null | undefined): v is SchemeChoice => v === "auto" || v === "dark" || v === "light";

export function currentScheme(): "dark" | "light" {
  const d = document.documentElement.dataset.scheme;
  if (d === "dark" || d === "light") return d;
  if (d === "auto") return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  return "dark";
}
const schemeListeners = new Set<(s: "dark" | "light") => void>();
export function onSchemeChange(f: (s: "dark" | "light") => void) { schemeListeners.add(f); return () => schemeListeners.delete(f); }
// The browser's toolbar colour follows the page's scheme, not the system's.
function syncThemeColor() {
  const m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const c = m?.dataset[currentScheme()];
  if (m && c) m.content = c;
}
function emitScheme() { syncThemeColor(); const s = currentScheme(); schemeListeners.forEach((f) => f(s)); }
matchMedia("(prefers-color-scheme: light)").addEventListener("change", emitScheme);
syncThemeColor();

export function setScheme(v: SchemeChoice) {
  document.documentElement.dataset.scheme = v;
  store(KEY_SCHEME, v);
  emitScheme();
}

export function initPrefs(): void {
  const root = document.querySelector<HTMLElement>("[data-prefs]");
  if (!root) return;
  const scheme = root.querySelector<HTMLElement>('[data-name="scheme"]')!;
  const motion = root.querySelector<HTMLElement>('[data-name="motion"]')!;
  const s = read(KEY_SCHEME);
  const sv: SchemeChoice = isChoice(s) ? s : "dark";
  scheme.querySelector<HTMLInputElement>(`input[value="${sv}"]`)!.checked = true;
  const mv = hasOverride() ? motionMode() : "system";
  motion.querySelector<HTMLInputElement>(`input[value="${mv}"]`)!.checked = true;
  requestAnimationFrame(() => { syncSegmented(scheme); syncSegmented(motion); });
  scheme.addEventListener("change", (e) => setScheme((e.target as HTMLInputElement).value as SchemeChoice));
  motion.addEventListener("change", (e) => {
    const v = (e.target as HTMLInputElement).value;
    setMotionMode(v === "system" ? null : (v as MotionMode));
  });
}
