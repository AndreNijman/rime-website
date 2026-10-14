// Structured data (schema.org JSON-LD) for every page. One @graph per page:
// the site-wide Organization and WebSite nodes, a BreadcrumbList, and whatever
// the page itself is (SoftwareApplication, TechArticle, ...). Only facts this
// site already states on the page go in; nothing here is a claim of its own.
import { SITE, sectionFor } from "../data/site";

const ORG = `${SITE.url}/#organization`;
const SITE_ID = `${SITE.url}/#website`;
const abs = (p: string) => (p.startsWith("http") ? p : SITE.url + p);

export type Node = Record<string, unknown>;

export const organization = (): Node => ({
  "@type": "Organization",
  "@id": ORG,
  name: SITE.name,
  url: SITE.url + "/",
  logo: { "@type": "ImageObject", url: `${SITE.url}/apple-touch-icon.png`, width: 180, height: 180 },
  description: SITE.description,
  sameAs: [SITE.repos.os, SITE.repos.shell],
});

export const website = (): Node => ({
  "@type": "WebSite",
  "@id": SITE_ID,
  url: SITE.url + "/",
  name: SITE.name,
  description: SITE.description,
  inLanguage: "en",
  publisher: { "@id": ORG },
});

/** Home > section > page, from the path. The last item is the page itself. */
export function breadcrumbs(path: string, title: string): Node | null {
  if (path === "/") return null;
  const items: { name: string; url: string }[] = [{ name: "Rime", url: SITE.url + "/" }];
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 1) {
    const top = "/" + parts[0];
    items.push({ name: sectionFor(top), url: SITE.url + top });
  }
  items.push({ name: title, url: SITE.url + path });
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export function webPage(url: string, name: string, description: string, type = "WebPage"): Node {
  return { "@type": type, "@id": `${url}#page`, url, name, description, inLanguage: "en", isPartOf: { "@id": SITE_ID }, publisher: { "@id": ORG } };
}

export const article = (o: {
  url: string; headline: string; description: string; type?: "TechArticle" | "BlogPosting" | "Article";
  datePublished?: Date; dateModified?: Date; author?: string; image?: string;
}): Node => ({
  "@type": o.type ?? "TechArticle",
  "@id": `${o.url}#article`,
  mainEntityOfPage: o.url,
  url: o.url,
  headline: o.headline,
  description: o.description,
  inLanguage: "en",
  ...(o.datePublished && { datePublished: o.datePublished.toISOString() }),
  ...((o.dateModified ?? o.datePublished) && { dateModified: (o.dateModified ?? o.datePublished)!.toISOString() }),
  author: o.author && o.author !== SITE.name ? { "@type": "Person", name: o.author } : { "@id": ORG },
  publisher: { "@id": ORG },
  ...(o.image && { image: abs(o.image) }),
});

/** Rime itself, for the home and download pages. */
export const software = (o: {
  version?: string; downloadUrl?: string; fileSize?: number; datePublished?: string; releaseNotes?: string;
}): Node => ({
  "@type": "SoftwareApplication",
  "@id": `${SITE.url}/#software`,
  name: "Rime",
  alternateName: "Rime OS",
  url: SITE.url + "/",
  description: SITE.description,
  applicationCategory: "OperatingSystem",
  operatingSystem: "Linux (x86_64)",
  isAccessibleForFree: true,
  license: "https://opensource.org/license/mit",
  codeRepository: SITE.repos.os,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@id": ORG },
  publisher: { "@id": ORG },
  ...(o.version && { softwareVersion: o.version }),
  ...(o.downloadUrl && { downloadUrl: o.downloadUrl }),
  ...(o.fileSize && { fileSize: `${Math.round(o.fileSize / 1e6)} MB` }),
  ...(o.datePublished && { datePublished: o.datePublished }),
  ...(o.releaseNotes && { releaseNotes: o.releaseNotes }),
});

export function graph(nodes: (Node | null | undefined)[]): string {
  const g = { "@context": "https://schema.org", "@graph": [organization(), website(), ...nodes.filter(Boolean)] };
  // "<" is escaped so no string in the data can close the script element.
  return JSON.stringify(g).replace(/</g, "\\u003c");
}
