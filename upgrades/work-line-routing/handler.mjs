import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  ensureDir,
  getSkillTargets,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

const ROUTING_FILES = [
  "docs/WORK_LINE_ROUTING.md",
  "docs/WORK/maintenance/README.md",
  "docs/WORK/operations/README.md",
  "docs/WORK/advisory/README.md",
  "docs/WORK/advisory/assets/README.md",
];
const SKILLS = ["maintenance-work", "operations-work", "experience-advisory"];

const AGENTS_ROUTING = [
  "#### 作業線ルーティング",
  "",
  "- 実質的な作業へ入る前に `docs/WORK_LINE_ROUTING.md` で Epic / MNT / OPS / ADV を判別する",
  "- 利用者によるskillの明示指定を第一候補とし、指定がなくても依頼内容に一致するskillをAIが使用する",
  "- MNTは `maintenance-work`、OPSは `operations-work`、ADVは `experience-advisory` skillを使う",
  "- EpicではWBSとsession、MNT / OPS / ADVでは各索引と件別記録を入口・出口にする",
].join("\n");

const AGENTS_SKILLS = [
  "- `skills/maintenance-work/`: リリース済み・運用中の既存能力に対する修正をMNTとして扱う",
  "- `skills/operations-work/`: アラート、ログ、停止、閾値超過、回復確認などの運用上の作業をOPSとして扱う",
  "- `skills/experience-advisory/`: 本プロジェクトの経験を、他プロジェクトやプロジェクト化前の企画へ活用する助言をADVとして扱う",
].join("\n");

const DEVELOPMENT_SECTION = [
  "### 計画開発と運用作業の並行",
  "",
  "最初の運用可能なリリース、共有環境へのデプロイ、または実利用開始以降は、現在フェーズのEpicと、リリース済み部分に対するMNT・OPSが並行しうる。作業線の判別と記録は `docs/WORK_LINE_ROUTING.md` を正本とする。MNTの実装にも、関連仕様、テスト、受入、migration、rollback、versioningの規則を適用する。",
].join("\n");

const DOCUMENTATION_SECTION = [
  "### 作業線記録の扱い",
  "",
  "`docs/WORK_LINE_ROUTING.md` は Epic / MNT / OPS / ADV の判別と遷移の正本である。",
  "",
  "- `docs/WORK/maintenance/`: MNTの索引と件別記録",
  "- `docs/WORK/operations/`: OPSの索引と件別記録",
  "- `docs/WORK/advisory/`: ADVの索引、件別記録、成果物正本",
  "",
  "索引のstatusと主要リンクは更新できる。件別の経過は日付付きで追記し、恒久的な仕様、設計、Runbook、技術知識は適切な正本へ反映する。",
].join("\n");

export const planDetails = [
  {
    file: "docs/WORK_LINE_ROUTING.md and docs/WORK/{maintenance,operations,advisory}/",
    summary: "Add the work-line source of truth, indexes, and case-record templates",
    locations: ["Preserve existing customized files", "Add only missing canonical files"],
  },
  {
    file: ".agents/skills/ or .claude/skills/",
    summary: "Add maintenance-work, operations-work, and experience-advisory",
    locations: ["Support explicit invocation and implicit selection", "Preserve existing customized skills"],
  },
  {
    file: "AGENTS.md and docs guidelines",
    summary: "Add short links to the dedicated routing source of truth",
    locations: ["Avoid duplicating the full routing rules across guidelines"],
  },
];

function sourcePath(ctx, relativePath) {
  return path.join(ctx.rootDir, "boilerplate", relativePath);
}

function sameFile(left, right) {
  return fs.existsSync(left) && fs.existsSync(right) && fs.readFileSync(left).equals(fs.readFileSync(right));
}

function copyMissingOrSame(source, target) {
  if (!fs.existsSync(target)) {
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
    return "ADD";
  }
  return sameFile(source, target) ? "SKIP(SAME)" : "WARN(KEEP)";
}

function detectedSkillTargets(ctx) {
  if (ctx.aiSurface) return getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  return [".agents/skills", ".claude/skills"]
    .map((relativePath) => path.join(ctx.targetRoot, relativePath))
    .filter((target) => fs.existsSync(target));
}

