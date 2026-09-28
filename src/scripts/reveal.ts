// Reveal on scroll: sections arrive once, a short distance, when they enter.
// The first frame is already coherent (spec §3.5): anything above the fold on
// load is shown at once, and a CSS failsafe shows everything after 2.5 s even
// if this script never runs.
export function initReveal(): void {
  const els = [...document.querySelectorAll<HTMLElement>(".reveal")];
  if (!("IntersectionObserver" in window)) { els.forEach((e) => e.classList.add("is-in")); return; }
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  const vh = window.innerHeight;
  for (const e of els) {
    if (e.getBoundingClientRect().top < vh) e.classList.add("is-in", "no-anim");
    else io.observe(e);
  }
}
