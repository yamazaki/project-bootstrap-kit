import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  copyRecursive,
  getSkillTargets,
  hashDirectory,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/WORK/0.1/interaction_design.md",
    summary: "Add Web GUI screen types, design mock, and public endpoint FQDN planning sections",
    locations: [
      "Add screen type and route responsibility checks",
      "Add design mock / provisional implementation decision points",
      "Add FQDN / external endpoint design decision points",
    ],
  },
  {
    file: "docs/WORK/0.1/implementation_ready_checklist.md",
    summary: "Add readiness checks for design mock and public endpoint FQDN planning",
    locations: [
      "Add readiness checklist items for design mock and FQDN planning decisions",
    ],
  },
  {
    file: "AGENTS.md / docs/DEVELOPMENT_GUIDELINE.md / docs/DOCUMENTATION.md",
    summary: "Add guidance so AI agents do not omit Web GUI mock and public endpoint FQDN planning tasks",
    locations: [
      "Add implementation-start checks to AGENTS.md",
      "Add design phase and new-app planning policy to DEVELOPMENT_GUIDELINE.md",
      "Add concrete operation rules to DOCUMENTATION.md",
    ],
  },
  {
    file: ".agents/skills/project-bootstrap/ or .claude/skills/project-bootstrap/",
    summary: "Update project-bootstrap skill when --ai-surface is specified",
    locations: [
      "Copy the latest boilerplate/skills/project-bootstrap skill to the selected AI surface",
    ],
  },
];

const WEB_UI_AGENT_BULLETS = `- Web GUI がある場合、デザインモック / 仮実装を WBS に含めるか
- 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか`;

const DEVELOPMENT_DESIGN_BULLETS = `- Web GUI を持つプロジェクトでは、早期フェーズにデザインモックまたは仮実装を行い、主要導線、レイアウト、デザインテーマの認識を合わせる
- 外部公開または外部連携されるエンドポイントを持つプロジェクトでは、API / Webhook / Callback / Request URL などの FQDN と環境別構成を設計対象に含める`;

const DEVELOPMENT_NEW_APP_BULLETS = `Web GUI があるプロジェクトでは、WBS 分解時にデザインモック / 仮実装のタスクを設けるか判断する。
外部公開または外部連携されるエンドポイントがあるプロジェクトでは、WBS 分解時に FQDN 設計のタスクを設けるか判断する。`;

const DOCUMENTATION_UI_BULLETS = `- Web GUI がある場合、デザインモック / 仮実装を早期 WBS に含めるか
- 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を早期 WBS に含めるか`;

const DOCUMENTATION_WEB_SECTION = `### 7.4 Web GUI / FQDN 設計がある場合

Web GUI を持つプロジェクトでは、最初から詳細画面設計を確定するのではなく、必要に応じてデザインモックまたは仮実装を WBS に含める。目的は、主要導線、レイアウト密度、デザインテーマ、画面種別ごとの役割分担について、開発前に認識を合わせることである。

外部公開または外部連携されるエンドポイントを持つ場合は、Web GUI の有無に関わらず FQDN 設計を WBS に含める。特に次を確認する。

- 個人の操作 / 設定画面
- テナント管理画面
- サービス全体の管理画面
- API / Webhook / Callback / Request URL
- development / staging / production の環境差分
- Cookie、認証、CORS、OAuth redirect、Webhook 署名検証への影響`;

const INTERACTION_SECTIONS = `## 6. 画面種別と導線

Web GUI を持つ場合は、初期段階で必要になりうる画面種別を整理する。

- 個人の操作 / 設定画面
- テナント管理画面
- サービス全体の管理画面
- 外部連携の設定 / 認可 / Webhook 管理画面
- その他

## 7. デザインモックの要否

Web GUI を持つ場合は、早期フェーズにデザインモックまたは仮実装の WBS を設けるか判断する。

- 確認したいこと:
  - 主要導線
  - 情報設計
  - レイアウト密度
  - デザインテーマ
  - 画面種別間の役割分担
- 成果物の例:
  - 静的モック
  - 仮実装された画面
  - クリック可能な簡易導線
  - 画面キャプチャ

## 8. FQDN / 外部エンドポイント設計の要否

外部公開または外部連携されるエンドポイントがある場合は、FQDN とエンドポイントの設計要否を整理する。Web GUI がなく API だけを提供する場合も対象に含める。

- 利用者向け画面の FQDN
- テナント管理画面の FQDN
- サービス管理画面の FQDN
- API / Webhook / Callback / Request URL の FQDN
- 開発 / staging / production の環境別 FQDN
- Cookie、認証、CORS、OAuth redirect、Webhook 署名検証への影響`;

