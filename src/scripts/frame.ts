// ─── The frame at runtime ────────────────────────────────────────────────────
// Draws the bar exactly for the real width (the server drew it at 1440),
// and runs the frame's three surfaces:
//   site map + search   CENTER_BLOOM out of the centre notch (lens narrows it
//                        to the launcher's width while searching, on the page
//                        spring, as the Shell's Dashboard does for Apps)
//   download (desktop)   RIGHT_POUR out of the right notch
//   download (phone)     BOTTOM_RISE out of the bottom edge (spec §11)
// Every trigger stays a real link: this only upgrades them.
// ─────────────────────────────────────────────────────────────────────────────
import * as Geo from "../vendor/rime-shell/geometry.mjs";
import { T1 } from "../geometry/theme.mjs";
import { FluidSurface, place, type Rect } from "./fluid";
import { Follower } from "../motion/spring";
import { springRole, onMotionChange } from "../motion/policy";
import { initSearch } from "./search";
import { showCapsule, initCopy } from "./capsule";

const B = T1.borderWidth, SH = T1.notchShoulder, NB = T1.notchBottom;
// The same test the stylesheet makes, so JS and CSS never disagree about which
// frame is showing (clientWidth leaves out a desktop scrollbar; media queries
// don't). On phones the notch is taller (--notch-h, global.css): the capsule's
// inside is one 44 px touch target.
const PHONE = window.matchMedia("(max-width: 760px)");
const COARSE = window.matchMedia("(pointer: coarse)");
const notchH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--notch-h")) || T1.notchHeight;
const L_W = 128, C_W = T1.cNotchMinWidth, R_W = 244;
const BLOOM_W = 880, LENS_W = 640, POUR_W = 420;

type Surface = { fluid: FluidSurface; trigger: HTMLElement | null; name: string };

