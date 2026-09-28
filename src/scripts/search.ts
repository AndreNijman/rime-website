// LENS_REVEAL — site search inside the centre bloom (spec §4.3). The field is
// there the moment the surface is; results arrive beneath it as ONE grouped
// reveal (no row bounces in), and the keys work the way Rime's launcher does:
// type, ↑/↓ to choose, Enter to open, Esc clears then closes.
//
// The index is a static file built with the site (src/pages/search.json.ts),
// fetched on first use. Nothing is sent anywhere: the query never leaves the page.
type Doc = { k: "Page" | "Docs" | "Updates" | "Journal"; title: string; url: string; text: string; tags?: string };
const ORDER: Doc["k"][] = ["Page", "Docs", "Updates", "Journal"];
const GROUP: Record<Doc["k"], string> = { Page: "Pages", Docs: "Docs", Updates: "Updates", Journal: "Journal" };

export interface SearchHandle { reset(): void; clear(): void; hasQuery(): boolean }

export function initSearch(root: HTMLElement, onActive: (active: boolean) => void): SearchHandle {
  const input = root.querySelector<HTMLInputElement>("[data-lens-input]")!;
  const results = root.querySelector<HTMLElement>("[data-lens-results]")!;
  const nav = root.querySelector<HTMLElement>("[data-bloom-nav]")!;
  const form = root.querySelector<HTMLFormElement>("[data-lens]")!;
  let index: Doc[] | null = null;
  let loading: Promise<void> | null = null;
  let rows: HTMLAnchorElement[] = [];
  let sel = -1;

  const load = () => loading ??= fetch("/search.json").then((r) => r.json()).then((d: Doc[]) => { index = d; }).catch(() => { index = []; });

  function score(d: Doc, terms: string[]): number {
    const t = d.title.toLowerCase(), x = d.text.toLowerCase(), g = (d.tags ?? "").toLowerCase();
    let s = 0;
    for (const q of terms) {
      const inT = t.includes(q), inG = g.includes(q), inX = x.includes(q);
      if (!inT && !inG && !inX) return 0;
      s += (inT ? (t.startsWith(q) ? 12 : 8) : 0) + (inG ? 4 : 0) + (inX ? 1 : 0);
    }
    return s;
  }

  function excerpt(text: string, q: string): string {
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return text.slice(0, 110) + (text.length > 110 ? "…" : "");
    const a = Math.max(0, i - 40);
    return (a > 0 ? "…" : "") + text.slice(a, a + 120).trim() + (a + 120 < text.length ? "…" : "");
  }

  function render(q: string) {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const active = terms.length > 0;
    nav.hidden = active;
    results.hidden = !active;
    onActive(active);
    if (!active) { results.replaceChildren(); rows = []; sel = -1; input.removeAttribute("aria-activedescendant"); return; }
    if (!index) { load().then(() => render(input.value)); return; }
    const hits = index.map((d) => ({ d, s: score(d, terms) })).filter((h) => h.s > 0).sort((a, b) => b.s - a.s);
    const frag = document.createDocumentFragment();
    rows = [];
    for (const k of ORDER) {
      const group = hits.filter((h) => h.d.k === k).slice(0, 6);
      if (!group.length) continue;
      const sec = document.createElement("div");
      sec.className = "lens-group";
      sec.setAttribute("role", "group");
      const h = document.createElement("h3");
      h.textContent = GROUP[k];
      h.id = `lens-g-${k}`;
      sec.setAttribute("aria-labelledby", h.id);
      sec.append(h);
      for (const { d } of group) {
        const a = document.createElement("a");
        a.className = "lens-row";
        a.href = d.url;
        a.id = `lens-r-${rows.length}`;
        a.setAttribute("role", "option");
        a.setAttribute("aria-selected", "false");
        const s = document.createElement("strong"); s.textContent = d.title;
        const p = document.createElement("span"); p.textContent = excerpt(d.text, terms[0]);
        a.append(s, p);
        rows.push(a);
        sec.append(a);
      }
      frag.append(sec);
    }
    if (!rows.length) {
      const e = document.createElement("p");
      e.className = "lens-empty";
      e.textContent = `Nothing matches “${q}”.`;
      frag.append(e);
    }
    results.replaceChildren(frag);
    select(rows.length ? 0 : -1);
  }

  function select(i: number) {
    rows[sel]?.setAttribute("aria-selected", "false");
    sel = i;
    const r = rows[sel];
    if (r) {
      r.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", r.id);
      r.scrollIntoView({ block: "nearest" });
    } else input.removeAttribute("aria-activedescendant");
  }

  input.addEventListener("focus", () => void load(), { once: true });
  input.addEventListener("input", () => render(input.value.trim()));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && rows.length) { e.preventDefault(); select((sel + 1) % rows.length); }
    else if (e.key === "ArrowUp" && rows.length) { e.preventDefault(); select((sel - 1 + rows.length) % rows.length); }
    else if (e.key === "Enter" && rows[sel]) { e.preventDefault(); rows[sel].click(); }
  });
  form.addEventListener("submit", (e) => { if (rows[sel]) { e.preventDefault(); rows[sel].click(); } });

  return {
    reset() { input.value = ""; render(""); },
    clear() { input.value = ""; render(""); input.focus(); },
    hasQuery() { return input.value.trim().length > 0; },
  };
}
