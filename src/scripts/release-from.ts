// ?from=<release id> — the installed-state view (spec §8.2). Only a PUBLIC
// release ID is read, it is validated against the static index, and nothing is
// sent anywhere: the index is the same file the page could have inlined.
type Entry = { id: string; name: string; title: string; date: string; predecessor: string | null; highlights: string[]; changes: { area: string; kind: string; title: string }[] };
const ID = /^(\d{4}\.\d{2}\.\d{2}(\.\d+)?|apex-v\d+\.\d+\.\d+)$/;

export function crossedIds(index: Pick<Entry, "id" | "predecessor">[], from: string, to: string): string[] | null {
  const byId = new Map(index.map((r) => [r.id, r]));
  if (!byId.has(from) || !byId.has(to) || from === to) return null;
  const out: string[] = [];
  const seen = new Set<string>();
  let cur = byId.get(to);
  while (cur && cur.id !== from) {
    if (seen.has(cur.id)) return null;
    seen.add(cur.id); out.push(cur.id);
    cur = cur.predecessor ? byId.get(cur.predecessor) : undefined;
  }
  return cur ? out : null;
}

export async function initFrom(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-release]");
  if (!root) return;
  const from = new URLSearchParams(location.search).get("from") ?? "";
  if (!ID.test(from)) return;
  const current = root.dataset.release!;
  let index: Entry[];
  try { index = (await (await fetch("/updates/index.json")).json()).releases; } catch { return; }
  const byId = new Map(index.map((r) => [r.id, r]));
  const banner = root.querySelector<HTMLElement>("[data-from]")!;
  const panel = root.querySelector<HTMLElement>("[data-crossed]")!;
  const f = byId.get(from);
  if (!f) return;
  const ids = crossedIds(index, from, current);
  if (!ids) {
    // Not an ancestor: the machine went back, or moved channel. Not a celebration.
    if (new Date(f.date) > new Date(byId.get(current)!.date)) {
      banner.textContent = `You came from ${f.name}, which is newer than this release. Going back to an older release is a rollback or a channel change, not an update.`;
      banner.hidden = false;
    }
    return;
  }
  banner.textContent = ids.length > 1
    ? `You updated from ${f.name}. Your update covers ${ids.length} releases: this one, and the ${ids.length - 1} before it summarised below.`
    : `You updated from ${f.name}.`;
  banner.hidden = false;
  if (ids.length < 2) return;
  const h = document.createElement("h2");
  h.textContent = `Also in your update (${ids.length - 1} earlier release${ids.length > 2 ? "s" : ""})`;
  h.className = "crossed-title";
  const list = document.createElement("ol");
  list.className = "crossed-list";
  for (const id of ids.slice(1)) {
    const r = byId.get(id)!;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `/updates/${r.id}`;
    const n = document.createElement("span"); n.className = "mono"; n.textContent = r.name;
    const t = document.createElement("strong"); t.textContent = r.title;
    a.append(n, t);
    li.append(a);
    const hl = r.highlights.length ? r.highlights : r.changes.slice(0, 3).map((c) => c.title);
    if (hl.length) {
      const ul = document.createElement("ul");
      for (const x of hl.slice(0, 4)) { const i = document.createElement("li"); i.textContent = x; ul.append(i); }
      li.append(ul);
    }
    list.append(li);
  }
  panel.replaceChildren(h, list);
  panel.hidden = false;
}