const CHECKLIST_ITEMS = `- [ ] Web GUI がある場合、デザインモック / 仮実装を WBS に含めるか判断されている
- [ ] 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか判断されている`;

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function writeIfChanged(targetPath, content, original) {
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function normalizeWebUiPlanningTerminology(content) {
  return content
    .replaceAll(
      "Web アプリケーションまたは外部連携がある場合、FQDN / 外部エンドポイント設計を WBS に含めるか判断されている",
      "外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか判断されている"
    )
    .replaceAll(
      "Web アプリケーションまたは外部連携がある場合、FQDN / 外部エンドポイント設計を早期 WBS に含めるか",
      "外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を早期 WBS に含めるか"
    )
    .replaceAll(
      "Web アプリケーションまたは外部連携がある場合、FQDN / 外部エンドポイント設計を WBS に含めるか",
      "外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか"
    )
    .replaceAll(
      "Web アプリケーションまたは外部連携があるプロジェクトでは、WBS 分解時に FQDN / 外部エンドポイント設計のタスクを設けるか判断する。",
      "外部公開または外部連携されるエンドポイントがあるプロジェクトでは、WBS 分解時に FQDN 設計のタスクを設けるか判断する。"
    )
    .replaceAll(
      "Web アプリケーションや外部連携を持つプロジェクトでは、利用者向け画面、管理画面、API / Webhook / Callback / Request URL の FQDN と環境別構成を設計対象に含める",
      "外部公開または外部連携されるエンドポイントを持つプロジェクトでは、API / Webhook / Callback / Request URL などの FQDN と環境別構成を設計対象に含める"
    )
    .replaceAll(
      "Web アプリケーション、外部連携、Webhook、Slack アプリの Request URL などがある場合は、FQDN とエンドポイントの設計要否を整理する。",
      "外部公開または外部連携されるエンドポイントがある場合は、FQDN とエンドポイントの設計要否を整理する。Web GUI がなく API だけを提供する場合も対象に含める。"
    )
    .replaceAll(
      "Web アプリケーション、Webhook、Slack アプリの Request URL、OAuth callback など外部から到達されるエンドポイントを持つ場合は、FQDN / 外部エンドポイント設計も WBS に含める。特に次を確認する。",
      "外部公開または外部連携されるエンドポイントを持つ場合は、Web GUI の有無に関わらず FQDN 設計を WBS に含める。特に次を確認する。"
    );
}

function patchBootstrapAdoption(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = normalizeWebUiPlanningTerminology(original);
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied web-ui-planning feature from project-bootstrap-kit`;
  const addedFilesBlock = [`  - ${timestamp}`, `    - updated Web UI design mock and FQDN planning guidance`].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied web-ui-planning feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("updated Web UI design mock and FQDN planning guidance")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${addedFilesBlock}\n`;
    });
  }
  return writeIfChanged(targetPath, content, original);
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = normalizeWebUiPlanningTerminology(original);
  if (!containsComparableText(content, "デザインモック / 仮実装を WBS に含めるか")) {
    if (content.includes("- デザイン / テーマの方向性を初期フェーズで扱うか")) {
      content = content.replace(
        "- デザイン / テーマの方向性を初期フェーズで扱うか",
        `- デザイン / テーマの方向性を初期フェーズで扱うか\n${WEB_UI_AGENT_BULLETS}`
      );
    } else {
      content = `${content.trimEnd()}\n\nWeb GUI / FQDN planning checks:\n${WEB_UI_AGENT_BULLETS}\n`;
    }
  }
  return writeIfChanged(targetPath, content, original);
}

function patchDevelopmentGuideline(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = normalizeWebUiPlanningTerminology(original);
  if (!containsComparableText(content, "早期フェーズにデザインモックまたは仮実装を行い")) {
    if (content.includes("- UI / Interaction を持つプロジェクトでは、画面や操作導線も設計対象として扱う")) {
      content = content.replace(
        "- UI / Interaction を持つプロジェクトでは、画面や操作導線も設計対象として扱う",
        `- UI / Interaction を持つプロジェクトでは、画面や操作導線も設計対象として扱う\n${DEVELOPMENT_DESIGN_BULLETS}`
      );
    } else {
      content = `${content.trimEnd()}\n\n### Web GUI / FQDN 設計\n\n${DEVELOPMENT_DESIGN_BULLETS}\n`;
    }
  }
  if (!containsComparableText(content, "WBS 分解時に FQDN 設計のタスクを設けるか判断する")) {
    if (content.includes("UI / Interaction があるプロジェクトでは、初期構想段階で `docs/WORK/0.1/interaction_design.md` を使って方向性を整理する。")) {
      content = content.replace(
        "UI / Interaction があるプロジェクトでは、初期構想段階で `docs/WORK/0.1/interaction_design.md` を使って方向性を整理する。",
        `UI / Interaction があるプロジェクトでは、初期構想段階で \`docs/WORK/0.1/interaction_design.md\` を使って方向性を整理する。\n${DEVELOPMENT_NEW_APP_BULLETS}`
      );
    } else {
      content = `${content.trimEnd()}\n\n${DEVELOPMENT_NEW_APP_BULLETS}\n`;
    }
  }
  return writeIfChanged(targetPath, content, original);
}

