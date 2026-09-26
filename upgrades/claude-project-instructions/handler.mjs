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
    file: "CLAUDE.md",
    summary: "Add the Claude Code project instruction entrypoint",
    locations: [
      "Import AGENTS.md as the project rule source of truth",
      "Prioritize project rules over Claude Code user-level rules when they conflict",
      "Do not create or modify files under ~/.claude/",
    ],
  },
];

const LEGACY_CLAUDE = `# プロジェクト指示

本プロジェクトのコーディング AI エージェント行動規範は \`AGENTS.md\` を正本とする。

@AGENTS.md

## 優先順位の明確化

- グローバルルール（claude-code-starter-kit が配置した \`~/.claude/CLAUDE.md\` および \`~/.claude/rules/*.md\`）と本プロジェクトの規範が矛盾する場合、\`AGENTS.md\` と \`docs/\` 配下の各ガイドライン（\`DEVELOPMENT_GUIDELINE.md\`、\`CODING_GUIDELINE.md\`、\`DOCUMENTATION.md\`、\`VERSIONING.md\`）を優先する。
`;

function sourceContent(ctx) {
  return fs.readFileSync(path.join(ctx.rootDir, "boilerplate", "_CLAUDE.md"), "utf8");
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function supportsClaude(aiSurface) {
  return aiSurface === "claude" || aiSurface === "both";
}

function claudeStatus(ctx) {
  const targetPath = path.join(ctx.targetRoot, "CLAUDE.md");
  if (!fs.existsSync(targetPath)) return "ADD";
  const current = readIfExists(targetPath);
  if (normalizeComparableText(current) === normalizeComparableText(sourceContent(ctx))) return "SKIP(SAME)";
  if (normalizeComparableText(current) === normalizeComparableText(LEGACY_CLAUDE)) return "UPDATE";
  return "SKIP(KEEP)";
}

function patchBootstrapAdoption(targetPath, fileStatus, aiSurface) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  const timestamp = nowTimestamp();
  const historyEntry = `  - ${timestamp}: Applied claude-project-instructions feature from project-bootstrap-kit`;
  const fileEntry = fileStatus === "ADD"
    ? "CLAUDE.md"
    : fileStatus === "UPDATE"
      ? "updated CLAUDE.md"
      : "validated CLAUDE.md";
  const addedFilesBlock = `  - ${timestamp}\n    - ${fileEntry}`;
  let content = original;
  if (/^- AI Surface:.*$/m.test(content)) {
    content = content.replace(/^- AI Surface:.*$/m, `- AI Surface: ${aiSurface}`);
  } else {
    content = content.replace("- Platform Profile:", `- AI Surface: ${aiSurface}\n- Platform Profile:`);
  }
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${historyEntry}\n`;
  } else if (!content.includes("Applied claude-project-instructions feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, body, next) => {
      return `- Upgrade History:\n${body.replace(/\n+$/, "")}\n${historyEntry}${next}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("CLAUDE.md")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, body) => {
      return `- Upgrade Added Files:\n${body.replace(/\n+$/, "")}\n${addedFilesBlock}\n`;
    });
  }
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

export function dryRun(ctx) {
  console.log("");
  printSection("Claude Project Instructions Diff");
  if (!supportsClaude(ctx.aiSurface)) {
    console.log("[WARN] --ai-surface must be claude or both");
    console.log("");
    console.log("Result: 0 add, 0 update, 0 skip(same), 0 skip(keep), 1 warn.");
    printDryRunSummary([
      "1. --ai-surface claude または --ai-surface both を指定してください。",
      "2. この feature は Codex / Rovo 専用プロジェクトには適用しません。",
    ]);
    return;
  }

  const status = claudeStatus(ctx);
  console.log(`[${status}] CLAUDE.md`);
  const adoption = readIfExists(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"));
  const adoptionStatus = status === "SKIP(KEEP)"
    ? "SKIP(SAME)"
    : adoption.includes("Applied claude-project-instructions feature from project-bootstrap-kit")
      && adoption.includes(`- AI Surface: ${ctx.aiSurface}`)
      ? "SKIP(SAME)"
      : "UPDATE";
  console.log(`[${adoptionStatus}] docs/BOOTSTRAP_ADOPTION.md`);
  const count = (expected) => [status, adoptionStatus].filter((item) => item === expected).length;
  console.log("");
  console.log(
    `Result: ${count("ADD")} add, ${count("UPDATE")} update, ${count("SKIP(SAME)")} skip(same), ${count("SKIP(KEEP)")} skip(keep), 0 warn.`
  );
  printDryRunSummary([
    "1. SKIP(KEEP) の場合は、既存の CLAUDE.md が独自編集されているため自動上書きしません。",
    "2. --diff の内容を確認し、問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  console.log("");
  printSection("Apply Result");
  if (!supportsClaude(ctx.aiSurface)) {
    console.log("[WARN] --ai-surface must be claude or both");
    console.log("");
    console.log("Result: claude-project-instructions feature was not applied.");
    printDryRunSummary([
      "1. --ai-surface claude または --ai-surface both を指定して再実行してください。",
    ], "<<< Upgrade apply stopped. >>>");
    return;
  }

  const status = claudeStatus(ctx);
  const targetPath = path.join(ctx.targetRoot, "CLAUDE.md");
  if (status === "ADD" || status === "UPDATE") {
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, sourceContent(ctx), "utf8");
  }
  console.log(`[${status === "ADD" || status === "UPDATE" ? "APPLY" : status}] CLAUDE.md`);

  if (status === "SKIP(KEEP)") {
    console.log("[SKIP(SAME)] docs/BOOTSTRAP_ADOPTION.md");
    console.log("");
    console.log("Result: existing customized CLAUDE.md was preserved.");
    printDryRunSummary([
      "1. 既存の CLAUDE.md と boilerplate/_CLAUDE.md を比較してください。",
      "2. AGENTS.md の import と優先順位を手作業で統合してください。",
    ], "<<< Upgrade apply completed with preserved content. >>>");
    return;
  }

  const adoptionChanged = patchBootstrapAdoption(
    path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"),
    status,
    ctx.aiSurface
  );
  console.log(`${adoptionChanged ? "[APPLY]" : "[SKIP(SAME)]"} docs/BOOTSTRAP_ADOPTION.md`);
  console.log("");
  console.log("Result: claude-project-instructions feature was applied.");
  printDryRunSummary([
    "1. CLAUDE.md が AGENTS.md を import していることを確認してください。",
    "2. Claude Code でプロジェクトを開き、プロジェクト規範が参照されることを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
