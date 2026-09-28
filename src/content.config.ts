// Typed content (spec §9.1): release notes, docs and journal live in version
// control; the human page and the machine-readable JSON are both generated
// from the same records.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// spec §8.3
const change = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  area: z.enum(["shell", "system", "security", "gaming", "agents", "developer"]),
  kind: z.enum(["new", "improved", "fixed", "security", "removed"]),
  title: z.string(),
  summary: z.string(),
  detail: z.string().nullish(),
  docs: z.string().nullish(),
  source: z.array(z.string().url()).default([]),
  breaking: z.boolean().default(false),
});

const updates = defineCollection({
  loader: glob({ pattern: "*/release.yaml", base: "./content/updates", generateId: ({ data }) => String(data.id) }),
  schema: z.object({
    schema: z.literal(1),
    id: z.string().regex(/^(\d{4}\.\d{2}\.\d{2}(\.\d+)?|apex-v\d+\.\d+\.\d+)$/),
    product: z.enum(["rime", "apex"]),
    name: z.string(),
    title: z.string(),
    date: z.coerce.date(),
    channels: z.array(z.string()).default([]),
    summary: z.string(),
    predecessor: z.string().nullable(),
    provenance: z.object({
      osRevision: z.string().regex(/^[0-9a-f]{7,40}$/),
      shellRevision: z.string().regex(/^[0-9a-f]{7,40}$/).nullable(),
      imageDigest: z.string().regex(/^sha256:[0-9a-f]{12,64}$/).nullable(),
      build: z.string().url().nullable(),
      iso: z.object({ name: z.string(), bytes: z.number(), sha256: z.string(), url: z.string().url() }).nullable().optional(),
      // Same source rebuilt later (the weekly cron): a new digest, not a new release.
      reissues: z.array(z.object({ digest: z.string(), build: z.string().url(), date: z.coerce.date(), note: z.string() })).default([]),
    }),
    highlights: z.array(z.string()).default([]),
    changes: z.array(change),
    knownIssues: z.array(z.object({ title: z.string(), summary: z.string(), source: z.array(z.string()).default([]) })).default([]),
    rollback: z.string().nullable().default(null),
    // ISO releases carry the published Requirements section.
    requirements: z.array(z.string()).optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(["Start", "Use", "Reference", "Troubleshooting"]),
    order: z.number().default(50),
    sources: z.array(z.string()).default([]),
    verified: z.string().optional(), // "rime-os@<sha>" the facts were checked against
  }),
});

const journal = defineCollection({
  loader: glob({ pattern: "*.md", base: "./content/journal" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    author: z.string().default("Andre Nijman"),
    sources: z.array(z.string()).default([]),
  }),
});

export const collections = { updates, docs, journal };
