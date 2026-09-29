// Tables on a phone. A prose table that does not fit its column, or one
// marked data-stack, becomes a list of rows, each cell labelled with its
// column's header (data-label attributes, drawn by CSS). Explicit ARIA roles
// keep it a table for screen readers once CSS has changed its display. A table
// that fits is left alone, and without JavaScript every table scrolls
// sideways instead. A table or code block that still scrolls sideways gets a
// tab stop, so a keyboard can scroll it too.
const PHONE = window.matchMedia("(max-width: 760px)");

export function initTables(): void {
  const tables = [...document.querySelectorAll<HTMLTableElement>(".prose table")];
  const pres = [...document.querySelectorAll<HTMLElement>(".prose pre")];
  if (!tables.length && !pres.length) return;
  for (const t of tables) {
    const heads = [...t.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
    t.setAttribute("role", "table");
    t.querySelectorAll("tr").forEach((tr) => {
      tr.setAttribute("role", "row");
      tr.querySelectorAll("th, td").forEach((c, i) => {
        c.setAttribute("role", c.closest("thead") ? "columnheader" : "cell");
        if (c.tagName === "TD" && heads[i] && c.textContent?.trim()) c.setAttribute("data-label", heads[i]);
      });
    });
  }
  const fit = () => {
    for (const t of tables) {
      t.classList.remove("t-stack");
      if (PHONE.matches && (t.hasAttribute("data-stack") || t.scrollWidth > t.clientWidth + 1)) t.classList.add("t-stack");
      if (t.scrollWidth > t.clientWidth + 1) t.tabIndex = 0; else t.removeAttribute("tabindex");
    }
    for (const pre of pres) {
      if (pre.scrollWidth > pre.clientWidth + 1) pre.tabIndex = 0;
      else pre.removeAttribute("tabindex");
    }
  };
  fit();
  let raf = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(fit); }, { passive: true });
  document.fonts?.ready.then(fit);
}
