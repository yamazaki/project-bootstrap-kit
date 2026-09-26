import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  copyRecursive,
  ensureDir,
  getSkillTargets,
  hashDirectory,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Add the standard phase transition process",
    locations: [
      "Add '3.5 フェーズ移行プロセス' after WBS task completion judgment",
      "Standardize close, inventory, next phase planning, carry-over review, and session updates",
    ],
  },
  {
    file: "docs/DOCUMENTATION.md",
    summary: "Add phase transition document placement and inventory rules",
    locations: [
      "Add phase transition document placement rules",
      "Add carry-over ledger requirements and promotion judgment",
      "Add phase transition inventory checks",
    ],
  },
  {
    file: "AGENTS.md",
    summary: "Add mandatory phase transition actions for AI agents",
    locations: [
      "Add a phase transition section after document inventory",
      "Add phase-transition to the skill list",
    ],
  },
  {
    file: ".agents/skills/phase-transition/ or .claude/skills/phase-transition/",
    summary: "Add the phase-transition skill to the selected AI surface",
    locations: [
      "Copy boilerplate/skills/phase-transition to the selected AI surface",
      "Add phase-transition to the skill README when present",
    ],
  },
];

const DEVELOPMENT_SECTION = `### 3.5 フェーズ移行プロセス

フェーズを終了し、次フェーズを開始する場合は、単に \`PLAN_PHASE_CURRENT.md\` を差し替えるのではなく、次の順で実施する。

1. 現行フェーズのクローズ
   - \`PLAN_PHASE_CURRENT.md\` の目標、IN / OUT スコープ、完了条件、進捗ログを確認する
   - 全 WBS の完了状態と、ユーザー受入、E2E / 実機確認、最終レビューの有無を確認する
   - 完了要件を満たしていない項目は、未完了、後続フェーズ送り、またはスコープ外として明示する
2. 成果物と見送り事項の棚卸し
   - \`docs/WORK/<phase>.*\`、関連 \`SPEC / ADR / REF / Runbook / session\` を確認する
   - \`promote\`、\`retain-in-work\`、\`delete\` のいずれかに分類する
   - 次フェーズ以降へ送る事項は、再検討タイミング、送り先、再検討観点を持つ台帳として残す
3. 次フェーズ計画の作成
   - \`ROADMAP.md\` を更新し、完了フェーズ、現在フェーズ、将来フェーズの位置づけを合わせる
   - 完了した \`PLAN_PHASE_CURRENT.md\` を \`docs/history/PLAN_PHASE_<phase>_<yyyymmdd>.md\` として退避する
   - 新しい \`PLAN_PHASE_CURRENT.md\` に、目標、IN / OUT、マイルストーン、セッション運用方針、WBS、横断制約、完了条件、リスク、成果物、進捗ログを定義する
4. 反映漏れレビュー
   - 前フェーズの成果物、Runbook、未解決事項、次フェーズ引き継ぎ文書を、次フェーズ WBS と突き合わせる
   - 次フェーズで実施するもの、さらに後続フェーズへ送るもの、長期バックログへ置くものを再分類する
   - 発見した漏れは \`PLAN_PHASE_CURRENT.md\` または適切な \`WORK\` 文書へ反映する
5. セッション情報の更新
   - \`docs/agent_sessions/session_yyyymmdd_nn.md\` にクローズ結果、計画更新、棚卸し、反映漏れレビューを記録する
   - \`docs/agent_sessions/chat_resume_prompt.md\` に、次に着手する WBS、前提文書、注意点を更新する

フェーズ移行時の \`PLAN_PHASE_CURRENT.md\` の「技術的詳細と制約」は、WBS ごとの詳細設計を網羅する場所ではない。フェーズ全体にまたがる前提、横断制約、後戻りが大きい判断を置き、WBS ごとの詳細設計、API contract、Runbook、判断材料は \`docs/WORK/<phase>.<milestone>/\` に分ける。

フェーズ移行作業が完了したと判断するには、少なくとも次を満たす必要がある。

- 現行フェーズのクローズ判定が文書化されている
- 完了済み計画が \`docs/history/\` に退避されている
- \`ROADMAP.md\` と \`PLAN_PHASE_CURRENT.md\` のフェーズ状態が一致している
- 次フェーズ WBS が、前フェーズ成果物から導かれる引き継ぎ事項を反映している
- 後続フェーズへ送った事項が、後で再検討できる台帳または同等の文書に残っている
- セッション記録と再開プロンプトが更新されている`;

