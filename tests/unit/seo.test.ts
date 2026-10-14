// Search and AI-crawler basics, checked against the BUILT site (dist/):
// canonical, robots meta, parseable JSON-LD, crawler policy, llms.txt.
import { test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { graph, breadcrumbs, software } from "../../src/lib/seo";

const read = (p: string) => readFileSync(`dist/${p}`, "utf8");
const built = existsSync("dist/index.html");
const ld = (html: string): any => JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)![1]);

test("graph escapes '<' so data cannot close the script element", () => {
  expect(graph([{ "@type": "Thing", name: "</script><b>" }])).not.toContain("</script>");
});
test("breadcrumbs: none on home, section then page below it", () => {
  expect(breadcrumbs("/", "Rime")).toBeNull();
  const b: any = breadcrumbs("/docs/install", "Install Rime");
  expect(b.itemListElement.map((i: any) => i.name)).toEqual(["Rime", "Docs", "Install Rime"]);
});
test("software node states only what it is given", () => {
  const s: any = software({});
  expect(s.downloadUrl).toBeUndefined();
  expect(s.license).toContain("mit");
});

describe_built();
function describe_built() {
  const t = built ? test : test.skip;
  t("home, download, a doc and a release carry canonical, robots meta and JSON-LD", () => {
    for (const [file, url, type] of [
      ["index.html", "https://rimeos.com/", "SoftwareApplication"],
      ["download.html", "https://rimeos.com/download", "SoftwareApplication"],
      ["docs/install.html", "https://rimeos.com/docs/install", "TechArticle"],
    ] as const) {
      const html = read(file);
      expect(html).toContain(`<link rel="canonical" href="${url}"`);
      expect(html).toMatch(/name="robots" content="index,follow,max-image-preview:large/);
      expect(html).toContain('name="twitter:title"');
      const types = ld(html)["@graph"].map((n: any) => n["@type"]);
      expect(types).toEqual(expect.arrayContaining(["Organization", "WebSite", type]));
    }
  });
  t("download JSON-LD points at the published installer", () => {
    const sw = ld(read("download.html"))["@graph"].find((n: any) => n["@type"] === "SoftwareApplication");
    expect(sw.downloadUrl).toMatch(/^https:\/\/github\.com\/AndreNijman\/rime-os\/releases\/download\/.+\.iso$/);
  });
  t("robots.txt lets the AI search bots in and repeats the one disallow in every group", () => {
    const r = read("robots.txt");
    for (const bot of ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot", "GPTBot", "ClaudeBot"]) expect(r).toContain(`User-agent: ${bot}`);
    const groups = r.split(/\n\s*\n/).filter((g) => /User-agent:/.test(g));
    for (const g of groups) { expect(g).toContain("Disallow: /updates/latest"); expect(g).not.toMatch(/Disallow: \/\s*$/m); }
    expect(r).toContain("Sitemap: https://rimeos.com/sitemap-index.xml");
  });
  t("llms.txt starts with the name and a summary and links only to this site's pages that exist", () => {
    const l = read("llms.txt");
    expect(l).toMatch(/^# Rime\n\n> /);
    for (const [, path] of l.matchAll(/\]\(https:\/\/rimeos\.com(\/[^)]*)\)/g)) {
      const f = path === "/" ? "index.html" : `${path.slice(1)}.html`;
      expect(existsSync(`dist/${f}`), path).toBe(true);
    }
  });
  t("a noindex page carries no JSON-LD", () => {
    const html = read("404.html");
    expect(html).toContain('content="noindex"');
    expect(html).not.toContain("application/ld+json");
  });
}
