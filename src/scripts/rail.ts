// Choosing a wallpaper: the stage it drives retunes first (its Shell roles
// change on the `state` beat), then the site and its Light Field follow on
// the `settle` beat — the order spec §2.4 asks for, and the order the Shell
// itself runs: matugen writes the palette, the surfaces pick it up, the
// wallpaper's light is the last thing to land.
import { stageById, initStages } from "./stage";
import { BASE, effect, spatial } from "../motion/policy";
import { currentScheme, onSchemeChange } from "./prefs";

type SceneData = {
  id: string; name: string; kind: string; note: string;
  field: Record<"dark" | "light", string>;
  roles: Record<"dark" | "light", Record<string, string>>;
  img: { src: string; srcset: Record<string, string> };
};

const KEY = "rime.palette";
const store = (v: string) => { try { localStorage.setItem(KEY, v); } catch { /* blocked */ } };
const stored = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

let fieldTimer = 0;
/** Cross-fade the page's Light Field and switch the document palette. */
export function applySitePalette(id: string, field: Record<"dark" | "light", string> | null, animate = true) {
  const root = document.documentElement;
  if (root.dataset.palette === id) return;
  const base = document.querySelector<HTMLElement>(".page-field");
  const next = document.querySelector<HTMLElement>("[data-field-next]");
  const ms = animate ? effect(BASE.settle) : 0;
  if (!base || !next || !field || ms <= 0) { root.dataset.palette = id; return; }
  const old = getComputedStyle(base).backgroundImage;
  base.style.backgroundImage = old;                   // hold the old light underneath
  next.style.backgroundImage = `url("${field[currentScheme()]}")`;
  root.dataset.palette = id;
  next.getAnimations().forEach((a) => a.cancel());
  const a = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)", fill: "forwards" });
  clearTimeout(fieldTimer);
  a.onfinish = () => {
    base.style.backgroundImage = "";
    fieldTimer = window.setTimeout(() => { a.cancel(); next.style.backgroundImage = ""; }, 30);
  };
}

export function initRails(): void {
  initStages();
  document.querySelectorAll<HTMLElement>("[data-rail]").forEach((rail) => {
    if (rail.dataset.bound) return;
    rail.dataset.bound = "1";
    const scenes: SceneData[] = JSON.parse(rail.dataset.scenes ?? "[]");
    const byId = new Map(scenes.map((s) => [s.id, s]));
    const stage = stageById(rail.dataset.rail!);
    const nameEl = rail.querySelector<HTMLElement>("[data-role-scene]");
    const schemeEl = rail.querySelector<HTMLElement>("[data-role-scheme]");
    const hex = (id: string) => {
      const s = byId.get(id); if (!s) return;
      const sc = currentScheme();
      if (nameEl) nameEl.textContent = s.name;
      if (schemeEl) schemeEl.textContent = sc;
      rail.querySelectorAll<HTMLElement>("[data-hex]").forEach((el) => { el.textContent = s.roles[sc][el.dataset.hex!] ?? ""; });
    };
    let pending = 0;
    const choose = (id: string, animate: boolean) => {
      const s = byId.get(id); if (!s) return;
      stage?.setScene(id, s.img);
      hex(id);
      clearTimeout(pending);
      const delay = animate ? spatial(BASE.contentDelay) + effect(BASE.state) : 0;
      pending = window.setTimeout(() => applySitePalette(id, s.field, animate), delay);
    };
    rail.addEventListener("change", (e) => {
      const id = (e.target as HTMLInputElement).value;
      store(id);
      choose(id, true);
    });
    onSchemeChange(() => hex(rail.querySelector<HTMLInputElement>("input:checked")?.value ?? ""));
    const want = stored();
    if (want && byId.has(want)) {
      const input = rail.querySelector<HTMLInputElement>(`input[value="${want}"]`);
      if (input) input.checked = true;
      stage?.setScene(want, byId.get(want)!.img);
    }
    hex(rail.querySelector<HTMLInputElement>("input:checked")?.value ?? scenes[0].id);
  });
}