const DOCUMENTATION_PHASE_DOCS = `### 4.4 フェーズ移行文書の扱い

フェーズ終了と次フェーズ計画を行う場合、次の文書を必要に応じて作成または更新する。

| 文書 | 配置 | 役割 |
| --- | --- | --- |
| フェーズクローズ文書 | \`docs/WORK/<last-phase>.<last-milestone>/\` | 完了要件、抜け漏れ、文書棚卸し、未解決事項を整理する |
| 完了済み計画の履歴 | \`docs/history/PLAN_PHASE_<phase>_<yyyymmdd>.md\` | 完了した \`PLAN_PHASE_CURRENT.md\` を履歴として保存する |
| 次フェーズ計画 | \`docs/PLAN_PHASE_CURRENT.md\` | 現在フェーズの WBS と進捗を管理する |
| 反映漏れレビュー | \`docs/WORK/<last-phase>.<last-milestone>/\` | 前フェーズ成果物から次フェーズ WBS への反映漏れを確認する |
| 見送り事項台帳 | \`docs/WORK/<last-phase>.<last-milestone>/\` または \`docs/REF/\` | 後続フェーズへ送る事項を、再検討タイミング付きで残す |
| セッション記録 | \`docs/agent_sessions/\` | 実施作業、決定事項、棚卸し、次アクションを残す |

見送り事項台帳は、後続フェーズ計画時に再確認するための文書である。単なるメモではなく、少なくとも次を含める。

- 見送り事項
- 現在の送り先
- 再検討タイミング
- 再検討観点
- 根拠文書

見送り事項台帳は、単一フェーズに閉じる場合は \`WORK\` に置く。複数フェーズで継続的に使うことが確認できた場合は、\`REF_catalog_*\` として昇格を検討する。`;

const DOCUMENTATION_INVENTORY = `### 6.4 フェーズ移行時の棚卸し

フェーズ移行時は、通常の文書棚卸しに加えて、次を確認する。

- 前フェーズの \`WORK\` 文書に、次フェーズへ反映すべき論点が残っていないか
- Runbook の OUT / 未確認事項が、次フェーズ WBS または見送り事項台帳に反映されているか
- \`ROADMAP.md\` の将来フェーズや長期バックログへ送った項目が、再検討可能な形で残っているか
- \`SPEC / ADR / REF\` へ昇格すべき安定事項がないか
- 完了済み \`PLAN_PHASE_CURRENT.md\` が \`history\` に退避されているか`;

const AGENTS_SECTION = `### 4.5 フェーズ移行時の処理

フェーズ終了と次フェーズ開始を扱う場合は、\`docs/DEVELOPMENT_GUIDELINE.md\` のフェーズ移行プロセスに従う。

必ず実施すること:

1. 現行フェーズの抜け漏れチェックと完了要件確認
2. フェーズクローズ文書の作成
3. 文書棚卸し
4. 未解決事項と後続フェーズ送り論点の整理
5. 完了済み \`PLAN_PHASE_CURRENT.md\` の \`docs/history/\` 退避
6. \`ROADMAP.md\` と新しい \`PLAN_PHASE_CURRENT.md\` の更新
7. 前フェーズ成果物から次フェーズ WBS への反映漏れレビュー
8. 後続フェーズへ送る見送り事項の再検討台帳化
9. セッション記録と再開プロンプトの更新

反映漏れレビューでは、前フェーズの \`WORK\` 文書、Runbook、未解決事項、引き継ぎ文書を読み、次フェーズで実施するもの、さらに後続へ送るもの、長期バックログへ残すものを明示的に再分類する。

見送り事項は、後続フェーズ計画時に忘れず再検討できるよう、再検討タイミング、再検討観点、根拠文書を持つ台帳として残す。`;