export function initFrame(): void {
  const found = document.querySelector<HTMLElement>("[data-frame]");
  if (!found) return;
  const frame: HTMLElement = found;
  document.documentElement.classList.add("js");
  const svg = frame.querySelector<SVGSVGElement>(".frame-bar")!;
  const fill = svg.querySelector<SVGPathElement>(".bar-fill")!;
  const strip = svg.querySelector<SVGRectElement>("[data-bar-strip]")!;
  const line = svg.querySelector<SVGPathElement>(".bar-line")!;

  let W = frame.clientWidth, VH = window.innerHeight;
  let mobile = PHONE.matches;
  let NH = notchH();
  let capsuleW = Math.min(W - 2 * (SH + 4), 340);
  let rightAttached = false;

  // ── the bar ────────────────────────────────────────────────────────────────
  function drawBar() {
    svg.setAttribute("viewBox", `0 0 ${W} ${NH}`);
    strip.toggleAttribute("data-on", mobile);
    if (!mobile) {
      const g = { w: W, strip: B, h: NH, shoulder: SH, bottom: NB, leftW: L_W, centerW: C_W, rightW: R_W, rightBottomL: NB };
      fill.setAttribute("d", Geo.barSilhouette(g).path);
      line.setAttribute("d", Geo.barHairline({ ...g, rightAttached, frameInset: 0 }).path);
      frame.style.setProperty("--l-w", `${L_W}px`);
      frame.style.setProperty("--c-w", `${C_W}px`);
      frame.style.setProperty("--r-w", `${R_W}px`);
    } else {
      // One capsule: the strip and the centre notch, as barNotch draws it. The
      // strip is its own rect: barNotch's outline also covers the strip above
      // the notch (rime-shell e541c0f1), and as two sub-paths of one shape the
      // overlap would cancel out wherever their windings disagree.
      const x = Math.round(W / 2) - Math.round(capsuleW / 2);
      const n = Geo.barNotch({ x, w: Math.round(capsuleW), strip: B, h: NH, shoulder: SH, bottomL: NB, bottomR: NB });
      fill.setAttribute("d", n.path);
      const i = 0.5, x0 = x, x1 = x + Math.round(capsuleW);
      const P = `M 0 ${B - i} L ${x0 - SH} ${B - i} C ${x0 - SH + SH * Geo.KAPPA} ${B - i} ${x0 + i} ${B + SH - SH * Geo.KAPPA} ${x0 + i} ${B + SH}` +
        ` L ${x0 + i} ${NH - NB} C ${x0 + i} ${NH - NB + NB * Geo.KAPPA} ${x0 + NB - NB * Geo.KAPPA} ${NH - i} ${x0 + NB} ${NH - i}` +
        ` L ${x1 - NB} ${NH - i} C ${x1 - NB + NB * Geo.KAPPA} ${NH - i} ${x1 - i} ${NH - NB + NB * Geo.KAPPA} ${x1 - i} ${NH - NB}` +
        ` L ${x1 - i} ${B + SH} C ${x1 - i} ${B + SH - SH * Geo.KAPPA} ${x1 + SH - SH * Geo.KAPPA} ${B - i} ${x1 + SH} ${B - i} L ${W} ${B - i}`;
      line.setAttribute("d", P);
      frame.style.setProperty("--c-w", `${Math.round(capsuleW)}px`);
    }
  }

  // ── surfaces ───────────────────────────────────────────────────────────────
  const surfaces: Surface[] = [];
  const bloomEl = document.querySelector<HTMLElement>("[data-bloom]")!;
  const pourEl = document.querySelector<HTMLElement>("[data-pour]")!;
  const bloomTrigger = frame.querySelector<HTMLElement>("[data-bloom-trigger]");
  const pourTriggers = [...frame.querySelectorAll<HTMLElement>("[data-pour-trigger]")];
  const searchTrigger = frame.querySelector<HTMLElement>("[data-search-trigger]");
  let pourTrigger: HTMLElement | null = pourTriggers[0] ?? null;

  const bloomWidth = () => (mobile ? W - 16 : Math.min(BLOOM_W, W - 32));
  const lensWidth = () => (mobile ? W - 16 : Math.min(LENS_W, W - 32));
  // Phones: nearly the whole screen (a strip of scrim stays below it), since
  // the lens row carries its own close button.
  const bloomHeight = () => Math.round(mobile ? Math.min(VH - NH - 40, 640) : Math.min(470, VH - 96));
  let searching = false;
  const targetW = new Follower(bloomWidth(), springRole("page"), () => bloom.render());
  const bloomNotchW = () => (mobile ? Math.round(capsuleW) : C_W);

  function bloomFinal(): Rect {
    const w = searching ? lensWidth() : bloomWidth(), inset = 8;
    return { x: Math.round(W / 2) - Math.round(w / 2) + inset, y: B + inset, w: w - 2 * inset, h: NH + bloomHeight() - B - 2 * inset };
  }
  const bloomReveal = bloomEl.querySelector<HTMLElement>("[data-reveal]")!;
  const bloomHole = bloomEl.querySelector<HTMLElement>("[data-hole]")!;
  const bloom = new FluidSurface({
    root: bloomEl,
    path: bloomEl.querySelector<SVGPathElement>("[data-path]")!,
    reveal: bloomReveal,
    content: bloomEl.querySelector<HTMLElement>("[data-content]")!,
    family: "centerBloom",
    lead: "width",
    geometry: () => ({
      cx: W / 2, strip: B, notchW: bloomNotchW(), notchH: NH, shoulder: SH, notchBottom: NB,
      w: targetW.value, h: NH + bloomHeight(), r: T1.radiusXL, shoulderW1: T1.px(28), shoulderH1: T1.px(22),
    }),
    finalRect: bloomFinal,
    hole: () => {
      const nw = bloomNotchW(), L0 = Math.round(W / 2) - Math.round(nw / 2), inset = 2;
      return { x: L0 + inset, y: B, w: nw - 2 * inset, h: NH - B - inset, rb: Math.max(0, NB - inset) };
    },
    holeCover: bloomHole,
    lifecycle: { onClosed: () => onSurfaceClosed(bloomS) },
  });
  const bloomS: Surface = { fluid: bloom, trigger: bloomTrigger, name: "bloom" };
  surfaces.push(bloomS);

  // RIGHT_POUR, in coordinates that run one strip past the viewport's right
  // edge: the Shell's panel melts into a right-hand frame strip, and the web
  // has none, so the melt lands on the viewport edge itself.
  const pourReveal = pourEl.querySelector<HTMLElement>("[data-reveal]")!;
  const pourContent = pourEl.querySelector<HTMLElement>("[data-content]")!;
  const pourShape = pourEl.querySelector<SVGSVGElement>(".fluid-shape")!;
  let pourH = 360;
  const pourPanelW = () => Math.min(POUR_W, W - 24);
  function pourGeometry() {
    if (mobile) {
      return { cx: W / 2, y1: VH, edgeH: 8, w: W - 2 * 24, h: pourH, r: T1.radiusL, rm: T1.radiusM };
    }
    return { winW: W + B, strip: B, seam: NH, shoulder: SH, notchBottom: NB, notchW: R_W + B, w: pourPanelW() + B, h: pourH, r: T1.radiusL };
  }
  function pourFinal(): Rect {
    if (mobile) { const w = W - 48; return { x: Math.round(W / 2) - Math.round(w / 2), y: VH - pourH, w, h: pourH }; }
    const w = pourPanelW();
    return { x: W - w, y: NH, w, h: pourH };
  }
  const pour = new FluidSurface({
    root: pourEl,
    path: pourEl.querySelector<SVGPathElement>("[data-path]")!,
    reveal: pourReveal,
    content: pourContent,
    family: "rightPour",
    lead: "depth",
    geometry: pourGeometry,
    finalRect: pourFinal,
    lifecycle: {
      onClosed: () => onSurfaceClosed(pourS),
      onUpdate: (l) => {
        const att = !mobile && l.progress > 0;
        if (att !== rightAttached) { rightAttached = att; drawBar(); }
      },
    },
  });
  const pourS: Surface = { fluid: pour, trigger: pourTrigger, name: "pour" };
  surfaces.push(pourS);

  function layoutSurfaces() {
    place(bloomReveal, bloomFinal());
    place(bloomHole, (() => { const h = bloom.spec.hole!()!; return { x: h.x, y: h.y, w: h.w, h: h.h }; })());
    bloomHole.style.borderRadius = `0 0 ${Math.max(0, NB - 2)}px ${Math.max(0, NB - 2)}px`;
    // Measure the pour's content at its final width, laid out but unseen:
    // a display:none layer measures 0.
    const f0 = pourFinal();
    const wasHidden = pourEl.hidden;
    pourEl.style.visibility = "hidden";
    pourEl.hidden = false;
    pourReveal.style.width = `${f0.w}px`;
    pourReveal.style.height = "auto";
    pourReveal.style.clipPath = "none";
    pourContent.style.position = "relative";
    const measured = Math.ceil(pourContent.scrollHeight);
    pourContent.style.position = "";
    pourEl.hidden = wasHidden;
    pourEl.style.visibility = "";
    pourH = Math.min(Math.max(measured, 200), VH - NH - 24);
    pour.spec.family = mobile ? "bottomRise" : "rightPour";
    pour.spec.lead = mobile ? "width" : "depth";
    pourShape.style.width = mobile ? "100%" : `${W + B}px`;
    place(pourReveal, pourFinal());
    targetW.jump(searching ? lensWidth() : bloomWidth());
    bloom.render(); pour.render();
  }

  // ── open / close, focus, keys ─────────────────────────────────────────────
  let lastFocus: HTMLElement | null = null;
  function openSurface(s: Surface, trigger?: HTMLElement | null) {
    for (const o of surfaces) if (o !== s && o.fluid.isOpen) o.fluid.close();
    if (trigger) s.trigger = trigger;
    lastFocus = (document.activeElement as HTMLElement) ?? s.trigger;
    s.fluid.open();   // maps the layer synchronously, so it can take focus now
    s.trigger?.setAttribute("aria-expanded", "true");
    frame.dataset.open = s.name;
    const lens = bloomEl.querySelector<HTMLInputElement>("[data-lens-input]");
    // On a touch screen, focusing the field raises the keyboard: only the
    // search button does that (and synchronously, inside the tap, or iOS
    // won't show it). The site map takes focus as a dialog instead.
    if (COARSE.matches) {
      if (s === bloomS && trigger === searchTrigger) lens?.focus({ preventScroll: true });
      else (s === bloomS ? bloomEl : pourEl).focus({ preventScroll: true });
      return;
    }
    requestAnimationFrame(() => {
      const first = s === bloomS ? lens : pourEl.querySelector<HTMLElement>("a, button");
      first?.focus({ preventScroll: true });
    });
  }
  function closeSurface(s: Surface, restore = true) {
    if (!s.fluid.isOpen) return;
    s.fluid.close();
    s.trigger?.setAttribute("aria-expanded", "false");
    if (frame.dataset.open === s.name) delete frame.dataset.open;
    if (restore) (s.trigger ?? lastFocus)?.focus({ preventScroll: true });
  }
  function onSurfaceClosed(s: Surface) {
    if (s === bloomS) search.reset();
  }

  bloomTrigger?.addEventListener("click", (e) => {
    e.preventDefault();
    bloom.isOpen ? closeSurface(bloomS) : openSurface(bloomS, bloomTrigger);
  });
  searchTrigger?.addEventListener("click", (e) => { e.preventDefault(); openSurface(bloomS, searchTrigger); });
  for (const t of pourTriggers)
    t.addEventListener("click", (e) => {
      e.preventDefault();
      pourS.trigger = t;
      pour.isOpen ? closeSurface(pourS) : openSurface(pourS, t);
    });
  for (const el of [bloomEl, pourEl])
    el.querySelectorAll("[data-close]").forEach((c) => c.addEventListener("click", () => {
      for (const s of surfaces) closeSurface(s, false);
    }));

  document.addEventListener("keydown", (e) => {
    const open = surfaces.find((s) => s.fluid.isOpen);
    if (e.key === "Escape" && open) {
      // The lens clears first, as the Shell's launcher field does.
      if (open === bloomS && search.hasQuery()) { search.clear(); return; }
      e.preventDefault();
      closeSurface(open);
      return;
    }
    if (e.key === "/" && !open && !isTyping(e.target)) {
      e.preventDefault();
      openSurface(bloomS, searchTrigger && getComputedStyle(searchTrigger).display !== "none" ? searchTrigger : bloomTrigger);
      return;
    }
    if (e.key === "Tab" && open) trapFocus(e, open === bloomS ? bloomEl : pourEl);
  });

  // ── search (LENS_REVEAL) ──────────────────────────────────────────────────
  const search = initSearch(bloomEl, (active) => {
    if (active === searching) return;
    searching = active;
    targetW.follow(active ? lensWidth() : bloomWidth(), springRole("page"));
    place(bloomReveal, bloomFinal());
    bloom.render();
  });

  // The desktop placeholder does not fit a phone's field.
  const lensInput = bloomEl.querySelector<HTMLInputElement>("[data-lens-input]");
  const wide = lensInput?.placeholder ?? "";
  const fitPlaceholder = () => { if (lensInput) lensInput.placeholder = mobile ? "Search the site" : wide; };

  // ── resize ────────────────────────────────────────────────────────────────
  const onResize = () => {
    W = frame.clientWidth; VH = window.innerHeight;
    mobile = PHONE.matches;
    NH = notchH();
    capsuleW = Math.min(W - 2 * (SH + 4), 340);
    drawBar();
    layoutSurfaces();
    fitPlaceholder();
  };
  new ResizeObserver(onResize).observe(frame);
  window.addEventListener("resize", onResize, { passive: true });
  onMotionChange(() => { targetW.spring.response = springRole("page").response; });

  drawBar();
  frame.dataset.drawn = "";
  layoutSurfaces();
  fitPlaceholder();
  initCopy();
  document.querySelectorAll<HTMLAnchorElement>("[data-download-start]").forEach((a) =>
    a.addEventListener("click", () => showCapsule("Download started")));
}

function isTyping(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}

function trapFocus(e: KeyboardEvent, root: HTMLElement) {
  const f = [...root.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])')]
    .filter((x) => !x.closest("[hidden]"));
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  else if (!root.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
}
