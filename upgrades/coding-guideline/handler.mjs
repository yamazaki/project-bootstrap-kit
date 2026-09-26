import fs from "node:fs";
import path from "node:path";
import { containsComparableText, copyRecursive, nowTimestamp, printSection, printDryRunSummary } from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/CODING_GUIDELINE.md",
    summary: "Add semantic coding rules for safe and maintainable implementation",
    locations: ["Copy the coding guideline into docs/"],
  },
  {
    file: "AGENTS.md / docs/DEVELOPMENT_GUIDELINE.md / docs/INDEX.md",
    summary: "Add references to the coding guideline",
    locations: [
      "Make AGENTS read docs/CODING_GUIDELINE.md at session start",
      "Make DEVELOPMENT_GUIDELINE.md reference CODING_GUIDELINE.md as the source of truth for coding semantics",
      "Add CODING_GUIDELINE.md to INDEX.md",
    ],
  },
];

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied coding-guideline feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - docs/CODING_GUIDELINE.md`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied coding-guideline feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("docs/CODING_GUIDELINE.md")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${addedFilesBlock}\n`;
    });
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "docs/CODING_GUIDELINE.md")) {
    content = content.replace(
      "本リポジトリでは `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`、`docs/VERSIONING.md`、必要に応じて `docs/PLATFORM_GUIDELINE.md` を優先する",
      "本リポジトリでは `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/CODING_GUIDELINE.md`、`docs/DOCUMENTATION.md`、`docs/VERSIONING.md`、`docs/TECHNOLOGY/INDEX.md`、関連するTechnology Profileを優先する"
    );
    content = content.replace(
      "1. docs/INDEX.md\n   2. docs/DEVELOPMENT_GUIDELINE.md",
      "1. docs/INDEX.md\n   2. docs/DEVELOPMENT_GUIDELINE.md\n   3. docs/CODING_GUIDELINE.md"
    );
    content = content.replace(
      "3. docs/CODING_GUIDELINE.md\n   4. docs/DOCUMENTATION.md",
      "3. docs/CODING_GUIDELINE.md\n   4. docs/DOCUMENTATION.md"
    );
  }
  if (!containsComparableText(content, "コーディング上の判断では CODING_GUIDELINE")) {
    content = content.replace(
      "- 参照すべき `SPEC / ADR / REF / DOCUMENTATION / PLATFORM_GUIDELINE`\n- version が関係する変更では `VERSIONING`",
      "- 参照すべき `SPEC / ADR / REF / DOCUMENTATION / TECHNOLOGY`\n- コーディング上の判断では `CODING_GUIDELINE`\n- version が関係する変更では `VERSIONING`"
    );
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "コーディング上の意味論的な実装規約は docs/CODING_GUIDELINE.md を正本とする")) {
    content = content.replace(
      "- version 更新の判断、更新対象、更新手順は `docs/VERSIONING.md` を正本とする。",
      "- version 更新の判断、更新対象、更新手順は `docs/VERSIONING.md` を正本とする。\n- コーディング上の意味論的な実装規約は `docs/CODING_GUIDELINE.md` を正本とする。"
    );
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchIndex(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "CODING_GUIDELINE.md")) {
    content = content.replace(
      "- 開発ガイドライン: [DEVELOPMENT_GUIDELINE.md](./DEVELOPMENT_GUIDELINE.md)",
      "- 開発ガイドライン: [DEVELOPMENT_GUIDELINE.md](./DEVELOPMENT_GUIDELINE.md)\n- コーディングガイドライン: [CODING_GUIDELINE.md](./CODING_GUIDELINE.md)"
    );
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function getStatus(targetRoot) {
  const results = [];
  const codingPath = path.join(targetRoot, "docs", "CODING_GUIDELINE.md");
  results.push({ label: "docs/CODING_GUIDELINE.md", status: fs.existsSync(codingPath) ? "SKIP(SAME)" : "ADD" });
  const agentsContent = fs.existsSync(path.join(targetRoot, "AGENTS.md")) ? fs.readFileSync(path.join(targetRoot, "AGENTS.md"), "utf8") : "";
  results.push({ label: "AGENTS.md", status: containsComparableText(agentsContent, "docs/CODING_GUIDELINE.md") ? "SKIP(SAME)" : "UPDATE" });
  const guidelineContent = fs.existsSync(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md")) ? fs.readFileSync(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"), "utf8") : "";
  results.push({ label: "docs/DEVELOPMENT_GUIDELINE.md", status: containsComparableText(guidelineContent, "docs/CODING_GUIDELINE.md") ? "SKIP(SAME)" : "UPDATE" });
  const indexContent = fs.existsSync(path.join(targetRoot, "docs", "INDEX.md")) ? fs.readFileSync(path.join(targetRoot, "docs", "INDEX.md"), "utf8") : "";
  results.push({ label: "docs/INDEX.md", status: containsComparableText(indexContent, "CODING_GUIDELINE.md") ? "SKIP(SAME)" : "UPDATE" });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx.targetRoot);
  console.log("");
  printSection("Coding Guideline Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}`);
  }
  const counts = {
    add: diffResults.filter((item) => item.status === "ADD").length,
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
  };
  console.log("");
  console.log(`Result: ${counts.add} add, ${counts.update} update, ${counts.same} skip(same).`);
  printDryRunSummary([
    "1. UPDATE が出たファイルだけ反映対象として考えてください。",
    "2. すべて SKIP(SAME) なら、既にこの feature は組み込み済みです。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const docsSource = path.join(ctx.featureDir, "files", "docs");
  const codingGuidelinePath = path.join(ctx.targetRoot, "docs", "CODING_GUIDELINE.md");
  const codingGuidelineExisted = fs.existsSync(codingGuidelinePath);
  if (fs.existsSync(docsSource) && !codingGuidelineExisted) {
    copyRecursive(docsSource, path.join(ctx.targetRoot, "docs"));
  }
  const patchResults = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/INDEX.md", patchIndex(path.join(ctx.targetRoot, "docs", "INDEX.md"))],
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  console.log(`${codingGuidelineExisted ? "[SKIP(SAME)]" : "[APPLY]"} docs/CODING_GUIDELINE.md`);
  console.log("");
  console.log("Result: coding-guideline feature was applied.");
  printDryRunSummary([
    "1. docs/CODING_GUIDELINE.md を読み、対象プロジェクトの技術スタックに合わせて補足が必要か確認してください。",
    "2. 必須設定やフォールバックに関する既存実装を見直してください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に適用履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