const AGENTS_SKILL_ENTRY = `- \`skills/phase-transition/\`
  - フェーズ終了、クローズ、次フェーズ計画、WBS 作成、見送り事項台帳化を補助する`;

const SKILL_README_ENTRY = "- `phase-transition`: フェーズ終了、クローズ、次フェーズ計画、WBS 作成、見送り事項台帳化を補助する。";

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function writeIfChanged(targetPath, original, content) {
  if (content === original) return false;
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchBootstrapAdoption(targetPath, addedSkillTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied phase-transition feature from project-bootstrap-kit`;
  const addedFilesBlock = [
    `  - ${timestamp}`,
    `    - updated phase transition guidance`,
    ...addedSkillTargets.map((item) => `    - ${item}`),
  ].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied phase-transition feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("Applied phase-transition feature") && !content.includes("phase-transition/")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${addedFilesBlock}\n`;
    });
  }
  return writeIfChanged(targetPath, original, content);
}

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "### 3.5 フェーズ移行プロセス")) {
    if (content.includes("## 4. 設計ガイドライン")) {
      content = content.replace("## 4. 設計ガイドライン", `${DEVELOPMENT_SECTION}\n\n## 4. 設計ガイドライン`);
    } else {
      content = `${content.trimEnd()}\n\n${DEVELOPMENT_SECTION}\n`;
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchDocumentation(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "### 4.4 フェーズ移行文書の扱い")) {
    if (content.includes("## 5. 文書タイプと REF の命名規則")) {
      content = content.replace("## 5. 文書タイプと REF の命名規則", `${DOCUMENTATION_PHASE_DOCS}\n\n## 5. 文書タイプと REF の命名規則`);
    } else {
      content = `${content.trimEnd()}\n\n${DOCUMENTATION_PHASE_DOCS}\n`;
    }
  }
  if (!containsComparableText(content, "### 6.4 フェーズ移行時の棚卸し")) {
    if (content.includes("## 7. 新規プロジェクト開始時の文書運用")) {
      content = content.replace("## 7. 新規プロジェクト開始時の文書運用", `${DOCUMENTATION_INVENTORY}\n\n## 7. 新規プロジェクト開始時の文書運用`);
    } else {
      content = `${content.trimEnd()}\n\n${DOCUMENTATION_INVENTORY}\n`;
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!containsComparableText(content, "### 4.5 フェーズ移行時の処理")) {
    if (content.includes("## 5. 作業ルール")) {
      content = content.replace("## 5. 作業ルール", `${AGENTS_SECTION}\n\n## 5. 作業ルール`);
    } else {
      content = `${content.trimEnd()}\n\n${AGENTS_SECTION}\n`;
    }
  }
  if (!containsComparableText(content, "skills/phase-transition")) {
    if (content.includes("skill は補助であり、正本ではない。")) {
      content = content.replace("skill は補助であり、正本ではない。", `${AGENTS_SKILL_ENTRY}\n\nskill は補助であり、正本ではない。`);
    } else {
      content = `${content.trimEnd()}\n\n${AGENTS_SKILL_ENTRY}\n`;
    }
  }
  return writeIfChanged(targetPath, original, content);
}

function patchSkillReadme(targetPath) {
  let content = fs.existsSync(targetPath)
    ? fs.readFileSync(targetPath, "utf8")
    : "# skills\n\nこのディレクトリには、文書運用や企画整理を補助する skill を配置する。\n";
  const original = content;
  if (!containsComparableText(content, "phase-transition")) {
    content = `${content.trimEnd()}\n${SKILL_README_ENTRY}\n`;
  }
  return writeIfChanged(targetPath, original, content);
}

function getSkillStatuses(ctx) {
  const result = [];
  if (!ctx.aiSurface) {
    result.push({ label: ".agents/skills/phase-transition/ or .claude/skills/phase-transition/", status: "WARN" });
    return result;
  }
  const sourceSkillRoot = path.join(ctx.rootDir, "boilerplate", "skills", "phase-transition");
  for (const skillTarget of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
    const targetSkillRoot = path.join(skillTarget, "phase-transition");
    if (!fs.existsSync(targetSkillRoot)) {
      result.push({ label: `${path.relative(ctx.targetRoot, targetSkillRoot)}/`, status: "ADD" });
    } else {
      result.push({
        label: `${path.relative(ctx.targetRoot, targetSkillRoot)}/`,
        status: hashDirectory(sourceSkillRoot) === hashDirectory(targetSkillRoot) ? "SKIP(SAME)" : "UPDATE",
      });
    }
    const readmePath = path.join(skillTarget, "README.md");
    result.push({
      label: `${path.relative(ctx.targetRoot, readmePath)}`,
      status: !fs.existsSync(readmePath)
        ? "ADD"
        : containsComparableText(readIfExists(readmePath), "phase-transition")
          ? "SKIP(SAME)"
          : "UPDATE",
    });
  }
  return result;
}

function getStatus(ctx) {
  const results = [];
  results.push({
    label: "AGENTS.md",
    status:
      containsComparableText(readIfExists(path.join(ctx.targetRoot, "AGENTS.md")), "### 4.5 フェーズ移行時の処理") &&
      containsComparableText(readIfExists(path.join(ctx.targetRoot, "AGENTS.md")), "skills/phase-transition")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status: containsComparableText(readIfExists(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md")), "### 3.5 フェーズ移行プロセス")
      ? "SKIP(SAME)"
      : "UPDATE",
  });
  const documentationContent = readIfExists(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"));
  results.push({
    label: "docs/DOCUMENTATION.md",
    status:
      containsComparableText(documentationContent, "### 4.4 フェーズ移行文書の扱い") &&
      containsComparableText(documentationContent, "### 6.4 フェーズ移行時の棚卸し")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  results.push(...getSkillStatuses(ctx));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: readIfExists(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md")).includes("Applied phase-transition feature from project-bootstrap-kit")
      ? "SKIP(SAME)"
      : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx);
  console.log("");
  printSection("Phase Transition Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}`);
  }
  const counts = {
    add: diffResults.filter((item) => item.status === "ADD").length,
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
    warn: diffResults.filter((item) => item.status === "WARN").length,
  };
  console.log("");
  console.log(`Result: ${counts.add} add, ${counts.update} update, ${counts.same} skip(same), ${counts.warn} warn.`);
  printDryRunSummary([
    "1. WARN が出た場合は、--ai-surface codex|rovo|claude|both を指定して skill 配置先を明示してください。",
    "2. UPDATE が出たファイルだけ反映対象として考えてください。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const skillTargets = ctx.aiSurface ? getSkillTargets(ctx.aiSurface, ctx.targetRoot) : [];
  const sourceSkillRoot = path.join(ctx.rootDir, "boilerplate", "skills", "phase-transition");
  const copiedSkillTargets = [];
  for (const skillTarget of skillTargets) {
    const targetSkillRoot = path.join(skillTarget, "phase-transition");
    if (fs.existsSync(targetSkillRoot)) {
      fs.rmSync(targetSkillRoot, { recursive: true, force: true });
    }
    ensureDir(targetSkillRoot);
    copyRecursive(sourceSkillRoot, targetSkillRoot);
    copiedSkillTargets.push(`${path.relative(ctx.targetRoot, targetSkillRoot)}/`);
  }

  const skillReadmeResults = skillTargets.map((skillTarget) => [
    `${path.relative(ctx.targetRoot, path.join(skillTarget, "README.md"))}`,
    patchSkillReadme(path.join(skillTarget, "README.md")),
  ]);

  const patchResults = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"))],
    ...skillReadmeResults,
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), copiedSkillTargets)],
  ];

  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  for (const target of copiedSkillTargets) {
    console.log(`[APPLY] ${target}`);
  }
  if (!ctx.aiSurface) {
    console.log("[WARN] ai-surface was not specified, so phase-transition skill was not copied.");
  }
  console.log("");
  console.log("Result: phase-transition feature was applied.");
  printDryRunSummary([
    "1. docs/DEVELOPMENT_GUIDELINE.md と docs/DOCUMENTATION.md の追記位置を確認してください。",
    "2. phase-transition skill を使う AI surface に配置できているか確認してください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に適用履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
