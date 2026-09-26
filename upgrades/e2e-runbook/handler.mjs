import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Add E2E and device verification runbook policy to test and verification guidance",
    locations: [
      "Add short policy bullets under '5.2 テストと検証'",
      "Keep detailed runbook structure out of DEVELOPMENT_GUIDELINE.md",
    ],
  },
  {
    file: "docs/DOCUMENTATION.md",
    summary: "Add concrete E2E and device verification runbook operation rules",
    locations: [
      "Extend 'Runbook の扱い' with reusable verification runbook contents",
      "Document result recording in PLAN_PHASE_CURRENT and agent session logs",
    ],
  },
  {
    file: "docs/CODING_GUIDELINE.md",
    summary: "Add safety principles for verification scripts",
    locations: [
      "Add a '確認スクリプト' section if CODING_GUIDELINE.md exists",
      "Warn if CODING_GUIDELINE.md is missing",
    ],
  },
];

const DEVELOPMENT_BULLETS = `- ユニットテストやローカル結合テストだけでは受入確認が完結しない実装変更では、E2E / 実機確認の Runbook を作成する
- 外部サービス、実行環境、複数アプリケーション、実機デバイス、ネットワーク、資格情報、ACL などを含む確認は、可能な限り確認スクリプト化する
- Runbook と確認結果は、対象範囲に応じて \`WORK/x.y\` または \`REF_runbook-test_*\` として管理する`;

const DOCUMENTATION_BLOCK = `E2E / 実機確認 Runbook は、実装変更の受入確認を人間が再実行できる形にするための文書である。  
ユニットテストやローカル結合テストだけでは確認できない変更では、必要に応じて次の内容を含める。

- 確認目的
- 前提条件
- 環境準備
- 工程別の確認内容
- 期待ログ / 期待結果
- 失敗時の切り分け観点
- 確認スクリプトの実行方法

確認スクリプトを伴う場合でも、Runbook にはスクリプトを実行する目的、必要な前提、結果の読み方を記載する。  
確認結果は \`docs/PLAN_PHASE_CURRENT.md\` の進捗ログと \`docs/agent_sessions/session_*.md\` に記録する。`;

const CODING_SECTION = `## 11. 確認スクリプト

- 確認スクリプトは、恒久設定、Secrets、認証情報、ACL、デプロイ設定を暗黙に変更しない
- 実機、外部サービス、本番相当環境に影響する操作は、実行前に対象、影響、復旧方法を明示する
- 環境差分や資格情報は、コード内に埋め込まず、環境変数または明示的な env ファイルから受け取る
- 破壊的操作、再起動、サービス停止、データ削除を行う場合は、明示的なフラグや確認オプションを必須にする
- 失敗時は、原因切り分けに必要なログ、実行コマンド、確認対象、次に見るべき箇所を出力する
- 成功 / 失敗は \`[OK]\` / \`[NG]\` など、人間と機械の両方が読める形式で出力する
- 確認後に変更した一時状態は、可能な限り復旧する。復旧できない場合は、残った変更を明示する`;

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied e2e-runbook feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - updated E2E / 実機確認 Runbook guidance`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied e2e-runbook feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("updated E2E / 実機確認 Runbook guidance")) {
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

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "E2E / 実機確認の Runbook を作成する")) {
    if (content.includes("- 正常系、異常系、境界条件を確認する")) {
      content = content.replace(
        "- 正常系、異常系、境界条件を確認する",
        `- 正常系、異常系、境界条件を確認する\n${DEVELOPMENT_BULLETS}`
      );
    } else {
      content = `${content.trimEnd()}\n\n### E2E / 実機確認 Runbook\n\n${DEVELOPMENT_BULLETS}\n`;
    }
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchDocumentation(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "E2E / 実機確認 Runbook は、実装変更の受入確認を人間が再実行できる形にするための文書である")) {
    if (content.includes("- 継続運用で再利用する Runbook\n  - `REF`")) {
      content = content.replace(
        "- 継続運用で再利用する Runbook\n  - `REF`",
        `- 継続運用で再利用する Runbook\n  - \`REF\`\n\n${DOCUMENTATION_BLOCK}`
      );
    } else {
      content = `${content.trimEnd()}\n\n### E2E / 実機確認 Runbook\n\n${DOCUMENTATION_BLOCK}\n`;
    }
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchCodingGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "## 11. 確認スクリプト")) {
    if (content.includes("## 11. AI エージェントへの指示")) {
      content = content.replace("## 11. AI エージェントへの指示", `${CODING_SECTION}\n\n## 12. AI エージェントへの指示`);
    } else {
      content = `${content.trimEnd()}\n\n${CODING_SECTION}\n`;
    }
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function getStatus(targetRoot) {
  const results = [];
  const guidelineContent = readIfExists(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"));
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status: containsComparableText(guidelineContent, "E2E / 実機確認の Runbook を作成する") ? "SKIP(SAME)" : "UPDATE",
  });
  const documentationContent = readIfExists(path.join(targetRoot, "docs", "DOCUMENTATION.md"));
  results.push({
    label: "docs/DOCUMENTATION.md",
    status: containsComparableText(documentationContent, "確認スクリプトの実行方法") ? "SKIP(SAME)" : "UPDATE",
  });
  const codingPath = path.join(targetRoot, "docs", "CODING_GUIDELINE.md");
  const codingContent = readIfExists(codingPath);
  results.push({
    label: "docs/CODING_GUIDELINE.md",
    status: !fs.existsSync(codingPath)
      ? "WARN"
      : containsComparableText(codingContent, "## 11. 確認スクリプト")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const adoptionContent = readIfExists(path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: adoptionContent.includes("Applied e2e-runbook feature from project-bootstrap-kit") ? "SKIP(SAME)" : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx.targetRoot);
  console.log("");
  printSection("E2E Runbook Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}`);
  }
  const counts = {
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
    warn: diffResults.filter((item) => item.status === "WARN").length,
  };
  console.log("");
  console.log(`Result: ${counts.update} update, ${counts.same} skip(same), ${counts.warn} warn.`);
  printDryRunSummary([
    "1. WARN が出た場合は、必要に応じて先に coding-guideline feature を適用してください。",
    "2. UPDATE が出たファイルだけ反映対象として考えてください。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const patchResults = [
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"))],
    ["docs/CODING_GUIDELINE.md", patchCodingGuideline(path.join(ctx.targetRoot, "docs", "CODING_GUIDELINE.md"))],
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  console.log("");
  console.log("Result: e2e-runbook feature was applied.");
  printDryRunSummary([
    "1. docs/DEVELOPMENT_GUIDELINE.md と docs/DOCUMENTATION.md の追記位置を確認してください。",
    "2. docs/CODING_GUIDELINE.md が存在しない場合は、coding-guideline feature の適用を検討してください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に適用履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
