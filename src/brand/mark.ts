// ─── The Rime mark ───────────────────────────────────────────────────────────
// PROVISIONAL (spec §2.2): the evolved Rime mark and its new Convergence
// animation are still being designed. Until they are signed off the site uses
// the current spark geometry from rime-os files/branding/logos (the four-point
// star, 512-unit grid) — and nothing else in the site knows its shape. Swap the
// path here and every mark, favicon and social card follows.
//
// Colour: none of its own. It takes a palette role in product contexts and
// plain currentColor in neutral ones (spec §2.2 LOGO RULE). The source SVG's
// unused gold gradient is deliberately not carried over.
// ─────────────────────────────────────────────────────────────────────────────
export const MARK = {
  status: "provisional" as "provisional" | "final",
  viewBox: "0 0 512 512",
  // Optical centre of the star is (256, 298); the viewBox is square on it
  // after `crop` below, so the mark sits centred in a line of text.
  path: "M256 82 L292 264 L384 298 L292 332 L256 430 L220 332 L128 298 L220 264 Z",
  crop: "108 72 296 368",
  source: "rime-os files/branding/logos/mono-white/rime-spark-white.svg @ 2d9c5438a",
};
