#!/usr/bin/env node
import fs from "node:fs";

const allowed = new Set(["question", "bug", "documentation", "feature", "project-model", "technology-profile"]);
const inputPath = process.argv[2];
if (!inputPath) throw new Error("Usage: prepare-feedback.mjs <input.json>");
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (input.type === "security") throw new Error("Security details must use the private route in SECURITY.md");
if (!allowed.has(input.type)) throw new Error("Unsupported feedback type");
for (const field of ["title", "kitVersion", "projectModel", "aiSurface", "summary"]) {
  if (typeof input[field] !== "string" || !input[field].trim()) throw new Error(`Missing field: ${field}`);
}
const payload = JSON.stringify(input);
const checks = [
  [/(?:gh[pousr]_|xox[baprs]-)[A-Za-z0-9_-]{10,}/u, "credential"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/u, "private-key"],
  [/(?:\/Users\/|[A-Za-z]:\\Users\\)/u, "local-path"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/iu, "email"],
  [/https?:\/\/(?:localhost|127\.0\.0\.1|10\.|192\.168\.)/iu, "private-url"],
];
for (const [pattern, label] of checks) if (pattern.test(payload)) throw new Error(`Privacy check failed: ${label}`);

const lines = [
  `# ${input.title.trim()}`,
  "",
  `- Report type: ${input.type}`,
  `- Kit version: ${input.kitVersion.trim()}`,
  `- Project Model: ${input.projectModel.trim()}`,
  `- AI surface: ${input.aiSurface.trim()}`,
  "",
  "## Summary", "", input.summary.trim(),
];
for (const [key, heading] of [["expected", "Expected"], ["actual", "Actual"], ["reproduction", "Reproduction"], ["proposal", "Proposal"]]) {
  if (typeof input[key] === "string" && input[key].trim()) lines.push("", `## ${heading}`, "", input[key].trim());
}
lines.push("", "## Submission", "", "- External action: not performed", "- Owner review required before submission", "");
process.stdout.write(lines.join("\n"));
