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
    file: "AGENTS.md",
    summary: "Prevent AI agents from marking WBS tasks complete before user review and acceptance",
    locations: [
      "Add task completion gate bullets under progress management",
      "Clarify PLAN_PHASE_CURRENT and chat_resume_prompt updates during interruption",
    ],
  },
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Define WBS task completion as post-review and post-acceptance state",
    locations: [
      "Add a WBS task completion judgment section under project planning",
      "Clarify E2E / device verification Runbook preparation as part of implementation work",
    ],
  },
  {
    file: "docs/PLAN_PHASE_CURRENT.md",
    summary: "Clarify that [x] means user-accepted completion, not AI implementation completion",
    locations: [
      "Add status note under WBS state legend",
      "Add completion criteria for review and E2E / device verification",
    ],
  },
  {
    file: "docs/DOCUMENTATION.md",
    summary: "Clarify Runbook handling before WBS completion",
    locations: [
      "Add E2E / device verification waiting-state rule near Runbook handling",
    ],
  },
];

const AGENTS_PROGRESS_BULLETS = `- AI の作業実施が終わっただけでは、WBS タスクを完了扱いにしない
- WBS タスクの作業を開始する際は、最初に \`docs/PLAN_PHASE_CURRENT.md\` の対象タスクを \`[>]\` に変更する
- ユーザー確認、必要な E2E / 実機確認、最終レビューが残っている場合、\`docs/PLAN_PHASE_CURRENT.md\` の対象タスクは \`[>]\` のまま維持する
- 実装を伴う変更で E2E / 実機確認が必要な場合は、Runbook と確認スクリプトの準備までを当該タスクの作業範囲に含める
- \`[x]\` への変更と次回再開プロンプトの確定更新は、ユーザーがレビュー完了または受入完了を明示した後に行う`;

const AGENTS_PRECHECK_BULLET = "- ユーザー承認後、作業開始前に `docs/PLAN_PHASE_CURRENT.md` の対象 WBS タスクを `[>]` に変更すること";
const AGENTS_PLAN_BULLET = "- レビュー待ち、E2E / 実機確認待ち、ユーザー受入待ちのタスクは `[x]` に変更せず、進捗ログに確認待ちとして記録する";
const AGENTS_RESUME_BULLET = "- タスク完了後の次回プロンプトとして確定するのは、ユーザー受入後に限る";

const DEVELOPMENT_COMPLETION_SECTION = `### 3.4 WBS タスクの完了判定

WBS タスクの \`[x]\` は、AI の作業実施が終わった時点ではなく、ユーザー確認と必要な受入確認が完了した時点で付与する。

- AI が WBS タスクの作業を開始する場合、ユーザー承認後、実作業に入る前に \`PLAN_PHASE_CURRENT.md\` の対象タスクを \`[>]\` に変更する
- AI が実装、文書更新、自己確認を終えた段階では、対象タスクは原則として \`[>]\` のまま維持する
- ユーザーのレビュー、E2E / 実機確認、受入判断が残っている場合は、進捗ログに「確認待ち」として記録する
- 実装を伴う変更で E2E / 実機確認が必要な場合は、Runbook と確認スクリプトの準備までを当該タスクの作業範囲に含める
- 修正が発生した場合は、実装、検証準備、ユーザー確認、最終レビューのサイクルを繰り返す
- \`[x]\` への変更、完了済み成果物としての記録、次回再開プロンプトの確定更新は、ユーザーがレビュー完了または受入完了を明示した後に行う`;

const DEVELOPMENT_E2E_BULLET = "- E2E / 実機確認が必要なタスクでは、Runbook と確認スクリプトの準備完了をもって AI 側の作業完了とし、人間による確認結果を受けるまでは WBS を `[x]` にしない";
const DEVELOPMENT_PRECHECK_BULLET = "- ユーザー承認後、作業開始前に対象 WBS を `[>]` に更新する";

