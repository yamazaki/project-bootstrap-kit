import fs from "node:fs";
import path from "node:path";
import { copyRecursive, ensureDir, getSkillTargets, nowTimestamp, printSection, printDryRunSummary } from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "skills/",
    summary: "Move legacy skills/ into AI-surface specific directories",
    locations: [
      "Copy existing skills/ into .agents/skills/ or .claude/skills/ based on --ai-surface",
      "Move the original skills/ into .migration-backup/skills/",
    ],
  },
  {
    file: "docs/BOOTSTRAP_ADOPTION.md",
    summary: "Append a migration history entry for skills surface migration",
    locations: [
      "Add a new line under 'Upgrade History:'",
      "Append migrated skill targets under 'Upgrade Added Files:'",
    ],
  },
];

function backupLegacySkills(targetRoot) {
  const legacySkillsDir = path.join(targetRoot, "skills");
  if (!fs.existsSync(legacySkillsDir)) return false;
  const backupDir = path.join(targetRoot, ".migration-backup");
  ensureDir(backupDir);
  const backupSkillsDir = path.join(backupDir, "skills");
  if (fs.existsSync(backupSkillsDir)) {
    fs.rmSync(backupSkillsDir, { recursive: true, force: true });
  }
  fs.renameSync(legacySkillsDir, backupSkillsDir);
  return true;
}

function patchBootstrapAdoption(targetPath, addedSkillTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied skills-surface-migration feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, ...addedSkillTargets.map((item) => `    - ${item}`)].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied skills-surface-migration feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("migration-backup/skills/")) {
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

export function dryRun(ctx) {
  const legacySkillsDir = path.join(ctx.targetRoot, "skills");
  if (!fs.existsSync(legacySkillsDir)) {
    console.log("");
    console.log("Result: legacy skills/ directory was not found. Nothing to migrate.");
    console.log("");
    console.log("<<< Upgrade planning completed. >>>");
    return;
  }
  console.log("");
  console.log("Result: dry-run only. No files were modified.");
  printDryRunSummary([
    "1. 内容が問題なければ --apply を付けて再実行してください。",
    "2. 実プロジェクトへ適用する前に、対象ファイルのバックアップや git 差分を確認してください。",
  ]);
}

export function apply(ctx) {
  if (!ctx.aiSurface) {
    console.log("");
    console.log("Result: ai-surface is required for skills-surface-migration.");
    console.log("");
    console.log("<<< Upgrade apply stopped. >>>");
    process.exit(1);
  }
  const legacySkillsDir = path.join(ctx.targetRoot, "skills");
  if (!fs.existsSync(legacySkillsDir)) {
    console.log("");
    console.log("Result: legacy skills/ directory was not found. Nothing to migrate.");
    console.log("");
    console.log("<<< Upgrade apply stopped. >>>");
    process.exit(1);
  }
  const skillTargets = getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  for (const skillTarget of skillTargets) {
    ensureDir(skillTarget);
    copyRecursive(legacySkillsDir, skillTarget);
  }
  const backedUp = backupLegacySkills(ctx.targetRoot);
  const adoptionChanged = patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), [
    ...skillTargets.map((skillTarget) => `${path.relative(ctx.targetRoot, skillTarget)}/`),
    ".migration-backup/skills/",
  ]);
  console.log("");
  printSection("Apply Result");
  for (const skillTarget of skillTargets) {
    console.log(`[APPLY] ${path.relative(ctx.targetRoot, skillTarget)}/`);
  }
  console.log(`${backedUp ? "[APPLY]" : "[SKIP]"} .migration-backup/skills/`);
  console.log(`${adoptionChanged ? "[APPLY]" : "[SKIP]"} docs/BOOTSTRAP_ADOPTION.md`);
  console.log("");
  console.log("Result: skills-surface-migration feature was applied.");
  printDryRunSummary([
    "1. .agents/skills/ または .claude/skills/ に期待どおりの skill が配置されたか確認してください。",
    "2. .migration-backup/skills/ の内容を確認し、不要であれば後で整理してください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に migration 履歴が追記されたか確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
