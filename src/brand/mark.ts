// ─── The Rime mark: the layered ridge ────────────────────────────────────────
// Four flat planes stacked into a rising ridge; plane 3 is the accent and the
// ONLY part that may ever change colour (rime-os docs/branding.md, "The
// adaptive rule"). Nothing in the site draws the mark by hand: the geometry is
// rime-os's own masters, vendored byte for byte by scripts/sync-brand.mjs and
// hash-pinned in src/brand/SOURCE.json.
//
// Colour: planes 1, 2, 4 and the wordmark are the text ink (currentColor).
// Plane 3 is Rime Blue in the site's chrome, as on the brand pack's website
// header; on Rime itself it follows the wallpaper, which the brand page shows
// with tone="role". The scenes' own accent is not used in the chrome: the
// default scene's light accent (#000613) would fold plane 3 into the ink.
// ─────────────────────────────────────────────────────────────────────────────
import symbolSvg from "./ridge/rime-ridge-symbol.svg?raw";
import smallSvg from "./ridge/rime-ridge-symbol-small.svg?raw";
import lockupSvg from "./ridge/rime-lockup-horizontal.svg.in?raw";
import palette from "./ridge/palette.json";
import source from "./SOURCE.json";
import { parseLockup, parsePlanes, symbolViewBox } from "./ridge.mjs";

export type Plane = { id: string; role?: string; points: string };

export const MARK = {
  status: "final" as "provisional" | "final",
  viewBox: symbolViewBox(symbolSvg) as string,        // "0 0 240 175"
  planes: parsePlanes(symbolSvg) as Plane[],
  // Same planes 20 % thinner: rime-os uses it for every export at 32 px or less.
  small: parsePlanes(smallSvg) as Plane[],
  smallMax: 32,
  // rime-os docs/branding.md minimum sizes: a lockup 24 px high, the symbol 16 px.
  minLockup: 24,
  minSymbol: 16,
  lockup: parseLockup(lockupSvg) as { viewBox: string; symbolTransform: string; planes: Plane[]; wordTransform: string; wordPaths: string[] },
  accent: palette.rime_blue,                           // Rime Blue, plane 3's default
  accents: palette.accents as Record<string, string>,  // the brand pack's approved accents
  source: `rime-os files/branding/ridge @ ${source.ref.slice(0, 9)}`,
};
