// Inline Markdown for short, trusted strings (release notes fields): escapes
// everything, then allows `code`, **strong** and [text](https://…) only.
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function inline(s: string | null | undefined): string {
  if (!s) return "";
  let out = esc(s);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
  return out;
}
/** A short label for a source URL: "rime-os #71", "rime-shell 741cecb4", "run 36420444425". */
export function sourceLabel(u: string): string {
  const m = u.match(/github\.com\/AndreNijman\/([^/]+)\/(pull|commit|actions\/runs|releases\/tag)\/([^/?#]+)/);
  if (!m) return u.replace(/^https?:\/\//, "");
  const [, repo, kind, id] = m;
  if (kind === "pull") return `${repo} #${id}`;
  if (kind === "commit") return `${repo} ${id.slice(0, 8)}`;
  if (kind === "releases/tag") return `${repo} ${id}`;
  return `build ${id}`;
}
