import fs from "node:fs";
import path from "node:path";
import {
  copyRecursive,
  ensureDir,
  getSkillTargets,
  hashDirectory,
  nowTimestamp,
  printSection,
  printDryRunSummary,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: ".agents/skills/ or .claude/skills/",
    summary: "Compare and synchronize project skills with the bootstrap kit source of truth",
    locations: [
      "Compare boilerplate/skills/ with the selected AI surface destination",
      "Apply ADD and UPDATE only",
      "Keep EXTRA skills untouched",
    ],
  },
  {
    file: "docs/BOOTSTRAP_ADOPTION.md",
    summary: "Append a synchronization history entry",
    locations: [
      "Add a new line under 'Upgrade History:'",
      "Append synchronized skill targets under 'Upgrade Added Files:'",
    ],
  },
];

function patchBootstrapAdoption(targetPath, synchronizedSkillTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied skills-sync feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, ...synchronizedSkillTargets.map((item) => `    - ${item}`)].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied skills-sync feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("Applied skills-sync feature")) {
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
  if (!ctx.aiSurface) {
    console.log("");
    console.log("Result: ai-surface is required for skills-sync.");
    console.log("");
    console.log("<<< Upgrade planning completed. >>>");
    return;
  }
  const sourceSkillsRoot = path.join(ctx.rootDir, "boilerplate", "skills");
  const skillTargets = getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  const diffResults = [];
  for (const skillTarget of skillTargets) {
    ensureDir(skillTarget);
    const sourceSkillNames = fs.existsSync(sourceSkillsRoot)
      ? fs.readdirSync(sourceSkillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
    const targetSkillNames = fs.existsSync(skillTarget)
      ? fs.readdirSync(skillTarget, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
    const allSkillNames = [...new Set([...sourceSkillNames, ...targetSkillNames])].sort();
    for (const skillName of allSkillNames) {
      const sourceDir = path.join(sourceSkillsRoot, skillName);
      const targetDir = path.join(skillTarget, skillName);
      const sourceExists = fs.existsSync(sourceDir);
      const targetExists = fs.existsSync(targetDir);
      const label = `${path.relative(ctx.targetRoot, skillTarget)}/${skillName}/`;
      if (sourceExists && !targetExists) {
        diffResults.push({ status: "ADD", label, sourceDir, targetDir });
      } else if (!sourceExists && targetExists) {
        diffResults.push({ status: "EXTRA", label, sourceDir, targetDir });
      } else if (sourceExists && targetExists) {
        const sourceHash = hashDirectory(sourceDir);
        const targetHash = hashDirectory(targetDir);
        diffResults.push({
          status: sourceHash === targetHash ? "SKIP(SAME)" : "UPDATE",
          label,
          sourceDir,
          targetDir,
        });
      }
    }
  }
  console.log("");
  printSection("Skill Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}`);
  }
  const counts = {
    add: diffResults.filter((item) => item.status === "ADD").length,
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
    extra: diffResults.filter((item) => item.status === "EXTRA").length,
  };
  console.log("");
  console.log(`Result: ${counts.add} add, ${counts.update} update, ${counts.same} skip(same), ${counts.extra} extra.`);
  printDryRunSummary([
    "1. UPDATE 対象の差分を確認してください。",
    "2. 問題なければ --apply を付けて再実行してください。",
    "3. EXTRA は対象プロジェクト固有の skill なので、削除されません。",
  ]);
}

export function apply(ctx) {
  if (!ctx.aiSurface) {
    console.log("");
    console.log("Result: ai-surface is required for skills-sync.");
    console.log("");
    console.log("<<< Upgrade apply stopped. >>>");
    process.exit(1);
  }
  const sourceSkillsRoot = path.join(ctx.rootDir, "boilerplate", "skills");
  const skillTargets = getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  const diffResults = [];
  for (const skillTarget of skillTargets) {
    ensureDir(skillTarget);
    const sourceSkillNames = fs.existsSync(sourceSkillsRoot)
      ? fs.readdirSync(sourceSkillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
    const targetSkillNames = fs.existsSync(skillTarget)
      ? fs.readdirSync(skillTarget, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
      : [];
    const allSkillNames = [...new Set([...sourceSkillNames, ...targetSkillNames])].sort();
    for (const skillName of allSkillNames) {
      const sourceDir = path.join(sourceSkillsRoot, skillName);
      const targetDir = path.join(skillTarget, skillName);
      const sourceExists = fs.existsSync(sourceDir);
      const targetExists = fs.existsSync(targetDir);
      const label = `${path.relative(ctx.targetRoot, skillTarget)}/${skillName}/`;
      if (sourceExists && !targetExists) {
        diffResults.push({ status: "ADD", label, sourceDir, targetDir });
      } else if (!sourceExists && targetExists) {
        diffResults.push({ status: "EXTRA", label, sourceDir, targetDir });
      } else if (sourceExists && targetExists) {
        const sourceHash = hashDirectory(sourceDir);
        const targetHash = hashDirectory(targetDir);
        diffResults.push({
          status: sourceHash === targetHash ? "SKIP(SAME)" : "UPDATE",
          label,
          sourceDir,
          targetDir,
        });
      }
    }
  }
  const applied = [];
  for (const item of diffResults) {
    if (item.status === "ADD" || item.status === "UPDATE") {
      if (fs.existsSync(item.targetDir)) {
        fs.rmSync(item.targetDir, { recursive: true, force: true });
      }
      ensureDir(item.targetDir);
      copyRecursive(item.sourceDir, item.targetDir);
      applied.push(item.label);
    }
  }
  const adoptionChanged = patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), applied);
  console.log("");
  printSection("Apply Result");
  for (const item of diffResults) {
    if (item.status === "ADD" || item.status === "UPDATE") {
      console.log(`[APPLY] ${item.label}`);
    } else {
      console.log(`[SKIP]  ${item.label}`);
    }
  }
  console.log(`${adoptionChanged ? "[APPLY]" : "[SKIP]"} docs/BOOTSTRAP_ADOPTION.md`);
  console.log("");
  console.log("Result: skills-sync feature was applied.");
  printDryRunSummary([
    "1. ADD / UPDATE された skill が期待どおり反映されたか確認してください。",
    "2. EXTRA は残しているため、不要なら個別に整理してください。",
    "3. docs/BOOTSTRAP_ADOPTION.md に同期履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
