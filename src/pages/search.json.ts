// The site-search index, built with the site and fetched on first use by the
// LENS_REVEAL search (src/scripts/search.ts). Static; queries never leave the page.
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { allReleases } from "../lib/releases";
const PAGES = [
  { title: "Rime", url: "/", text: "A Linux desktop that moves as one. Fluid shell, image-based system, colours from your wallpaper.", tags: "home overview" },
  { title: "Rime Shell", url: "/shell", text: "The frame, the Dashboard, Rime Search, the right panel, notifications, settings (the Nexus), the lock screen, motion families, Reduce Motion.", tags: "desktop bar notch dashboard launcher lock screen password shapes nexus settings" },
  { title: "System", url: "/system", text: "Image-based updates with bootc, signature checks, rollback, channels, packages as system extensions, Flatpak, capsules, recovery, sessions, gaming, lid.", tags: "update rollback bootc packages flatpak sysext recovery gaming kernel lid" },
  { title: "Personalise", url: "/personalise", text: "Wallpaper to palette with matugen; what follows the wallpaper; light or dark; contrast rules.", tags: "colour color wallpaper matugen theme dark light palette" },
  { title: "Security", url: "/security", text: "Signed images with cosign, update verification, Secure Boot, disk encryption, agent sandbox, reporting a vulnerability.", tags: "signature cosign secure boot luks tpm vulnerability report" },
  { title: "Download", url: "/download", text: "Network installer ISO, requirements, SHA-256, verifying the download, installing, known hardware notes, the first-update step.", tags: "iso usb installer requirements sha256 checksum" },
  { title: "Updates", url: "/updates", text: "Every release with what changed, known issues, provenance and feeds.", tags: "release notes changelog feed rss atom" },
  { title: "Privacy", url: "/privacy", text: "No accounts, trackers or analytics; what this site stores in your browser; what Rime contacts.", tags: "privacy telemetry analytics cookies" },
  { title: "Source", url: "/source", text: "Repositories, licences, third-party code, how this site is built from the Shell's own files.", tags: "github licence license mit apache" },
  { title: "Brand", url: "/brand", text: "The name, the mark, and why there is no brand colour.", tags: "logo mark name" },
  { title: "Journal", url: "/journal", text: "Engineering notes.", tags: "blog posts" },
];
export const GET: APIRoute = async () => {
  const docs = await getCollection("docs");
  const journal = await getCollection("journal");
  const releases = await allReleases();
  const strip = (s: string) => s.replace(/```[\s\S]*?```/g, " ").replace(/[#*_`>|\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1600);
  const out = [
    ...PAGES.map((p) => ({ k: "Page", ...p })),
    ...docs.map((d) => ({ k: "Docs", title: d.data.title, url: `/docs/${d.id}`, text: `${d.data.description} ${strip(d.body ?? "")}`, tags: d.data.section })),
    ...releases.map((r) => ({ k: "Updates", title: `${r.name}: ${r.title}`, url: `/updates/${r.id}`, text: `${r.summary} ${r.changes.map((c) => c.title).join(". ")}`, tags: r.changes.map((c) => c.area).join(" ") })),
    ...journal.map((j) => ({ k: "Journal", title: j.data.title, url: `/journal/${j.id}`, text: `${j.data.description} ${strip(j.body ?? "")}`, tags: "" })),
  ];
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
