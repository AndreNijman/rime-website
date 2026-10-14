// /llms.txt: a plain-text map of the site for language-model crawlers and
// coding agents. Whether any assistant uses it for citations is unproven; it is
// cheap, built from the same records as the pages, and costs nothing to keep.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE } from "../data/site";
import { latestRelease } from "../lib/releases";

export const GET: APIRoute = async () => {
  const docs = (await getCollection("docs")).sort((a, b) => a.data.order - b.data.order);
  const journal = (await getCollection("journal")).sort((a, b) => +b.data.date - +a.data.date);
  const latest = await latestRelease();
  const link = (title: string, path: string, note: string) => `- [${title}](${SITE.url}${path}): ${note}`;
  const out = [
    `# ${SITE.name}`,
    "",
    `> ${SITE.description}`,
    "",
    "Rime is a Linux operating system and desktop, open source under the MIT licence. This site is its product page, documentation and release record. Every release page states what changed, what is known to be wrong and exactly what was built.",
    "",
    "## Start here",
    link("Why Rime", "/why", "what Rime puts together, how it compares with Fedora Atomic, Universal Blue, NixOS, Ubuntu and CachyOS, and where it is still young"),
    link("Download", "/download", "the network installer, requirements, checksums and how to verify them"),
    link("Install", "/docs/install", "write the installer to a USB stick and install"),
    "",
    "## Product",
    link("System", "/system", "image-based updates, rollback, packages, recovery"),
    link("Rime Shell", "/shell", "the desktop"),
    link("Agents", "/agents", "sandboxed coding-agent sessions"),
    link("Personalise", "/personalise", "colours derived from the wallpaper"),
    link("Security", "/security", "signed images, Secure Boot, disk encryption, reporting a vulnerability"),
    "",
    "## Docs",
    ...docs.map((d) => link(d.data.title, `/docs/${d.id}`, d.data.description)),
    "",
    "## Releases",
    ...(latest ? [link(`${latest.name}: ${latest.title}`, `/updates/${latest.id}`, "the latest release")] : []),
    link("All releases", "/updates", "every release; feeds at /updates/feed.xml, /updates/rss.xml and /updates/feed.json"),
    "",
    "## Optional",
    ...journal.map((j) => link(j.data.title, `/journal/${j.id}`, j.data.description)),
    link("Source", "/source", "repositories and licences"),
    link("Privacy", "/privacy", "what this site stores and what a Rime install contacts"),
    `- [rime-os on GitHub](${SITE.repos.os}): the image, the rime command, the installer`,
    `- [rime-shell on GitHub](${SITE.repos.shell}): the Quickshell desktop`,
    "",
  ].join("\n");
  return new Response(out, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
