// What a release's image tags mean for a reader. Today every published tag is
// one digest, and rime-os's client reads them all as the edge channel
// (rimed/rimed-core/src/channel.rs): stable, candidate and beta do not exist yet.
export function channelOf(tags: string[]): { label: string; note: string } {
  if (!tags.length) return { label: "installer", note: "Published as an installer ISO on GitHub." };
  if (tags.includes("edge") || tags.some((t) => ["rime", "apex", "daily", "gaming-mesa", "gaming-nvidia"].includes(t)))
    return { label: "edge", note: `Published to every image tag (${tags.filter((t) => !t.startsWith("platform-")).join(", ")}). All of them are the edge channel today.` };
  return { label: tags[0], note: `Published to ${tags.join(", ")}.` };
}