function patchDocumentation(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = normalizeWebUiPlanningTerminology(original);
  if (!containsComparableText(content, "デザインモック / 仮実装を早期 WBS に含めるか")) {
    if (content.includes("- 今フェーズで扱うか、後フェーズへ送るか")) {
      content = content.replace(
        "- 今フェーズで扱うか、後フェーズへ送るか",
        `- 今フェーズで扱うか、後フェーズへ送るか\n${DOCUMENTATION_UI_BULLETS}`
      );
    }
  }
  if (!containsComparableText(content, "Web GUI の場合、デザインモック / 仮実装を WBS に含めるか")) {
    if (content.includes("- デザイン / テーマの方向性をどこまで決めるか")) {
      content = content.replace(
        "- デザイン / テーマの方向性をどこまで決めるか",
        "- デザイン / テーマの方向性をどこまで決めるか\n- Web GUI の場合、デザインモック / 仮実装を WBS に含めるか\n- 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか"
      );
    }
  }
  if (
    !containsComparableText(content, "### 7.4 Web GUI / FQDN 設計がある場合")
    && !(
      containsComparableText(content, "デザインモック / 仮実装を早期 WBS に含めるか")
      && containsComparableText(content, "FQDN 設計を WBS に含めるか")
    )
  ) {
    if (content.includes("## 8. セッション運用")) {
      content = content.replace("## 8. セッション運用", `${DOCUMENTATION_WEB_SECTION}\n\n## 8. セッション運用`);
    } else {
      content = `${content.trimEnd()}\n\n${DOCUMENTATION_WEB_SECTION}\n`;
    }
  }
  return writeIfChanged(targetPath, content, original);
}

function patchInteractionDesign(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = normalizeWebUiPlanningTerminology(original);
  if (!containsComparableText(content, "## 7. デザインモックの要否")) {
    if (content.includes("## 6. 初期フェーズで扱う範囲")) {
      content = content.replace("## 6. 初期フェーズで扱う範囲", `${INTERACTION_SECTIONS}\n\n## 9. 初期フェーズで扱う範囲`);
      content = content.replace("## 7. リスク / 未確定事項", "## 10. リスク / 未確定事項");
    } else {
      content = `${content.trimEnd()}\n\n${INTERACTION_SECTIONS}\n`;
    }
  }
  if (!containsComparableText(content, "FQDN 設計が未確定")) {
    content = `${content.trimEnd()}\n- 画面種別ごとの責務境界が未確定\n- FQDN 設計が未確定\n`;
  }
  return writeIfChanged(targetPath, content, original);
}

function patchImplementationReadyChecklist(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = normalizeWebUiPlanningTerminology(original);
  if (!containsComparableText(content, "FQDN 設計を WBS に含めるか判断されている")) {
    if (content.includes("- [ ] UI / Interaction の要否と、現在フェーズで扱うかどうかが確認されている")) {
      content = content.replace(
        "- [ ] UI / Interaction の要否と、現在フェーズで扱うかどうかが確認されている",
        `- [ ] UI / Interaction の要否と、現在フェーズで扱うかどうかが確認されている\n${CHECKLIST_ITEMS}`
      );
    } else {
      content = `${content.trimEnd()}\n${CHECKLIST_ITEMS}\n`;
    }
  }
  return writeIfChanged(targetPath, content, original);
}

function getSkillStatus(ctx) {
  if (!ctx.aiSurface) return [{ label: "project-bootstrap skill", status: "WARN", note: "--ai-surface not specified" }];
  const sourceDir = path.join(ctx.rootDir, "boilerplate", "skills", "project-bootstrap");
  const sourceHash = hashDirectory(sourceDir);
  return getSkillTargets(ctx.aiSurface, ctx.targetRoot).map((skillsRoot) => {
    const targetDir = path.join(skillsRoot, "project-bootstrap");
    if (!fs.existsSync(targetDir)) {
      return { label: path.relative(ctx.targetRoot, targetDir), status: "ADD" };
    }
    return {
      label: path.relative(ctx.targetRoot, targetDir),
      status: hashDirectory(targetDir) === sourceHash ? "SKIP(SAME)" : "UPDATE",
    };
  });
}

