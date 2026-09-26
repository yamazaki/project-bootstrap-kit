#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
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

  const sourcePath = writeFixture("source-path", exportContent({ confirmed: true, extra: "source: `docs/private/runbook.md`" }));
  assert(verifyFeedbackExport(sourcePath, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("outside Kit Target Map")), "source path outside target map is rejected");

  const missingTarget = writeFixture("missing-target", exportContent({ confirmed: true, target: "boilerplate/docs/DOES_NOT_EXIST.md" }));
  assert(verifyFeedbackExport(missingTarget, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("kit target does not exist")), "kit intake rejects missing target path");

  const traversalTarget = writeFixture("traversal-target", exportContent({ confirmed: true, target: "docs/../../etc/passwd" }));
  assert(verifyFeedbackExport(traversalTarget, { mode: "final", targetRoot: kitRoot }).failures.some((item) => item.includes("invalid kit target path")), "kit intake rejects target path traversal");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Feedback export verifier tests completed.");
