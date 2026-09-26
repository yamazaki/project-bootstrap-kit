import fs from "node:fs";
import path from "node:path";
import { copyRecursive, nowTimestamp, printSection, printDryRunSummary } from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/WORK/0.1/interaction_design.md",
    summary: "Add the initial interaction design planning document",
    locations: [
      "Copy the new document into docs/WORK/0.1/",
    ],
  },
  {
    file: "AGENTS.md / docs/DEVELOPMENT_GUIDELINE.md / docs/DOCUMENTATION.md / docs/WORK/0.1/README.md",
    summary: "Add interaction design guidance for GUI, CLI, and Chat UI",
    locations: [
      "Insert new references to interaction_design.md",
      "Clarify that GUI, CLI, and Chat UI are part of planning and WBS",
    ],
  },
];

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied interaction-design feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - docs/WORK/0.1/interaction_design.md`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied interaction-design feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("interaction_design.md")) {
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
  if (!content.includes("UI / Interaction が必要か、必要なら GUI / CLI / Chat のどれか")) {
    content = content.replace(
      "- フェーズ分割の考え方\n- 実装着手に不足している前提",
      "- フェーズ分割の考え方\n- 実装着手に不足している前提\n- UI / Interaction が必要か、必要なら GUI / CLI / Chat のどれか\n- デザイン / テーマの方向性を初期フェーズで扱うか"
    );
  }
  if (!content.includes("interaction_design.md")) {
    content = content.replace(
      "1. `docs/WORK/0.1/idea_template.md`\n2. `docs/WORK/0.1/concept_template.md`\n3. `docs/WORK/0.1/phase_definition_template.md`",
      "1. `docs/WORK/0.1/idea.md`\n2. `docs/WORK/0.1/product_definition.md`\n3. `docs/WORK/0.1/interaction_design.md`（UI / Interaction がある場合）\n4. `docs/WORK/0.1/phase_definition.md`"
    );
    content = content.replace(
      "4. `docs/ROADMAP.md`\n5. `docs/PLAN_PHASE_CURRENT.md`\n6. `docs/WORK/x.y/` または WBS 分解\n7. `implementation_ready_checklist` の確認\n8. 実装着手",
      "5. `docs/ROADMAP.md`\n6. `docs/PLAN_PHASE_CURRENT.md`\n7. `docs/WORK/x.y/` または WBS 分解\n8. `implementation_ready_checklist` の確認\n9. 実装着手"
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
  if (!content.includes("UI / Interaction を持つプロジェクトでは、画面や操作導線も設計対象として扱う")) {
    content = content.replace(
      "- 暗黙知を排除し、第三者が読んでも誤解しない粒度で記述する",
      "- 暗黙知を排除し、第三者が読んでも誤解しない粒度で記述する\n- UI / Interaction を持つプロジェクトでは、画面や操作導線も設計対象として扱う"
    );
  }
  if (!content.includes("GUI / CLI / Chat UI を持つ場合は、状態、入力エラー、空状態、権限境界も設計対象に含める")) {
    content = content.replace(
      "- 正常系だけでなく、異常系、フォールバック、性能、セキュリティも設計段階で洗い出す",
      "- 正常系だけでなく、異常系、フォールバック、性能、セキュリティも設計段階で洗い出す\n- GUI / CLI / Chat UI を持つ場合は、状態、入力エラー、空状態、権限境界も設計対象に含める"
    );
  }
  if (!content.includes("interaction_design.md")) {
    content = content.replace(
      "初期構想とテンプレートの扱いは `docs/DOCUMENTATION.md` を参照する。",
      "初期構想と文書の扱いは `docs/DOCUMENTATION.md` を参照する。\n\nUI / Interaction があるプロジェクトでは、初期構想段階で `docs/WORK/0.1/interaction_design.md` を使って方向性を整理する。"
    );
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
  if (!content.includes("ここでいう UI には GUI だけでなく CLI や Chat UI も含む")) {
    content = content.replace(
      "- `SPEC`\n  - 画面遷移、状態、権限境界、受入条件など拘束力を持つ要件",
      "- `SPEC`\n  - 画面遷移、状態、権限境界、受入条件など拘束力を持つ要件\n\n補足:\n- ここでいう UI には GUI だけでなく CLI や Chat UI も含む\n- 初期構想段階では、詳細画面設計よりも `interaction design` の方向性整理を優先する"
    );
  }
  if (!content.includes("interaction_design.md")) {
    content = content.replace(
      "- `idea_template.md`\n- `concept_template.md`\n- `phase_definition_template.md`",
      "- `idea.md`\n- `product_definition.md`\n- `interaction_design.md`\n- `phase_definition.md`"
    );
  }
  if (!content.includes("UI / Interaction を持つプロジェクトでは、初期構想段階で少なくとも以下を整理する。")) {
    content = content.replace(
      "## 8. セッション運用",
      "### 7.3 UI / Interaction がある場合\n\nUI / Interaction を持つプロジェクトでは、初期構想段階で少なくとも以下を整理する。\n\n- UI / Interaction が必要か\n- GUI / CLI / Chat / その他のどれか\n- 誰がどのように使うか\n- どのような体験や印象を目指すか\n- 今フェーズで扱うか、後フェーズへ送るか\n\nこれらは、まず `docs/WORK/0.1/interaction_design.md` に整理する。\n\n## 8. セッション運用"
    );
  }
  if (!content.includes("GUI / CLI / Chat のどれを扱うか")) {
    content = content.replace(
      "- フェーズ分割の考え方\n- 実装着手に不足している前提",
      "- フェーズ分割の考え方\n- 実装着手に不足している前提\n\nUI / Interaction を持つ場合は、追加で次を明示する。\n\n- GUI / CLI / Chat のどれを扱うか\n- 今フェーズで UI / Interaction を実装対象に含めるか\n- デザイン / テーマの方向性をどこまで決めるか"
    );
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchWorkReadme(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!content.includes("interaction_design.md")) {
    content = `${content.trimEnd()}\n\n初期構想文書:\n- \`idea.md\`\n- \`product_definition.md\`\n- \`interaction_design.md\`\n- \`phase_definition.md\`\n- \`roadmap.md\`\n- \`implementation_ready_checklist.md\`\n`;
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

