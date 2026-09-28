// Site-wide facts and navigation (spec §4.2). Pages link by these; nothing
// else hard-codes a repository URL.
export const SITE = {
  name: "Rime",
  domain: "rimeos.com",
  url: "https://rimeos.com",
  tagline: "A Linux desktop that moves as one.",
  description:
    "Rime is a Linux desktop and operating system: a fluid shell coloured by your wallpaper, on an image-based system that updates in one piece and can always go back.",
  repos: {
    os: "https://github.com/AndreNijman/rime-os",
    shell: "https://github.com/AndreNijman/rime-shell",
  },
  // The OS and Shell revisions this site's product claims were checked against.
  pinned: { os: "2d9c5438a", shell: "6289d1f8" },
  // Spec §6.4: the Agents page ships only when the product does.
  agentsPublished: false,
};

export type NavItem = { label: string; href: string; note?: string };
export type NavGroup = { label: string; href: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Rime", href: "/",
    items: [
      { label: "Overview", href: "/" },
      { label: "What Rime is for", href: "/#principles" },
      { label: "Journal", href: "/journal" },
    ],
  },
  {
    label: "Shell", href: "/shell",
    items: [
      { label: "The frame", href: "/shell#frame" },
      { label: "Dashboard", href: "/shell#dashboard" },
      { label: "Right panel", href: "/shell#right" },
      { label: "Settings", href: "/shell#nexus" },
      { label: "Notifications", href: "/shell#notifications" },
      { label: "Lock screen", href: "/shell#lock" },
      { label: "Motion", href: "/shell#motion" },
    ],
  },
  {
    label: "System", href: "/system",
    items: [
      { label: "Updates", href: "/system#updates" },
      { label: "Rollback", href: "/system#rollback" },
      { label: "Packages", href: "/system#packages" },
      { label: "Recovery", href: "/system#recovery" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    label: "Personalise", href: "/personalise",
    items: [
      { label: "Wallpaper to palette", href: "/personalise#palette" },
      { label: "What follows the wallpaper", href: "/personalise#follows" },
      { label: "Accessibility", href: "/personalise#accessibility" },
    ],
  },
  {
    label: "Updates", href: "/updates",
    items: [
      { label: "All releases", href: "/updates" },
      { label: "Latest", href: "/updates/latest" },
      { label: "Feeds", href: "/updates#feeds" },
    ],
  },
  {
    label: "Docs", href: "/docs",
    items: [
      { label: "Install", href: "/docs/install" },
      { label: "Updating", href: "/docs/updating" },
      { label: "Rolling back", href: "/docs/rollback" },
      { label: "Recovery", href: "/docs/recovery" },
    ],
  },
  {
    label: "Download", href: "/download",
    items: [
      { label: "Installer", href: "/download" },
      { label: "Requirements", href: "/download#requirements" },
      { label: "Verify", href: "/download#verify" },
    ],
  },
];

export const FOOTER: NavItem[][] = [
  [
    { label: "Download", href: "/download" },
    { label: "Docs", href: "/docs" },
    { label: "Updates", href: "/updates" },
    { label: "Journal", href: "/journal" },
  ],
  [
    { label: "Source", href: "/source" },
    { label: "Security", href: "/security" },
    { label: "Privacy", href: "/privacy" },
    { label: "Brand", href: "/brand" },
  ],
];

/** The section label the frame's centre notch shows for a path. */
export function sectionFor(path: string): string {
  const p = path.replace(/\.html$/, "").replace(/\/index$/, "").replace(/\/$/, "") || "/";
  if (p === "/") return "Overview";
  const top = "/" + p.split("/")[1];
  const map: Record<string, string> = {
    "/shell": "Shell", "/system": "System", "/personalise": "Personalise", "/security": "Security",
    "/download": "Download", "/install": "Install", "/docs": "Docs", "/updates": "Updates",
    "/journal": "Journal", "/source": "Source", "/privacy": "Privacy", "/brand": "Brand", "/sitemap": "Site map",
  };
  return map[top] ?? "Rime";
}
