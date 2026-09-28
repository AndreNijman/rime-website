// CAPSULE — tiny transient feedback ("Copied", "Download started"), just under
// the centre notch. It is announced through a polite live region, so it never
// relies on being seen; its motion is a short effect, which survives Reduce
// Motion as a plain fade.
import { effect, travel, BASE } from "../motion/policy";

let timer = 0;
export function showCapsule(text: string, ms = 1800): void {
  const el = document.querySelector<HTMLElement>("[data-capsule]");
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [
      { opacity: 0, transform: `translate(-50%, ${-travel(10)}px) scale(${travel(1) ? 0.94 : 1})` },
      { opacity: 1, transform: "translate(-50%, 0) scale(1)" },
    ],
    { duration: effect(BASE.surfaceEnterSmall), easing: "cubic-bezier(0.25, 0.2, 0.15, 1)", fill: "both" },
  );
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    const a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: effect(BASE.surfaceExitSmall), fill: "both" });
    a.onfinish = () => { el.hidden = true; };
  }, ms);
}

/** Every [data-copy] button: copy its value, confirm with a capsule. */
export function initCopy(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>("[data-copy]").forEach((b) => {
    if (b.dataset.copyBound) return;
    b.dataset.copyBound = "1";
    b.addEventListener("click", async () => {
      const v = b.dataset.copy ?? "";
      try {
        await navigator.clipboard.writeText(v);
        showCapsule(b.dataset.copyLabel ?? "Copied");
      } catch {
        // No clipboard permission: select the text so it can be copied by hand.
        const sel = window.getSelection();
        const target = b.querySelector("code, span") ?? b;
        const range = document.createRange();
        range.selectNodeContents(target);
        sel?.removeAllRanges(); sel?.addRange(range);
        showCapsule("Selected — press Ctrl+C to copy");
      }
    });
  });
}
