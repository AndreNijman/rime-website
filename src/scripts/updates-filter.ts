// Release filters with STACK_REFLOW (spec §3.4, §8.5): leaving cards fade out
// first (fadeOut), then the rest close up as objects on the notification beat
// (NotificationList.qml: `displaced` over notificationShift on `standard`), and
// arriving cards fade in. Under Reduce Motion nothing travels.
import { BASE, effect, spatial } from "../motion/policy";

export function initFilters(): void {
  const found = document.querySelector<HTMLFormElement>("[data-filters]");
  if (!found) return;
  const form: HTMLFormElement = found;
  const lists = [...document.querySelectorAll<HTMLElement>("[data-f-list]")];
  const items = lists.flatMap((l) => [...l.querySelectorAll<HTMLElement>(":scope > li")]);
  const empty = document.querySelector<HTMLElement>("[data-f-empty]");
  const q = form.querySelector<HTMLInputElement>("[data-f-q]")!;
  form.addEventListener("submit", (e) => e.preventDefault());

  function matches(): Map<HTMLElement, boolean> {
    const areas = [...form.querySelectorAll<HTMLInputElement>('input[name="area"]:checked')].map((i) => i.value);
    const chan = form.querySelector<HTMLInputElement>('input[name="channel"]:checked')?.value ?? "all";
    const terms = q.value.toLowerCase().split(/\s+/).filter(Boolean);
    const out = new Map<HTMLElement, boolean>();
    for (const it of items) {
      let show = chan === "all" || it.dataset.channel === chan;
      const rows = [...it.querySelectorAll<HTMLElement>("[data-area]")];
      let any = false;
      for (const row of rows) {
        const okArea = !areas.length || areas.includes(row.dataset.area!);
        const okText = !terms.length || terms.every((t) => row.dataset.text!.includes(t) || it.dataset.text!.includes(t));
        row.hidden = !(okArea && okText);
        if (!row.hidden) any = true;
      }
      if (!areas.length && terms.length && terms.every((t) => it.dataset.text!.includes(t))) any = true;
      if (!areas.length && !terms.length) any = true;
      show = show && any;
      out.set(it, show);
    }
    return out;
  }

  let busy = 0;
  function apply() {
    const want = matches();
    const leaving = items.filter((i) => !i.hidden && !want.get(i));
    const fo = effect(BASE.fadeOut);
    clearTimeout(busy);
    leaving.forEach((i) => i.animate([{ opacity: 1 }, { opacity: 0 }], { duration: fo, fill: "forwards" }));
    busy = window.setTimeout(() => {
      const before = new Map(items.filter((i) => !i.hidden).map((i) => [i, i.getBoundingClientRect().top]));
      for (const i of items) { i.hidden = !want.get(i); i.getAnimations().forEach((a) => a.cancel()); }
      const shift = spatial(BASE.notificationShift);
      for (const i of items) {
        if (i.hidden) continue;
        const was = before.get(i);
        if (was === undefined) {
          i.animate([{ opacity: 0 }, { opacity: 1 }], { duration: effect(BASE.fadeIn), easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" });
        } else if (shift > 0) {
          const dy = was - i.getBoundingClientRect().top;
          if (Math.abs(dy) > 0.5) i.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: shift, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" });
        }
      }
      if (empty) empty.hidden = items.some((i) => !i.hidden);
    }, leaving.length ? fo : 0);
  }
  form.addEventListener("change", apply);
  let t = 0;
  q.addEventListener("input", () => { clearTimeout(t); t = window.setTimeout(apply, 120); });
}
