#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyFeedbackExport } from "../boilerplate/skills/knowledge-feedback/scripts/feedback-export-verifier.mjs";

const kitRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "feedback-export-verifier-"));

function exportContent({ confirmed = false, target = "boilerplate/docs/DOCUMENTATION.md", extra = "" } = {}) {
  return `# project-bootstrap-kit Knowledge Feedback - Export

- Status: Export Candidate
- Feedback ID: verifier-test
- Source Project: redacted
- Source Phase / Milestone: generalized
- Created At: 2026-09-23
- Related Technology Profiles: none
- Evidence Level: implementation-validated

## 1. 概要
検査fixture。
## 2. 匿名化した発見時の文脈
匿名化済み。
## 3. 一般化した知識
再利用可能。
## 4. 成立条件
条件あり。
## 5. 適用しない条件 / 反例
反例あり。
## 6. 根拠概要
- E1: anonymous evidence
## 7. Kit Target Map
| Target | Required change |
| --- | --- |
| \`${target}\` | update |
## 8. Proposed Semantic Diff / Required Change
semantic change
## 9. Reproduction Steps
1. reproduce
## 10. Acceptance Criteria
- accepted
## 11. Redaction Exceptions / Rationale
- none
## 12. 変動しうる事実と公式一次確認先
- kit tree
## 13. export sanitization checklist
- [x] project / product / repository / organization names removed
- [x] customer / tenant / person identifiers removed
- [x] local paths and source document names removed
- [x] real service URLs and credentials removed
- [x] internal evidence map is not included
- [x] official source URLs are clearly distinguished from project URLs
## 14. ユーザー確認
- [${confirmed ? "x" : " "}] export内容をユーザーが確認した
${extra}
`;
}

