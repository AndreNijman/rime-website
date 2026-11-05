// What a release's image tags mean for a reader. Today every published tag is
// one digest, and rime-os's client reads them all as the edge channel
// (rimed/rimed-core/src/channel.rs): stable, candidate and beta do not exist yet.
// A release only the NixOS edition published lists that edition's channels
// (stable, candidate, beta, edge) instead of image tags.
export function channelOf(tags: string[], editions?: string[]): { label: string; note: string } {
  if (!tags.length) return { label: "installer", note: "Published as an installer ISO on GitHub." };
  if (editions?.length === 1 && editions[0] === "nixos")
    return { label: tags.includes("edge") ? "edge" : tags[0], note: `Published to the NixOS edition's ${tags.join(", ")} channel${tags.length > 1 ? "s" : ""}.` };
  if (tags.includes("edge") || tags.some((t) => ["rime", "apex", "daily", "gaming-mesa", "gaming-nvidia"].includes(t)))
    return { label: "edge", note: `Published to every image tag (${tags.filter((t) => !t.startsWith("platform-")).join(", ")}). All of them are the edge channel today.` };
  return { label: tags[0], note: `Published to ${tags.join(", ")}.` };
}