export function dryRun() {
  console.log("");
  console.log("Result: dry-run only. No files were modified.");
  printDryRunSummary([
    "1. 内容が問題なければ --apply を付けて再実行してください。",
    "2. 実プロジェクトへ適用する前に、対象ファイルのバックアップや git 差分を確認してください。",
  ]);
}

export function apply(ctx) {
  const docsSource = path.join(ctx.featureDir, "files", "docs");
  const interactionDesignPath = path.join(ctx.targetRoot, "docs", "WORK", "0.1", "interaction_design.md");
  const interactionDesignExisted = fs.existsSync(interactionDesignPath);
  if (fs.existsSync(docsSource) && !interactionDesignExisted) {
    copyRecursive(docsSource, path.join(ctx.targetRoot, "docs"));
  }
  const patchResults = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"))],
    ["docs/WORK/0.1/README.md", patchWorkReadme(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "README.md"))],
    ["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  console.log(`${interactionDesignExisted ? "[SKIP(SAME)]" : "[APPLY]"} docs/WORK/0.1/interaction_design.md`);
  console.log("");
  console.log("Result: interaction-design feature was applied.");
  printDryRunSummary([
    "1. docs/WORK/0.1/interaction_design.md を開き、GUI / CLI / Chat の観点を整理してください。",
    "2. AGENTS.md と docs/DEVELOPMENT_GUIDELINE.md の追記位置が自然か確認してください。",
    "3. UI / Interaction を今フェーズで扱うか、ROADMAP と PLAN に反映してください。",
  ], "<<< Upgrade apply completed. >>>");
}