const PLAN_WBS_NOTE = "作業開始時は、AI が実作業に入る前に対象タスクを `[>]` に変更する。\n`[x]` は、AI の作業実施だけでなく、ユーザー確認、必要な E2E / 実機確認、最終レビューが完了した後に付与する。\nレビュー待ち、受入確認待ち、E2E / 実機確認待ちのタスクは `[>]` のまま維持し、進捗ログに確認待ちとして記録する。";

const PLAN_COMPLETION_BULLETS = `- WBS タスクの \`[x]\` は、ユーザーのレビュー完了または受入完了が明示された後に反映する
- E2E / 実機確認が必要なタスクでは、Runbook、確認スクリプト、確認結果、最終レビュー結果が揃っていることを完了条件に含める`;

const DOCUMENTATION_BLOCK = `E2E / 実機確認が必要な WBS タスクでは、Runbook と確認スクリプトの準備が AI 側の作業範囲に含まれる。  
人間による確認またはレビューが残っている間は、対象 WBS を \`[x]\` にせず、確認待ちとして記録する。`;

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function writeIfChanged(targetPath, original, content) {
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied task-completion-gate feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - updated WBS task completion gate guidance`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied task-completion-gate feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("updated WBS task completion gate guidance")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${addedFilesBlock}\n`;
    });
  }
  return writeIfChanged(targetPath, original, content);
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "AI の作業実施が終わっただけでは、WBS タスクを完了扱いにしない")) {
    if (content.includes("- 発見した課題や仕様差分を即座に共有する")) {
      content = content.replace(
        "- 発見した課題や仕様差分を即座に共有する",
        `- 発見した課題や仕様差分を即座に共有する\n${AGENTS_PROGRESS_BULLETS}`
      );
    } else {
      content = `${content.trimEnd()}\n\n### WBS タスク完了判定\n\n${AGENTS_PROGRESS_BULLETS}\n`;
    }
  }
  if (!containsComparableText(content, "WBS タスクの作業を開始する際は、最初に `docs/PLAN_PHASE_CURRENT.md` の対象タスクを `[>]` に変更する")) {
    if (content.includes("- AI の作業実施が終わっただけでは、WBS タスクを完了扱いにしない")) {
      content = content.replace(
        "- AI の作業実施が終わっただけでは、WBS タスクを完了扱いにしない",
        "- AI の作業実施が終わっただけでは、WBS タスクを完了扱いにしない\n- WBS タスクの作業を開始する際は、最初に `docs/PLAN_PHASE_CURRENT.md` の対象タスクを `[>]` に変更する"
      );
    }
  }
  if (
    !containsComparableText(content, AGENTS_PRECHECK_BULLET)
    && !containsComparableText(content, "Epicでは、ユーザー承認後、作業開始前に docs/PLAN_PHASE_CURRENT.md の対象WBSタスクを [>] に変更する")
  ) {
    if (content.includes("- 確定操作を行う前に、ユーザーの明示的な承認を取得すること")) {
      content = content.replace(
        "- 確定操作を行う前に、ユーザーの明示的な承認を取得すること",
        `- 確定操作を行う前に、ユーザーの明示的な承認を取得すること\n${AGENTS_PRECHECK_BULLET}`
      );
    }
  }
  if (!containsComparableText(content, AGENTS_PLAN_BULLET)) {
    if (content.includes("- `docs/PLAN_PHASE_CURRENT.md` の進捗を必要に応じて反映する")) {
      content = content.replace(
        "- `docs/PLAN_PHASE_CURRENT.md` の進捗を必要に応じて反映する",
        `- \`docs/PLAN_PHASE_CURRENT.md\` の進捗を必要に応じて反映する\n   ${AGENTS_PLAN_BULLET}`
      );
    }
  }
  if (!containsComparableText(content, AGENTS_RESUME_BULLET)) {
    const resumePromptLinePattern = /^(\s*)- `docs\/agent_sessions\/chat_resume_prompt\.md`\s*$/m;
    if (resumePromptLinePattern.test(content)) {
      content = content.replace(
        resumePromptLinePattern,
        `$1- \`docs/agent_sessions/chat_resume_prompt.md\`\n$1${AGENTS_RESUME_BULLET}`
      );
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "WBS タスクの `[x]` は、AI の作業実施が終わった時点ではなく、ユーザー確認と必要な受入確認が完了した時点で付与する")) {
    if (content.includes("## 4. 設計ガイドライン")) {
      content = content.replace("## 4. 設計ガイドライン", `${DEVELOPMENT_COMPLETION_SECTION}\n\n## 4. 設計ガイドライン`);
    } else {
      content = `${content.trimEnd()}\n\n${DEVELOPMENT_COMPLETION_SECTION}\n`;
    }
  }
  if (!containsComparableText(content, "AI が WBS タスクの作業を開始する場合、ユーザー承認後、実作業に入る前に `PLAN_PHASE_CURRENT.md` の対象タスクを `[>]` に変更する")) {
    if (content.includes("WBS タスクの `[x]` は、AI の作業実施が終わった時点ではなく、ユーザー確認と必要な受入確認が完了した時点で付与する。")) {
      content = content.replace(
        "WBS タスクの `[x]` は、AI の作業実施が終わった時点ではなく、ユーザー確認と必要な受入確認が完了した時点で付与する。",
        "WBS タスクの `[x]` は、AI の作業実施が終わった時点ではなく、ユーザー確認と必要な受入確認が完了した時点で付与する。\n\n- AI が WBS タスクの作業を開始する場合、ユーザー承認後、実作業に入る前に `PLAN_PHASE_CURRENT.md` の対象タスクを `[>]` に変更する"
      );
    }
  }
  if (!containsComparableText(content, DEVELOPMENT_PRECHECK_BULLET)) {
    if (content.includes("- 対象 WBS と完了条件を明確にする")) {
      content = content.replace(
        "- 対象 WBS と完了条件を明確にする",
        `- 対象 WBS と完了条件を明確にする\n${DEVELOPMENT_PRECHECK_BULLET}`
      );
    }
  }
  if (!containsComparableText(content, DEVELOPMENT_E2E_BULLET)) {
    if (content.includes("- Runbook と確認結果は、対象範囲に応じて `WORK/x.y` または `REF_runbook-test_*` として管理する")) {
      content = content.replace(
        "- Runbook と確認結果は、対象範囲に応じて `WORK/x.y` または `REF_runbook-test_*` として管理する",
        `- Runbook と確認結果は、対象範囲に応じて \`WORK/x.y\` または \`REF_runbook-test_*\` として管理する\n${DEVELOPMENT_E2E_BULLET}`
      );
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchPlanCurrent(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, PLAN_WBS_NOTE)) {
    const wbsStatusPattern = /(## \d+\. WBS（作業分解構造）\n\n状態: `\[ \]`=未着手, `\[>]`=進行中, `\[x]`=完了\n)/;
    if (wbsStatusPattern.test(content)) {
      content = content.replace(wbsStatusPattern, `$1\n${PLAN_WBS_NOTE}\n`);
    } else if (content.includes("## 4. WBS（作業分解構造）")) {
      content = content.replace("## 4. WBS（作業分解構造）", `## 4. WBS（作業分解構造）\n\n${PLAN_WBS_NOTE}`);
    }
  }
  if (!containsComparableText(content, "ユーザーのレビュー完了または受入完了が明示された後に反映する")) {
    if (content.includes("- このフェーズが完了とみなせる条件")) {
      content = content.replace("- このフェーズが完了とみなせる条件", `- このフェーズが完了とみなせる条件\n${PLAN_COMPLETION_BULLETS}`);
    } else if (content.includes("## 6. 完了の定義")) {
      content = content.replace("## 6. 完了の定義", `## 6. 完了の定義\n\n${PLAN_COMPLETION_BULLETS}`);
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchDocumentation(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "E2E / 実機確認が必要な WBS タスクでは、Runbook と確認スクリプトの準備が AI 側の作業範囲に含まれる")) {
    if (content.includes("確認結果は `docs/PLAN_PHASE_CURRENT.md` の進捗ログと `docs/agent_sessions/session_*.md` に記録する。")) {
      content = content.replace(
        "確認結果は `docs/PLAN_PHASE_CURRENT.md` の進捗ログと `docs/agent_sessions/session_*.md` に記録する。",
        `確認結果は \`docs/PLAN_PHASE_CURRENT.md\` の進捗ログと \`docs/agent_sessions/session_*.md\` に記録する。\n${DOCUMENTATION_BLOCK}`
      );
    } else {
      content = `${content.trimEnd()}\n\n### WBS タスク完了前の Runbook 扱い\n\n${DOCUMENTATION_BLOCK}\n`;
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function getStatus(targetRoot) {
  const results = [];
  const agentsContent = readIfExists(path.join(targetRoot, "AGENTS.md"));
  results.push({
    label: "AGENTS.md",
    status:
      containsComparableText(agentsContent, "AI の作業実施が終わっただけでは、WBS タスクを完了扱いにしない") &&
      containsComparableText(agentsContent, "WBS タスクの作業を開始する際は、最初に `docs/PLAN_PHASE_CURRENT.md` の対象タスクを `[>]` に変更する") &&
      (
        containsComparableText(agentsContent, AGENTS_PRECHECK_BULLET)
        || containsComparableText(agentsContent, "Epicでは、ユーザー承認後、作業開始前に docs/PLAN_PHASE_CURRENT.md の対象WBSタスクを [>] に変更する")
      )
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const guidelineContent = readIfExists(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"));
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status:
      containsComparableText(guidelineContent, "WBS タスクの `[x]` は、AI の作業実施が終わった時点ではなく") &&
      containsComparableText(guidelineContent, "AI が WBS タスクの作業を開始する場合、ユーザー承認後、実作業に入る前に `PLAN_PHASE_CURRENT.md` の対象タスクを `[>]` に変更する") &&
      containsComparableText(guidelineContent, DEVELOPMENT_PRECHECK_BULLET) &&
      containsComparableText(guidelineContent, "Runbook と確認スクリプトの準備までを当該タスクの作業範囲に含める")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const planContent = readIfExists(path.join(targetRoot, "docs", "PLAN_PHASE_CURRENT.md"));
  results.push({
    label: "docs/PLAN_PHASE_CURRENT.md",
    status:
      containsComparableText(planContent, "作業開始時は、AI が実作業に入る前に対象タスクを `[>]` に変更する") &&
      containsComparableText(planContent, "[x] は、AI の作業実施だけでなく、ユーザー確認") &&
      containsComparableText(planContent, "ユーザーのレビュー完了または受入完了が明示された後に反映する")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const documentationContent = readIfExists(path.join(targetRoot, "docs", "DOCUMENTATION.md"));
  results.push({
    label: "docs/DOCUMENTATION.md",
    status: containsComparableText(documentationContent, "人間による確認またはレビューが残っている間は、対象 WBS を `[x]` にせず") ? "SKIP(SAME)" : "UPDATE",
  });
  const adoptionContent = readIfExists(path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: adoptionContent.includes("Applied task-completion-gate feature from project-bootstrap-kit") ? "SKIP(SAME)" : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx.targetRoot);
  console.log("");
  printSection("Task Completion Gate Diff");
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
    ["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"))],
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  console.log("");
  console.log("Result: task-completion-gate feature was applied.");
  printDryRunSummary([
    "1. docs/PLAN_PHASE_CURRENT.md の WBS 状態表記が運用に合っているか確認してください。",
    "2. E2E / 実機確認が必要なタスクでは、Runbook と確認スクリプトの準備を完了条件に含めてください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に適用履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
