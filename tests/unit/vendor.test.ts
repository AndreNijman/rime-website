// The Shell files the site runs are the Shell's files: hash-pinned, unedited.
import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const SRC = JSON.parse(readFileSync("src/vendor/rime-shell/SOURCE.json", "utf8"));
const A = "// ── BEGIN VERBATIM ──\n", Z = "// ── END VERBATIM ──\n";
const verbatim = (t: string) => t.slice(t.indexOf(A) + A.length, t.lastIndexOf(Z));

test.each(Object.entries(SRC.files))("%s is byte-identical to rime-shell's", (path, rec: any) => {
  const base = path.split("/").pop();
  const text = verbatim(readFileSync(`src/vendor/rime-shell/${base}.raw.js`, "utf8"));
  expect(createHash("sha256").update(text).digest("hex")).toBe(rec.sha256);
});

test("generated motion tokens are current", () => {
  expect(() => execFileSync("node", ["scripts/gen-tokens.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
});
