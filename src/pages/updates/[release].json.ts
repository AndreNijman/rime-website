// /updates/<release>.json — the machine-readable record of one release,
// generated from the same content/updates/<id>/release.yaml as the page.
import type { APIRoute } from "astro";
import { allReleases, releaseJson, type Release } from "../../lib/releases";
import { SITE } from "../../data/site";
export async function getStaticPaths() {
  return (await allReleases()).map((r) => ({ params: { release: r.id }, props: { r } }));
}
export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify(releaseJson((props as { r: Release }).r, SITE.url), null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
