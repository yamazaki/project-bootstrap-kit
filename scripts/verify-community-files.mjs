#!/usr/bin/env node
import fs from "node:fs"; import path from "node:path";
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
function read(p) { return fs.readFileSync(path.join(root, p), "utf8"); }
function check(ok, message) { if (!ok) throw new Error(message); console.log(`[OK] ${message}`); }
const forms = fs.readdirSync(path.join(root, ".github/ISSUE_TEMPLATE")).filter((name) => name.endsWith(".yml") && name !== "config.yml").sort();
check(forms.length === 6, "six Issue Forms");
const catalog = JSON.parse(read("docs/community/github-labels.json"));
const labels = new Set(catalog.labels.map((item) => item.name));
check(labels.size === catalog.labels.length, "unique label catalog");
for (const name of forms) {
  const content = read(`.github/ISSUE_TEMPLATE/${name}`);
  for (const key of ["name:", "description:", "body:"]) check(content.includes(key), `${name} ${key}`);
  check(/type:\s*(?:input|textarea|dropdown|checkboxes)/u.test(content), `${name} accepts input`);
  check(/Secret|Security|private|非公開情報/u.test(content), `${name} privacy guidance`);
  const ids = [...content.matchAll(/^\s+id:\s*(\S+)\s*$/gmu)].map((match) => match[1]);
  check(new Set(ids).size === ids.length, `${name} unique ids`);
  for (const match of (content.match(/^labels:\s*\[([^\]]+)\]/mu)?.[1] ?? "").matchAll(/"([^"]+)"/gu)) check(labels.has(match[1]), `${name} known label ${match[1]}`);
}
check(/blank_issues_enabled:\s*false/u.test(read(".github/ISSUE_TEMPLATE/config.yml")), "blank Issues disabled");
for (const phrase of ["MIT License", "AI", "third-party", "respectful"]) check(read("CONTRIBUTING.md").includes(phrase), `CONTRIBUTING ${phrase}`);
for (const phrase of ["Report a vulnerability", "best effort", "SLA", "public Issue"]) check(read("SECURITY.md").includes(phrase), `SECURITY ${phrase}`);
check(!fs.existsSync(path.join(root, "CODE_OF_CONDUCT.md")), "formal Code of Conduct intentionally absent");
console.log("Community file verification completed.");
