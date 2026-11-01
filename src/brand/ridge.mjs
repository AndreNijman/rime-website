// Reads the vendored layered-ridge masters (src/brand/ridge/, see
// scripts/sync-brand.mjs) into plain data. Shared by src/brand/mark.ts (pages)
// and scripts/postbuild.mjs (social cards), so the two can never drift.
// Plain JS on purpose: postbuild runs under node without a TypeScript step.

const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** The four planes of a symbol SVG, bottom (plane 1) to peak (plane 4). */
export function parsePlanes(svg) {
  const planes = [...svg.matchAll(/<polygon\b[^>]*>/g)].map((m) => ({
    id: attr(m[0], "id"),
    role: attr(m[0], "data-role") ?? (attr(m[0], "fill") === "{{accent}}" ? "accent" : undefined),
    points: attr(m[0], "points"),
  }));
  if (planes.length !== 4) throw new Error(`ridge: expected 4 planes, found ${planes.length}`);
  planes.forEach((p, i) => { if (p.id !== `plane-${i + 1}`) throw new Error(`ridge: plane ${i + 1} is ${p.id}`); });
  return planes;
}

const viewBoxOf = (svg) => {
  const vb = attr(/<svg\b[^>]*>/.exec(svg)[0], "viewBox");
  if (!vb) throw new Error("ridge: svg without a viewBox");
  return vb;
};

/** The horizontal lockup template: where the symbol sits and the outlined wordmark. */
export function parseLockup(template) {
  const groups = [...template.matchAll(/<g\b([^>]*)>([\s\S]*?)<\/g>/g)];
  const symbol = groups.find((g) => g[2].includes("<polygon"));
  const word = groups.find((g) => g[2].includes("<path"));
  if (!symbol || !word) throw new Error("ridge: lockup template lost its symbol or wordmark group");
  return {
    viewBox: viewBoxOf(template),
    symbolTransform: attr(symbol[1], "transform") ?? "",
    planes: parsePlanes(symbol[2]),
    wordTransform: attr(word[1], "transform") ?? "",
    wordPaths: [...word[2].matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].map((m) => m[1]),
  };
}

export const symbolViewBox = viewBoxOf;

/**
 * SVG markup for a mark, as a string (social cards; RimeMark renders the same
 * structure in Astro). `ink` fills planes 1, 2, 4 and the wordmark; `accent`
 * fills plane 3 only, the one plane that may ever change colour.
 */
export function markSvg({ planes, lockup, ink, accent, wordmark = false }) {
  const poly = (ps) => ps.map((p, i) => `<polygon points="${p.points}" fill="${i === 2 ? accent : ink}"/>`).join("");
  if (!wordmark) return poly(planes);
  return `<g transform="${lockup.symbolTransform}">${poly(planes)}</g>` +
    `<g transform="${lockup.wordTransform}" fill="${ink}">${lockup.wordPaths.map((d) => `<path d="${d}"/>`).join("")}</g>`;
}