function writeFixture(name, content) {
  const targetPath = path.join(tempRoot, `kit_feedback_export_20260923_${name}.md`);
  fs.writeFileSync(targetPath, content, "utf8");
  return targetPath;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[OK] ${message}`);
}

try {
  const pending = writeFixture("pending", exportContent());
  assert(verifyFeedbackExport(pending, { mode: "pre-review" }).failures.length === 0, "pre-review allows pending user confirmation");
  assert(verifyFeedbackExport(pending, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("ユーザー")), "final requires user confirmation");

  const approved = writeFixture("approved", exportContent({ confirmed: true }));
  assert(verifyFeedbackExport(approved, { mode: "final", targetRoot: kitRoot }).failures.length === 0, "final accepts approved reproducible export");

  const feedbackRoot = path.join(tempRoot, "docs", "project-bootstrap-kit-feedback");
  fs.mkdirSync(feedbackRoot, { recursive: true });
  const fixedExport = path.join(feedbackRoot, "kit_feedback_export_20260923_approved.md");
  fs.copyFileSync(approved, fixedExport);
  assert(verifyFeedbackExport(fixedExport, { mode: "final", targetRoot: kitRoot }).failures.length === 0,
    "fixed project feedback directory accepts an approved export");
  const fixedInternal = path.join(feedbackRoot, "kit_feedback_internal_20260923_approved.md");
  fs.writeFileSync(fixedInternal, "# Internal\n- Export Prohibited: Yes\n");
  assert(verifyFeedbackExport(fixedInternal, { mode: "final", targetRoot: kitRoot }).failures.length > 0,
    "sharing a directory does not allow internal feedback through export checks");

  const sourcePath = writeFixture("source-path", exportContent({ confirmed: true, extra: "source: `docs/private/runbook.md`" }));
  assert(verifyFeedbackExport(sourcePath, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("outside Kit Target Map")), "source path outside target map is rejected");

  const missingTarget = writeFixture("missing-target", exportContent({ confirmed: true, target: "boilerplate/docs/DOES_NOT_EXIST.md" }));
  assert(verifyFeedbackExport(missingTarget, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("kit target does not exist")), "kit intake rejects missing target path");

  const traversalTarget = writeFixture("traversal-target", exportContent({ confirmed: true, target: "docs/../../etc/passwd" }));
  assert(verifyFeedbackExport(traversalTarget, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("invalid kit target path")), "kit intake rejects target path traversal");
  // Exercise real bootstrap and the legacy capture feature in a disposable project.
  const fixtureKit = path.join(tempRoot, "kit");
  const inventory = spawnSync("git", ["-C", kitRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" });
  if (inventory.status !== 0) throw new Error(inventory.stderr);
  for (const relative of inventory.stdout.split("\0").filter(Boolean)) {
    const destination = path.join(fixtureKit, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(path.join(kitRoot, relative), destination);
  }
  for (const args of [["init", "-q", fixtureKit], ["-C", fixtureKit, "add", "."],
    ["-C", fixtureKit, "-c", "user.name=Kit Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture snapshot"]]) {
    const result = spawnSync("git", args, { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
  }
  function run(script, args) {
    const result = spawnSync(process.execPath, [path.join(fixtureKit, "scripts", script), ...args], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${script}: ${result.stdout}\n${result.stderr}`);
    return result.stdout;
  }
  const project = path.join(tempRoot, "capture-project");
  const gitInit = spawnSync("git", ["init", "-q", project], { encoding: "utf8" });
  if (gitInit.status !== 0) throw new Error(gitInit.stderr);
  run("init-project.mjs", ["--target", project, "--project-name", "Capture Fixture", "--project-slug", "capture-fixture", "--ai-surface", "both", "--technology-profile", "cloudflare-workers"]);
  const unmanaged = path.join(project, "docs", "WORK", "2.1");
  fs.mkdirSync(unmanaged, { recursive: true });
  const oldFeedback = path.join(unmanaged, "kit_feedback_internal_20260923_existing.md");
  fs.writeFileSync(oldFeedback, "# Existing internal evidence\nKeep this content and path.\n");
  const capture = path.join(project, "docs", "WORK", "inbox", "open", "capture_20260923_1200_existing.md");
  fs.writeFileSync(capture, "---\ntype: idea\nstatus: open\n---\nExisting project idea.\n");
  const marker = "CUSTOM PROJECT RULE: keep this sentence.";
  const inboxReadme = path.join(project, "docs", "WORK", "inbox", "README.md");
  fs.writeFileSync(inboxReadme, fs.readFileSync(inboxReadme, "utf8").split("`type` は")[0].trimEnd() + `\n\n${marker}\n`);
  for (const relative of ["AGENTS.md", "docs/DOCUMENTATION.md", "docs/DEVELOPMENT_GUIDELINE.md"]) {
    const file = path.join(project, relative);
    // Legacy classification plus a local rule inside the capture section.
    const heading = relative === "AGENTS.md" ? "### 4.6 capture inbox の運用"
      : relative.includes("DEVELOPMENT") ? "### 3.6 作業中の気づきの捕捉" : "### 4.5 capture inbox の扱い";
    let content = fs.readFileSync(file, "utf8");
    const start = content.indexOf(`${heading}\n`);
    const nextHeading = content.slice(start + heading.length + 1).search(/^#{1,3} /m);
    const end = nextHeading < 0 ? content.length : start + heading.length + 1 + nextHeading;
    const legacy = content.slice(start, end)
      .replace(/作業中にAIが再利用価値のある知見を得た場合[^\n]*\n\n[^\n]*\n\n/u, "")
      .replaceAll("次の 4 種", "次の 3 種")
      .replaceAll("type: idea | issue | question | learning", "type: idea | issue | question")
      .replaceAll("、`learning` のいずれか", " のいずれか")
      .replace(/- `learning`\n  - [^\n]*\n/u, "")
      .replace(`${heading}\n`, `${heading}\n\n${marker}\n`);
    fs.writeFileSync(file, (content.slice(0, start) + legacy + content.slice(end)).replaceAll("\n", "\r\n"));
  }
  const beforeDryRun = fs.readFileSync(path.join(project, "docs", "DOCUMENTATION.md"), "utf8");
  const featureArgs = ["--target", project, "--feature", "capture-inbox", "--ai-surface", "both"];
  const preview = run("upgrade-project.mjs", [...featureArgs, "--dry-run", "--diff", "--diff-output", path.join(tempRoot, "capture.diff")]);
  assert(/^\[UPDATE\]/mu.test(preview), "legacy capture classification is advertised as an update");
  assert(fs.readFileSync(path.join(project, "docs", "DOCUMENTATION.md"), "utf8") === beforeDryRun,
    "dry-run preserves project documentation");
  run("upgrade-project.mjs", [...featureArgs, "--apply"]);
  const afterApply = new Map();
  const updatedReadme = fs.readFileSync(inboxReadme, "utf8");
  assert(updatedReadme.includes(marker) && updatedReadme.includes("`learning`"), "inbox guidance adds lessons while keeping local content");
  afterApply.set("docs/WORK/inbox/README.md", updatedReadme);
  for (const relative of ["AGENTS.md", "docs/DOCUMENTATION.md", "docs/DEVELOPMENT_GUIDELINE.md"]) {
    const content = fs.readFileSync(path.join(project, relative), "utf8");
    assert(content.includes(marker), `${relative} keeps local project rules`);
    assert(!/(?<!\r)\n/u.test(content), `${relative} preserves Windows line endings`);
    assert(content.includes("learning") && !content.includes("次の 3 種"), `${relative} accepts lessons without the old restriction`);
    afterApply.set(relative, content);
  }
  run("upgrade-project.mjs", [...featureArgs, "--apply"]);
  for (const [relative, content] of afterApply) {
    assert(fs.readFileSync(path.join(project, relative), "utf8") === content, `${relative} is stable on rerun`);
  }
  const rerun = run("upgrade-project.mjs", [...featureArgs, "--dry-run"]);
  assert(!/^\[(?:UPDATE|WARN|ADD)\]/mu.test(rerun), `capture upgrade converges to SKIP(SAME)\n${rerun}`);
  const docPath = path.join(project, "docs", "DOCUMENTATION.md");
  fs.writeFileSync(docPath, fs.readFileSync(docPath, "utf8").replaceAll("docs/project-bootstrap-kit-feedback/", "docs/WORK/<phase>.<milestone>/"));
  const technologyArgs = ["--target", project, "--feature", "technology-profiles", "--ai-surface", "both", "--technology-profile", "cloudflare-workers"];
  // This handler supports stateless legacy adopters; stateful projects use reviewed plans.
  fs.rmSync(path.join(project, "docs/BOOTSTRAP_STATE.json"));
  run("upgrade-project.mjs", [...technologyArgs, "--dry-run", "--diff", "--diff-output", path.join(tempRoot, "feedback-location.diff")]);
  assert(fs.readFileSync(docPath, "utf8").includes("docs/WORK/<phase>.<milestone>/kit_feedback_"), "feedback location preview does not rewrite old guidance");
  run("upgrade-project.mjs", [...technologyArgs, "--apply"]);
  assert(!fs.readFileSync(docPath, "utf8").includes("docs/WORK/<phase>.<milestone>/kit_feedback_"), "existing feature updates feedback location guidance");
  const technologyDoc = fs.readFileSync(docPath, "utf8");
  run("upgrade-project.mjs", [...technologyArgs, "--apply"]);
  assert(fs.readFileSync(docPath, "utf8") === technologyDoc, "feedback location guidance is stable on rerun");
  assert(fs.readFileSync(oldFeedback, "utf8").includes("Keep this content and path"), "upgrade does not move or rewrite past feedback");
  assert(fs.readFileSync(capture, "utf8").includes("type: idea"), "upgrade does not reclassify existing captures");
  for (const surface of [".agents", ".claude"]) {
    assert(fs.readFileSync(path.join(project, surface, "skills", "knowledge-feedback", "SKILL.md"), "utf8").includes("docs/project-bootstrap-kit-feedback/"),
      `${surface} receives the fixed feedback location`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Feedback export verifier tests completed.");
