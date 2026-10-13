// /updates/index.json — every public release, newest first: the static index
// the ?from= view reads, and what `rime changelog`-style tools can read
// without scraping HTML. Informational only (spec §7.7). Maintenance builds
// are here, marked, so a predecessor chain never breaks; `latest` skips them.
import type { APIRoute } from "astro";
import { allReleases, isMaintenance, latestRelease } from "../../lib/releases";
import { SITE } from "../../data/site";
export const GET: APIRoute = async () => {
  const all = await allReleases();
  const body = {
    schema: 1,
    generated: new Date().toISOString(),
    note: "Informational. Update trust, channels and rollout live in the registry and the image signature, never here.",
    latest: (await latestRelease())!.id,
    releases: all.map((r) => ({
      id: r.id, product: r.product, name: r.name, title: r.title, date: r.date.toISOString(),
      maintenance: isMaintenance(r), channels: r.channels, predecessor: r.predecessor, notes: `${SITE.url}/updates/${r.id}`, json: `${SITE.url}/updates/${r.id}.json`,
      summary: r.summary,
      highlights: r.highlights.map((id) => r.changes.find((c) => c.id === id)?.title).filter(Boolean),
      changes: r.changes.map((c) => ({ id: c.id, area: c.area, kind: c.kind, title: c.title })),
      provenance: { osRevision: r.provenance.osRevision, shellRevision: r.provenance.shellRevision, imageDigest: r.provenance.imageDigest },
    })),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
