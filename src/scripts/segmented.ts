// SelectionPill for every [data-segmented]: the pill travels to the checked
// option on the Shell's `selection` spring (damping 0.86 — a whisper of
// overshoot, allowed for a small selection, never for a surface).
import { Follower } from "../motion/spring";
import { springRole, onMotionChange } from "../motion/policy";

const bound = new WeakSet<Element>();
export function initSegmented(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-segmented]").forEach((set) => {
    if (bound.has(set)) return;
    bound.add(set);
    const track = set.querySelector<HTMLElement>(".segmented-track")!;
    const pill = set.querySelector<HTMLElement>("[data-pill]")!;
    const role = () => springRole("selection");
    let fx: Follower, fw: Follower;
    const draw = () => {
      pill.style.transform = `translateX(${fx.value.toFixed(2)}px)`;
      pill.style.width = `${Math.max(0, fw.value).toFixed(2)}px`;
    };
    const target = () => {
      const c = set.querySelector<HTMLInputElement>("input:checked");
      const span = c?.nextElementSibling as HTMLElement | null;
      if (!span) return null;
      const t = track.getBoundingClientRect(), s = span.getBoundingClientRect();
      return { x: s.left - t.left, w: s.width };
    };
    const t0 = target() ?? { x: 0, w: 0 };
    fx = new Follower(t0.x, role(), draw);
    fw = new Follower(t0.w, role(), draw);
    draw();
    pill.style.opacity = "1";
    const move = (jump = false) => {
      const t = target();
      if (!t) return;
      if (jump) { fx.jump(t.x); fw.jump(t.w); } else { fx.follow(t.x, role()); fw.follow(t.w, role()); }
    };
    set.addEventListener("change", () => move());
    new ResizeObserver(() => move(true)).observe(track);
    onMotionChange(() => move(true));
    (set as any).__segmentedMove = move;
  });
}
/** Reposition after a programmatic check (no change event fires). */
export function syncSegmented(set: Element, jump = true) { (set as any).__segmentedMove?.(jump); }