function getStatus(ctx) {
  const targetRoot = ctx.targetRoot;
  const results = [];
  results.push({
    label: "AGENTS.md",
    status: containsComparableText(readIfExists(path.join(targetRoot, "AGENTS.md")), "FQDN 設計を WBS に含めるか") ? "SKIP(SAME)" : "UPDATE",
  });
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status: containsComparableText(readIfExists(path.join(targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md")), "外部公開または外部連携されるエンドポイントを持つプロジェクト") ? "SKIP(SAME)" : "UPDATE",
  });
  results.push({
    label: "docs/DOCUMENTATION.md",
    status: containsComparableText(readIfExists(path.join(targetRoot, "docs", "DOCUMENTATION.md")), "Web GUI の有無に関わらず FQDN 設計を WBS に含める") ? "SKIP(SAME)" : "UPDATE",
  });
  const interactionPath = path.join(targetRoot, "docs", "WORK", "0.1", "interaction_design.md");
  results.push({
    label: "docs/WORK/0.1/interaction_design.md",
    status: !fs.existsSync(interactionPath)
      ? "ADD"
      : containsComparableText(readIfExists(interactionPath), "Web GUI がなく API だけを提供する場合も対象に含める")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  const checklistPath = path.join(targetRoot, "docs", "WORK", "0.1", "implementation_ready_checklist.md");
  results.push({
    label: "docs/WORK/0.1/implementation_ready_checklist.md",
    status: !fs.existsSync(checklistPath)
      ? "ADD"
      : containsComparableText(readIfExists(checklistPath), "デザインモック / 仮実装を WBS に含めるか判断されている")
        ? "SKIP(SAME)"
        : "UPDATE",
  });
  results.push(...getSkillStatus(ctx));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: readIfExists(path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md")).includes("Applied web-ui-planning feature from project-bootstrap-kit") ? "SKIP(SAME)" : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const diffResults = getStatus(ctx);
  console.log("");
  printSection("Web UI Planning Diff");
  for (const item of diffResults) {
    console.log(`[${item.status}] ${item.label}${item.note ? ` (${item.note})` : ""}`);
  }
  const counts = {
    update: diffResults.filter((item) => item.status === "UPDATE").length,
    add: diffResults.filter((item) => item.status === "ADD").length,
    same: diffResults.filter((item) => item.status === "SKIP(SAME)").length,
    warn: diffResults.filter((item) => item.status === "WARN").length,
  };
  console.log("");
  console.log(`Result: ${counts.add} add, ${counts.update} update, ${counts.same} skip(same), ${counts.warn} warn.`);
  printDryRunSummary([
    "1. WARN が出た場合は、skill 更新が必要か確認し、必要なら --ai-surface を指定してください。",
    "2. UPDATE / ADD が出た項目だけ反映対象として考えてください。",
    "3. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const sourceSkillDir = path.join(ctx.rootDir, "boilerplate", "skills", "project-bootstrap");
  const sourceWorkDir = path.join(ctx.rootDir, "boilerplate", "docs", "WORK", "0.1");
  const workFiles = [
    "interaction_design.md",
    "implementation_ready_checklist.md",
  ];
  for (const file of workFiles) {
    const targetPath = path.join(ctx.targetRoot, "docs", "WORK", "0.1", file);
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(path.join(sourceWorkDir, file), targetPath);
    }
  }
  const patchResults = [
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/DOCUMENTATION.md", patchDocumentation(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"))],
    ["docs/WORK/0.1/interaction_design.md", patchInteractionDesign(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "interaction_design.md"))],
    ["docs/WORK/0.1/implementation_ready_checklist.md", patchImplementationReadyChecklist(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "implementation_ready_checklist.md"))],
  ];
  const skillResults = [];
  if (ctx.aiSurface) {
    for (const skillsRoot of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
      const targetDir = path.join(skillsRoot, "project-bootstrap");
      copyRecursive(sourceSkillDir, targetDir);
      skillResults.push([path.relative(ctx.targetRoot, targetDir), true]);
    }
  }
  patchResults.push(["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))]);

  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  for (const [label] of skillResults) {
    console.log(`[APPLY] ${label}`);
  }
  if (!ctx.aiSurface) {
    console.log("[WARN] project-bootstrap skill was not updated because --ai-surface was not specified");
  }
  console.log("");
  console.log("Result: web-ui-planning feature was applied.");
  printDryRunSummary([
    "1. docs/WORK/0.1/interaction_design.md と implementation_ready_checklist.md の追記位置を確認してください。",
    "2. Web GUI があるプロジェクトでは、デザインモック / 仮実装 WBS を追加するか判断してください。",
    "3. 外部公開 / 外部連携エンドポイントがあるプロジェクトでは、FQDN 設計 WBS を追加するか判断してください。",
  ], "<<< Upgrade apply completed. >>>");
}
