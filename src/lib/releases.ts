// Release index helpers, shared by the pages, the feeds and the JSON the OS
// can read (spec §7, §8). `crossed()` is the arithmetic behind ?from=: which
// releases a machine passed through going from one public release ID to
// another. It runs at build time here and in the browser (release-from.ts)
// from the same static index; no request carries anything but a public ID.
import { getCollection, type CollectionEntry } from "astro:content";

export type Release = CollectionEntry<"updates">["data"];

let cache: Release[] | null = null;
export async function allReleases(): Promise<Release[]> {
  if (cache) return cache;
  const entries = await getCollection("updates");
  cache = entries.map((e) => e.data).sort((a, b) => b.date.getTime() - a.date.getTime());
  return cache;
}

/** A maintenance build: it has a page, but it is not a release anyone would read about. */
export function isMaintenance(r: Pick<Release, "maintenance" | "changes">): boolean {
  return r.maintenance || r.changes.length === 0;
}

/** Newest first, without maintenance builds: what the list, feeds and home page show and count. */
export async function listedReleases(): Promise<Release[]> {
  return (await allReleases()).filter((r) => !isMaintenance(r));
}

/** The newest release with something in it. */
export async function latestRelease(): Promise<Release | undefined> {
  return (await listedReleases())[0];
}

/**
 * What the home page's banner says about a release: its first new feature.
 * A release of fixes alone is not a headline (the first thing a visitor read
 * used to be what Gaming Mode had got wrong), so it gets a neutral line.
 */
export function releaseHeadline(r: Pick<Release, "changes">): string {
  return r.changes.find((c) => c.kind === "new")?.title ?? "What's new in this release";
}

export async function releaseById(id: string): Promise<Release | undefined> {
  return (await allReleases()).find((r) => r.id === id);
}

/** Newest first: every release after `fromId` up to and including `toId`, following predecessors. */
export function crossed(index: Pick<Release, "id" | "predecessor">[], fromId: string, toId: string): string[] | null {
  const byId = new Map(index.map((r) => [r.id, r]));
  if (!byId.has(fromId) || !byId.has(toId) || fromId === toId) return null;
  const out: string[] = [];
  let cur = byId.get(toId);
  const seen = new Set<string>();
  while (cur && cur.id !== fromId) {
    if (seen.has(cur.id)) return null;
    seen.add(cur.id);
    out.push(cur.id);
    cur = cur.predecessor ? byId.get(cur.predecessor) : undefined;
  }
  return cur ? out : null; // null: `from` is not an ancestor (a rollback or a channel move)
}

export const AREA_LABEL: Record<string, string> = {
  shell: "Shell", system: "System", security: "Security", gaming: "Gaming", agents: "Agents", developer: "Developer",
};
export const KIND_LABEL: Record<string, string> = {
  new: "New", improved: "Improved", fixed: "Fixed", security: "Security", removed: "Removed",
};

/** The machine-readable record for one release (/updates/<id>.json). */
export function releaseJson(r: Release, site: string) {
  return {
    schema: 1,
    id: r.id,
    product: r.product,
    name: r.name,
    title: r.title,
    date: r.date.toISOString(),
    channels: r.channels,
    predecessor: r.predecessor,
    notes: `${site}/updates/${r.id}`,
    summary: r.summary,
    provenance: r.provenance,
    highlights: r.highlights,
    changes: r.changes,
    knownIssues: r.knownIssues,
    rollback: r.rollback,
    maintenance: isMaintenance(r),
  };
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Perth" });
}