function appendBeforeHeading(content, nextHeading, block) {
  if (containsComparableText(content, block)) return content;
  if (content.includes(nextHeading)) return content.replace(nextHeading, `${block}\n\n${nextHeading}`);
  return `${content.trimEnd()}\n\n${block}\n`;
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original;
  if (!containsComparableText(content, "docs/WORK_LINE_ROUTING.md")) {
    content = content.replace("### 4.1 セッション開始時の初動", `### 4.1 セッション開始時の初動\n\n${AGENTS_ROUTING}`);
  }
  if (!containsComparableText(content, "skills/maintenance-work/")) {
    content = appendBeforeHeading(content, "skill は補助であり", AGENTS_SKILLS);
  }
  content = content.replace(
    "- 該当する WBS 番号とタスクの明示",
    "- Epicでは該当するWBS番号とタスク、MNT / OPS / ADVでは作業線IDまたは新規受付であることの明示"
  );
  content = content.replace(
    "- ユーザー承認後、作業開始前に `docs/PLAN_PHASE_CURRENT.md` の対象 WBS タスクを `[>]` に変更すること",
    "- Epicでは、ユーザー承認後、作業開始前に `docs/PLAN_PHASE_CURRENT.md` の対象WBSタスクを `[>]` に変更すること\n- MNT / OPS / ADVでは、各索引と件別記録のstatusを作業状態に合わせること"
  );
  content = content.replace(
    "- 対象 WBS と次に着手する内容を明示する",
    "- Epicでは対象WBS、MNT / OPS / ADVでは対象IDまたは新規受付であることと、次に着手する内容を明示する"
  );
  if (!containsComparableText(content, "MNT / OPS / ADVでは各件別記録に次アクション")) {
    content = content.replace(
      "セッションを中断する場合は、次回スムーズに再開できるよう、必要な情報を残す。",
      "セッションを中断する場合は、次回スムーズに再開できるよう、必要な情報を残す。\n\nMNT / OPS / ADVでは各件別記録に次アクションと途中状態を追記する。Epicでは次のセッション記録を更新する。"
    );
  }
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchIndex(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  if (containsComparableText(original, "WORK_LINE_ROUTING.md")) return false;
  const line = "- 作業線ルーティング: [WORK_LINE_ROUTING.md](./WORK_LINE_ROUTING.md)";
  const marker = "- ドキュメント運用ガイド: [DOCUMENTATION.md](./DOCUMENTATION.md)";
  const content = original.includes(marker)
    ? original.replace(marker, `${marker}\n${line}`)
    : `${original.trimEnd()}\n${line}\n`;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchGuideline(targetPath, nextHeading, section) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  if (containsComparableText(original, "docs/WORK_LINE_ROUTING.md")) return false;
  const content = appendBeforeHeading(original, nextHeading, section);
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchDocumentation(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original;
  if (!containsComparableText(content, "docs/WORK_LINE_ROUTING.md")) {
    content = appendBeforeHeading(content, "## 5. 文書タイプと REF の命名規則", DOCUMENTATION_SECTION);
  }
  if (!containsComparableText(content, "最初に `docs/WORK_LINE_ROUTING.md` に従って作業線を判別")) {
    content = content.replace(
      "### 8.1 セッション開始時に確認するもの",
      "### 8.1 セッション開始時に確認するもの\n\n最初に `docs/WORK_LINE_ROUTING.md` に従って作業線を判別する。以下の共通読込はEpicに適用し、MNT / OPS / ADVでは各索引と件別記録に定めた入口を使う。"
    );
  }
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchBootstrapAdoption(targetPath, addedTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  if (!content.includes("Applied work-line-routing feature from project-bootstrap-kit")) {
    const entry = `  - ${timestamp}: Applied work-line-routing feature from project-bootstrap-kit`;
    content = content.includes("- Upgrade History:")
      ? content.replace("- Upgrade History:", `- Upgrade History:\n${entry}`)
      : `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  }
  if (!content.includes("docs/WORK_LINE_ROUTING.md")) {
    const block = [`  - ${timestamp}`, "    - docs/WORK_LINE_ROUTING.md", "    - docs/WORK/maintenance/", "    - docs/WORK/operations/", "    - docs/WORK/advisory/", ...addedTargets.map((item) => `    - ${item}`)].join("\n");
    content = content.includes("- Upgrade Added Files:")
      ? content.replace("- Upgrade Added Files:", `- Upgrade Added Files:\n${block}`)
      : `${content.trimEnd()}\n- Upgrade Added Files:\n${block}\n`;
  }
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function statusForFile(ctx, relativePath) {
  const source = sourcePath(ctx, relativePath);
  const target = path.join(ctx.targetRoot, relativePath);
  if (!fs.existsSync(target)) return "ADD";
  return sameFile(source, target) ? "SKIP(SAME)" : "WARN(KEEP)";
}

function patchedStatus(targetPath, markers) {
  if (!fs.existsSync(targetPath)) return "WARN(MISSING)";
  const content = fs.readFileSync(targetPath, "utf8");
  const expected = Array.isArray(markers) ? markers : [markers];
  return expected.every((marker) => containsComparableText(content, marker)) ? "SKIP(SAME)" : "UPDATE";
}

export function dryRun(ctx) {
  printSection("Work-line Routing Diff");
  for (const relativePath of ROUTING_FILES) {
    console.log(`[${statusForFile(ctx, relativePath)}] ${relativePath}`);
  }
  const skillTargets = detectedSkillTargets(ctx);
  if (skillTargets.length === 0) {
    console.log("[WARN(MISSING)] AI surface skill directory; pass --ai-surface");
  }
  for (const targetRoot of skillTargets) {
    for (const skill of SKILLS) {
      const source = sourcePath(ctx, path.join("skills", skill, "SKILL.md"));
      const target = path.join(targetRoot, skill, "SKILL.md");
      const status = !fs.existsSync(target) ? "ADD" : sameFile(source, target) ? "SKIP(SAME)" : "WARN(KEEP)";
      console.log(`[${status}] ${path.relative(ctx.targetRoot, target)}`);
    }
  }
  console.log(`[${patchedStatus(path.join(ctx.targetRoot, "AGENTS.md"), ["docs/WORK_LINE_ROUTING.md", "MNT / OPS / ADVでは、各索引と件別記録のstatus", "MNT / OPS / ADVでは各件別記録に次アクション"])}] AGENTS.md`);
  console.log(`[${patchedStatus(path.join(ctx.targetRoot, "docs", "INDEX.md"), "WORK_LINE_ROUTING.md")}] docs/INDEX.md`);
  console.log(`[${patchedStatus(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"), "docs/WORK_LINE_ROUTING.md")}] docs/DEVELOPMENT_GUIDELINE.md`);
  console.log(`[${patchedStatus(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"), ["docs/WORK_LINE_ROUTING.md", "以下の共通読込はEpicに適用"])}] docs/DOCUMENTATION.md`);
  printDryRunSummary([
    "1. WARN(KEEP) は既存の独自文書またはskillを保全します。内容を手動比較してください。",
    "2. AI surfaceを推定できない場合は --ai-surface を指定してください。",
    "3. 問題なければ --diff を確認してから --apply を実行してください。",
  ]);
}

export function apply(ctx) {
  const results = [];
  for (const relativePath of ROUTING_FILES) {
    results.push([relativePath, copyMissingOrSame(sourcePath(ctx, relativePath), path.join(ctx.targetRoot, relativePath))]);
  }

  const skillTargets = detectedSkillTargets(ctx);
  if (skillTargets.length === 0) {
    throw new Error("AI surface skill directory was not found. Re-run with --ai-surface.");
  }
  const addedSkillTargets = [];
  for (const targetRoot of skillTargets) {
    for (const skill of SKILLS) {
      const relativeTarget = path.relative(ctx.targetRoot, path.join(targetRoot, skill, "SKILL.md"));
      const status = copyMissingOrSame(
        sourcePath(ctx, path.join("skills", skill, "SKILL.md")),
        path.join(targetRoot, skill, "SKILL.md")
      );
      results.push([relativeTarget, status]);
      if (status === "ADD") addedSkillTargets.push(path.dirname(relativeTarget));
    }
  }

  results.push(["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md")) ? "UPDATE" : "SKIP(SAME)"]);
  results.push(["docs/INDEX.md", patchIndex(path.join(ctx.targetRoot, "docs", "INDEX.md")) ? "UPDATE" : "SKIP(SAME)"]);
  results.push(["docs/DEVELOPMENT_GUIDELINE.md", patchGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"), "## 4. 設計ガイドライン", DEVELOPMENT_SECTION) ? "UPDATE" : "SKIP(SAME)"]);
  results.push(["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md")) ? "UPDATE" : "SKIP(SAME)"]);
  results.push(["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), [...new Set(addedSkillTargets)]) ? "UPDATE" : "SKIP(SAME)"]);

  printSection("Apply Result");
  for (const [label, status] of results) console.log(`[${status}] ${label}`);
  printDryRunSummary([
    "1. WORK_LINE_ROUTING.md と各索引のプロジェクト固有条件を確認してください。",
    "2. 既存案件の分類は自動化されません。必要な案件だけ手動で起票してください。",
    "3. 再実行して SKIP(SAME) または意図した WARN(KEEP) になることを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
