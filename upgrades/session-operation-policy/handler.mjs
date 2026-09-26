import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  nowTimestamp,
  printSection,
  printDryRunSummary,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/PLAN_PHASE_CURRENT.md",
    summary: "Add a session operation policy section before WBS",
    locations: [
      "Insert a new 'セッション運用方針' section after '主要マイルストーン'",
      "Include sample writing for basic principles, recommended session grouping, and operational judgment",
    ],
  },
  {
    file: "AGENTS.md / docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Add references to phase-level session granularity guidance",
    locations: [
      "Make AGENTS check PLAN_PHASE_CURRENT session policy at session start",
      "Explain the session-splitting criteria in DEVELOPMENT_GUIDELINE.md",
    ],
  },
];

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied session-operation-policy feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - updated docs/PLAN_PHASE_CURRENT.md session policy section`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied session-operation-policy feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("updated docs/PLAN_PHASE_CURRENT.md session policy section")) {
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
  if (!containsComparableText(content, "docs/PLAN_PHASE_CURRENT.md にセッション運用方針がある場合は、その粒度方針に従う")) {
    content = content.replace(
      "- `docs/agent_sessions/chat_resume_prompt.md` が存在する場合は確認する",
      "- `docs/agent_sessions/chat_resume_prompt.md` が存在する場合は確認する\n   - `docs/PLAN_PHASE_CURRENT.md` にセッション運用方針がある場合は、その粒度方針に従う"
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
  const replacement = `### 3.2 セッション運用方針

必要に応じて、\`PLAN_PHASE_CURRENT.md\` の中に「セッション運用方針」を設け、そのフェーズにおいてどの粒度で AI との会話セッションを区切ると実装精度が最適化されるかを明記する。

特に次のようなケースでは、セッション粒度を明示することを推奨する。

- 前提として共有すべき背景、仕様、制約が大きく切り替わる場合
- 期待する成果物の種類が変わる場合
  - 例: 要件整理から設計、設計から実装、実装から検証
- UI / Interaction の設計と実装を分離したい場合
- 重い WBS を複数セッションへ分割する場合
- 仕様整理と実装を意図的に分ける場合

### 3.3 WBS ナンバリング規約`;
  if (!content.includes("前提として共有すべき背景、仕様、制約が大きく切り替わる場合")) {
    content = content.replace(/### 3\.2 セッション運用方針[\s\S]*?### 3\.3 WBS ナンバリング規約/, replacement);
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchPlanCurrent(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!content.includes("## 3. セッション運用方針")) {
    const section = `## 3. セッション運用方針

記述例:

### 3.1 基本原則

- 同じ前提、同じ用語、同じ schema を共有するタスクは同一セッションに束ねる
- 成果物の種類が大きく切り替わる地点でセッションを切る
  - 例: 要件整理 -> 設計
  - 例: 設計 -> 実装 / 検証
- 話題が広がりすぎて前提管理が難しくなる場合は、マイルストーン内でも分ける

### 3.2 本フェーズの推奨セッション粒度

- \`x.1.01\`
  - 単独セッション
  - 理由: 単独で前提を確定するタスクのため
- \`x.1.02\` + \`x.1.03\`
  - 同一セッション
  - 理由: 前提と成果物を強く共有するため

### 3.3 運用上の判断

- セッションを切るか迷った場合は、「前提の共有量」と「成果物の種類の変化」を優先判断基準とする

---

## 4. WBS（作業分解構造）`;
    content = content.replace(/## 3\. WBS（作業分解構造）/, section);
    content = content.replace(/## 4\. 技術的詳細と制約/g, "## 5. 技術的詳細と制約");
    content = content.replace(/## 5\. 完了の定義/g, "## 6. 完了の定義");
    content = content.replace(/## 6\. リスクと未解決事項/g, "## 7. リスクと未解決事項");
    content = content.replace(/## 7\. 成果物/g, "## 8. 成果物");
    content = content.replace(/## 8\. 進捗ログ/g, "## 9. 進捗ログ");
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function getStatus(targetRoot) {
  const results = [];
  const agentsContent = fs.existsSync(path.join(targetRoot, "AGENTS.md"))
    ? fs.readFileSync(path.join(targetRoot, "AGENTS.md"), "utf8")
    : "";
  results.push({
    label: "AGENTS.md",
    status: containsComparableText(
      agentsContent,
      "docs/PLAN_PHASE_CURRENT.md にセッション運用方針がある場合は、その粒度方針に従う"
    )
      ? "SKIP(SAME)"
      : "UPDATE",
  });
  const guidelineContent = fs.existsSync(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))
    ? fs.readFileSync(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"), "utf8")
    : "";
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status:
      containsComparableText(guidelineContent, "前提として共有すべき背景、仕様、制約が大きく切り替わる場合") &&
      containsComparableText(guidelineContent, "期待する成果物の種類が変わる場合")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const planContent = fs.existsSync(path.join(targetRoot, "docs", "PLAN_PHASE_CURRENT.md"))
    ? fs.readFileSync(path.join(targetRoot, "docs", "PLAN_PHASE_CURRENT.md"), "utf8")
    : "";
  results.push({
    label: "docs/PLAN_PHASE_CURRENT.md",
    status:
      containsComparableText(planContent, "## 3. セッション運用方針") &&
      containsComparableText(planContent, "### 3.2 本フェーズの推奨セッション粒度") &&
      containsComparableText(planContent, "前提の共有量") &&
      containsComparableText(planContent, "成果物の種類の変化")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const adoptionContent = fs.existsSync(path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))
    ? fs.readFileSync(path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), "utf8")
    : "";
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: adoptionContent.includes("Applied session-operation-policy feature from project-bootstrap-kit")
      ? "SKIP(SAME)"
      : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx.targetRoot);
  console.log("");
  printSection("Policy Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}`);
  }
  const counts = {
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
  };
  console.log("");
  console.log(`Result: ${counts.update} update, ${counts.same} skip(same).`);
  printDryRunSummary([
    "1. UPDATE が出たファイルだけ反映対象として考えてください。",
    "2. すべて SKIP(SAME) なら、既にこの feature は組み込み済みです。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const patchResults = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/PLAN_PHASE_CURRENT.md", patchPlanCurrent(path.join(ctx.targetRoot, "docs", "PLAN_PHASE_CURRENT.md"))],
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  console.log("");
  console.log("Result: session-operation-policy feature was applied.");
  printDryRunSummary([
    "1. docs/PLAN_PHASE_CURRENT.md のセッション運用方針を、対象フェーズに合わせて具体化してください。",
    "2. WBS とセッション粒度の関係が自然か確認してください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に適用履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
