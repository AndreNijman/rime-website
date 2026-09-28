import { allReleases, type Release } from "./releases";
import { SITE } from "../data/site";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = (r: Release) => `${SITE.url}/updates/${r.id}`;
const html = (r: Release) =>
  `<p>${esc(r.summary)}</p><ul>${r.changes.map((c) => `<li><strong>${esc(c.title)}</strong> — ${esc(c.summary)}</li>`).join("")}</ul>` +
  (r.knownIssues.length ? `<h3>Known issues</h3><ul>${r.knownIssues.map((k) => `<li>${esc(k.title)}: ${esc(k.summary)}</li>`).join("")}</ul>` : "");

export async function atom() {
  const all = await allReleases();
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Rime updates</title>
  <subtitle>Every Rime release, with what changed.</subtitle>
  <link href="${SITE.url}/updates/feed.xml" rel="self"/>
  <link href="${SITE.url}/updates"/>
  <id>${SITE.url}/updates</id>
  <updated>${all[0].date.toISOString()}</updated>
  <author><name>Rime</name></author>
${all.map((r) => `  <entry>
    <title>${esc(`${r.name}: ${r.title}`)}</title>
    <link href="${url(r)}"/>
    <id>${url(r)}</id>
    <updated>${r.date.toISOString()}</updated>
    <summary>${esc(r.summary)}</summary>
    <content type="html">${esc(html(r))}</content>
  </entry>`).join("\n")}
</feed>
`;
}

export async function rss() {
  const all = await allReleases();
  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Rime updates</title>
    <link>${SITE.url}/updates</link>
    <description>Every Rime release, with what changed.</description>
    <atom:link href="${SITE.url}/updates/rss.xml" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${all[0].date.toUTCString()}</lastBuildDate>
${all.map((r) => `    <item>
      <title>${esc(`${r.name}: ${r.title}`)}</title>
      <link>${url(r)}</link>
      <guid isPermaLink="true">${url(r)}</guid>
      <pubDate>${r.date.toUTCString()}</pubDate>
      <description>${esc(html(r))}</description>
    </item>`).join("\n")}
  </channel>
</rss>
`;
}

export async function jsonFeed() {
  const all = await allReleases();
  return JSON.stringify({
    version: "https://jsonfeed.org/version/1.1",
    title: "Rime updates",
    home_page_url: `${SITE.url}/updates`,
    feed_url: `${SITE.url}/updates/feed.json`,
    items: all.map((r) => ({ id: url(r), url: url(r), title: `${r.name}: ${r.title}`, summary: r.summary, content_html: html(r), date_published: r.date.toISOString() })),
  }, null, 2);
}
