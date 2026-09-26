import fs from "node:fs";
import path from "node:path";
import {
  ensureDir,
  normalizeComparableText,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/WORK/0.1/",
    summary: "Rename initial planning documents as persistent project documents",
    locations: [
      "Rename *_template.md files without changing filled document content",
      "Remove the Template suffix from each document title",
      "Preserve both files and report WARN when old and new names conflict",
    ],
  },
  {
    file: "docs/PLAN_PHASE_CURRENT.md",
    summary: "Use the current phase plan as the single source of truth for WBS",
    locations: [
      "Remove an untouched wbs_breakdown_template.md",
      "Preserve an edited WBS draft and report WARN for manual incorporation",
      "Remove known references to the obsolete WBS draft document",
    ],
  },
  {
    file: ".agents/skills/project-bootstrap/SKILL.md or .claude/skills/project-bootstrap/SKILL.md",
    summary: "Align project-bootstrap output destinations with the persistent documents",
    locations: [
      "Write non-functional findings to docs/WORK/0.1/product_definition.md",
      "Create WBS directly in docs/PLAN_PHASE_CURRENT.md",
    ],
  },
];

const RENAMES = [
  ["idea_template.md", "idea.md", "# Idea Template", "# Idea"],
  ["product_definition_template.md", "product_definition.md", "# Product Definition Template", "# Product Definition"],
  ["interaction_design_template.md", "interaction_design.md", "# Interaction Design Template", "# Interaction Design"],
  ["phase_definition_template.md", "phase_definition.md", "# Phase Definition Template", "# Phase Definition"],
  ["roadmap_template.md", "roadmap.md", "# Roadmap Template", "# Roadmap Draft"],
];

const LEGACY_WBS = `# WBS Breakdown Template

- Status: Draft
- Scope: Milestone
- Source of Truth: No
- Owner: Engineering
- Owner WBS: x.y
- Promotion Target: Retain-in-Work
- Supersedes: N/A

## 1. 対象フェーズ
## 2. 対象マイルストーン
## 3. 目標
## 4. 完了条件
## 5. WBS
- \`x.y.01\`:
- \`x.y.02\`:
- \`x.y.03\`:
## 6. 依存関係
## 7. 先に解くべき不確実性
`;

const REFERENCE_RENAMES = new Map(RENAMES.map(([oldName, newName]) => [oldName, newName]));
const REFERENCE_TARGETS = [
  "AGENTS.md",
  "docs/DEVELOPMENT_GUIDELINE.md",
  "docs/DOCUMENTATION.md",
  "docs/WORK/0.1/README.md",
  ".agents/skills/project-bootstrap/SKILL.md",
  ".claude/skills/project-bootstrap/SKILL.md",
];

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function transformedDocument(content, oldTitle, newTitle) {
  return content.replace(oldTitle, newTitle);
}

function sameContent(left, right) {
  return normalizeComparableText(left) === normalizeComparableText(right);
}

function renameStatus(workDir, rename) {
  const [oldName, newName, oldTitle, newTitle] = rename;
  const oldPath = path.join(workDir, oldName);
  const newPath = path.join(workDir, newName);
  const oldExists = fs.existsSync(oldPath);
  const newExists = fs.existsSync(newPath);
  if (!oldExists) return { label: `${oldName} -> ${newName}`, status: "SKIP(SAME)" };
  if (!newExists) return { label: `${oldName} -> ${newName}`, status: "RENAME" };
  const transformed = transformedDocument(readIfExists(oldPath), oldTitle, newTitle);
  return {
    label: `${oldName} -> ${newName}`,
    status: sameContent(transformed, readIfExists(newPath)) ? "DELETE(OLD)" : "WARN",
  };
}

function wbsStatus(workDir) {
  const oldPath = path.join(workDir, "wbs_breakdown_template.md");
  const unexpectedNewPath = path.join(workDir, "wbs_breakdown.md");
  if (fs.existsSync(unexpectedNewPath)) {
    return { label: "wbs_breakdown.md", status: "WARN" };
  }
  if (!fs.existsSync(oldPath)) {
    return { label: "wbs_breakdown_template.md", status: "SKIP(SAME)" };
  }
  return {
    label: "wbs_breakdown_template.md",
    status: sameContent(readIfExists(oldPath), LEGACY_WBS) ? "DELETE" : "WARN",
  };
}

function patchReferences(content, relativePath) {
  let updated = content;
  for (const [oldName, newName] of REFERENCE_RENAMES) {
    updated = updated.replaceAll(oldName, newName);
  }
  updated = updated
    .split("\n")
    .filter((line) => !line.includes("wbs_breakdown_template.md"))
    .join("\n")
    .replaceAll("推奨テンプレート", "初期構想文書")
    .replaceAll("各テンプレートの役割", "各文書の役割")
    .replace("| テンプレート | 役割 | 主な内容 |", "| 文書 | 役割 | 主な内容 |");

  if (
    relativePath === "docs/WORK/0.1/README.md"
    && !updated.includes("WBS は別の下書き文書を作らず")
  ) {
    updated = updated.replace(
      "標準フロー:",
      "WBS は別の下書き文書を作らず、`docs/PLAN_PHASE_CURRENT.md` を正本として直接作成・更新する。\n\n標準フロー:"
    );
  }
  if (
    relativePath === "docs/DOCUMENTATION.md"
    && !updated.includes("WBS は初期構想用の別文書を作らず")
  ) {
    updated = updated.replace(
      "### 7.3 開発成熟度とフェーズ",
      "WBS は初期構想用の別文書を作らず、`docs/PLAN_PHASE_CURRENT.md` を正本として直接作成・更新する。\n\n### 7.3 開発成熟度とフェーズ"
    );
  }
  if (relativePath.endsWith("skills/project-bootstrap/SKILL.md")) {
    if (!updated.includes("出力先: `docs/WORK/0.1/product_definition.md` の「セキュリティ」")) {
      updated = updated.replace(
        "### 5. 非機能要件の発見\n\n",
        "### 5. 非機能要件の発見\n\n出力先: `docs/WORK/0.1/product_definition.md` の「セキュリティ」「性能・負荷」「コスト」「運用・可用性・復旧」\n\n"
      );
    }
    if (!updated.includes("WBS は別の下書き文書を作らず")) {
      updated = updated.replace(
        "要求、未決事項、技術検証、非機能要件からフェーズと WBS を導く。",
        "WBS は別の下書き文書を作らず `docs/PLAN_PHASE_CURRENT.md` に直接作成する。\n\n要求、未決事項、技術検証、非機能要件からフェーズと WBS を導く。"
      );
    }
  }
  return updated;
}

