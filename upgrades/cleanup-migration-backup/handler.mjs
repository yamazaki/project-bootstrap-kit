import fs from "node:fs";
import path from "node:path";
import { nowTimestamp, printSection, printDryRunSummary } from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: ".migration-backup/skills/",
    summary: "Remove the migrated skills backup after verification",
    locations: ["Delete .migration-backup/skills/"],
  },
  {
    file: "docs/BOOTSTRAP_ADOPTION.md",
    summary: "Append a cleanup history entry",
    locations: [
      "Add a new line under 'Upgrade History:'",
      "Append cleanup details under 'Upgrade Added Files:'",
    ],
  },
];

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied cleanup-migration-backup feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - removed .migration-backup/skills/`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied cleanup-migration-backup feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("removed .migration-backup/skills/")) {
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
  const backupDir = path.join(ctx.targetRoot, ".migration-backup", "skills");
  console.log("");
  if (fs.existsSync(backupDir)) {
    console.log("Result: .migration-backup/skills/ exists and would be removed by apply.");
  } else {
    console.log("Result: .migration-backup/skills/ was not found. Nothing to clean up.");
  }
  printDryRunSummary([
    "1. 削除対象が存在するか確認してください。",
    "2. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const backupDir = path.join(ctx.targetRoot, ".migration-backup", "skills");
  if (!fs.existsSync(backupDir)) {
    console.log("");
    console.log("Result: .migration-backup/skills/ was not found. Nothing to clean up.");
    console.log("");
    console.log("<<< Upgrade apply stopped. >>>");
    process.exit(1);
  }
  fs.rmSync(backupDir, { recursive: true, force: true });
  const adoptionChanged = patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"));
  console.log("");
  printSection("Apply Result");
  console.log("[APPLY] removed .migration-backup/skills/");
  console.log(`${adoptionChanged ? "[APPLY]" : "[SKIP]"} docs/BOOTSTRAP_ADOPTION.md`);
  console.log("");
  console.log("Result: cleanup-migration-backup feature was applied.");
  printDryRunSummary([
    "1. .migration-backup/skills/ が削除されたことを確認してください。",
    "2. docs/BOOTSTRAP_ADOPTION.md に cleanup 履歴が追記されたことを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