function referenceStatuses(targetRoot) {
  const results = [];
  for (const relativePath of REFERENCE_TARGETS) {
    const targetPath = path.join(targetRoot, relativePath);
    if (!fs.existsSync(targetPath)) continue;
    const content = readIfExists(targetPath);
    results.push({
      label: relativePath,
      status: patchReferences(content, relativePath) === content ? "SKIP(SAME)" : "UPDATE",
    });
  }
  return results;
}

function patchBootstrapAdoption(targetPath, changedPaths) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  if (original.includes("Applied initial-planning-document-names feature from project-bootstrap-kit")) {
    return false;
  }
  const timestamp = nowTimestamp();
  const historyEntry = `  - ${timestamp}: Applied initial-planning-document-names feature from project-bootstrap-kit`;
  const filesEntry = [
    `  - ${timestamp}`,
    ...changedPaths.map((item) => `    - ${item}`),
  ].join("\n");
  let content = original;
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${historyEntry}\n`;
  } else {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, body, next) => {
      return `- Upgrade History:\n${body.replace(/\n+$/, "")}\n${historyEntry}${next}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${filesEntry}\n`;
  } else {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, body) => {
      return `- Upgrade Added Files:\n${body.replace(/\n+$/, "")}\n${filesEntry}\n`;
    });
  }
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function getStatus(ctx) {
  const workDir = path.join(ctx.targetRoot, "docs", "WORK", "0.1");
  const results = RENAMES.map((rename) => renameStatus(workDir, rename));
  results.push(wbsStatus(workDir));
  results.push(...referenceStatuses(ctx.targetRoot));
  const adoption = readIfExists(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: adoption.includes("Applied initial-planning-document-names feature from project-bootstrap-kit")
      ? "SKIP(SAME)"
      : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const results = getStatus(ctx);
  console.log("");
  printSection("Initial Planning Document Name Diff");
  for (const item of results) console.log(`[${item.status}] ${item.label}`);
  const count = (status) => results.filter((item) => item.status === status).length;
  console.log("");
  console.log(
    `Result: ${count("RENAME")} rename, ${count("UPDATE")} update, ${count("DELETE") + count("DELETE(OLD)")} delete, ${count("SKIP(SAME)")} skip(same), ${count("WARN")} warn.`
  );
  printDryRunSummary([
    "1. WARN がある場合は、競合文書または記入済み WBS 下書きを手作業で確認してください。",
    "2. --diff の削除・追加内容を確認してください。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const workDir = path.join(ctx.targetRoot, "docs", "WORK", "0.1");
  ensureDir(workDir);
  const results = [];
  const changedPaths = [];

  for (const rename of RENAMES) {
    const [oldName, newName, oldTitle, newTitle] = rename;
    const status = renameStatus(workDir, rename).status;
    const oldPath = path.join(workDir, oldName);
    const newPath = path.join(workDir, newName);
    if (status === "RENAME") {
      const content = transformedDocument(readIfExists(oldPath), oldTitle, newTitle);
      fs.writeFileSync(newPath, content, "utf8");
      fs.rmSync(oldPath);
      changedPaths.push(`docs/WORK/0.1/${newName}`);
    } else if (status === "DELETE(OLD)") {
      fs.rmSync(oldPath);
    }
    results.push({ label: `${oldName} -> ${newName}`, status });
  }

  const wbs = wbsStatus(workDir);
  if (wbs.status === "DELETE") {
    fs.rmSync(path.join(workDir, "wbs_breakdown_template.md"));
  }
  results.push(wbs);

  for (const relativePath of REFERENCE_TARGETS) {
    const targetPath = path.join(ctx.targetRoot, relativePath);
    if (!fs.existsSync(targetPath)) continue;
    const original = readIfExists(targetPath);
    const updated = patchReferences(original, relativePath);
    if (updated !== original) {
      fs.writeFileSync(targetPath, updated, "utf8");
      results.push({ label: relativePath, status: "UPDATE" });
      changedPaths.push(relativePath);
    } else {
      results.push({ label: relativePath, status: "SKIP(SAME)" });
    }
  }

  const adoptionPath = path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  const adoptionChanged = patchBootstrapAdoption(adoptionPath, [...new Set(changedPaths)]);
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: adoptionChanged ? "UPDATE" : "SKIP(SAME)",
  });

  console.log("");
  printSection("Apply Result");
  for (const item of results) console.log(`[${item.status}] ${item.label}`);
  console.log("");
  console.log("Result: initial-planning-document-names feature was applied.");
  printDryRunSummary([
    "1. WARN が残った文書は削除されていません。内容を比較して手作業で統合してください。",
    "2. 記入済み WBS 下書きがある場合は docs/PLAN_PHASE_CURRENT.md へ必要事項を反映してください。",
    "3. 再度 dry-run し、WARN 以外が SKIP(SAME) になることを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
