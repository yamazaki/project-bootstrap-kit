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
    file: "docs/WORK/0.1/product_definition.md",
    summary: "Add the requirement, technology, and non-functional product definition document",
    locations: [
      "Copy the new document only when it does not already exist",
      "Keep existing concept_template.md and completed initial planning documents",
    ],
  },
  {
    file: "AGENTS.md / docs/DEVELOPMENT_GUIDELINE.md / docs/DOCUMENTATION.md",
    summary: "Align initial planning with requirement elicitation and explicit validation stages",
    locations: [
      "Separate technical feasibility, concept and experience validation, and initial usable delivery",
      "Add technology option, security, performance, cost, and operations considerations",
      "Clarify that phase numbers are independent from maturity stages",
    ],
  },
  {
    file: ".agents/skills/project-bootstrap/ or .claude/skills/project-bootstrap/",
    summary: "Update project-bootstrap as an interactive facilitation skill",
    locations: [
      "Guide users through facts, hypotheses, technology tradeoffs, and non-functional requirements",
      "Convert uncertainties into PoC, research, load testing, design mock, or WBS tasks",
    ],
  },
];

const AGENTS_DISCOVERY_BULLETS = [
  "- 事実として分かっていること / 仮説 / 未決事項",
  "- 初期提供範囲 / 初期提供範囲に含めないもの",
  "- 技術実現性検証、構想・利用体験検証、初期実用提供のどこまでを扱うか",
  "- 技術候補の利点、制約、運用負荷、コストと判断理由",
  "- クリティカルなセキュリティ要件、性能要件、コスト要件",
].join("\n");

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function writeIfChanged(targetPath, original, content) {
  if (content === original) return false;
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function extractSection(content, startHeading, nextHeading) {
  const start = content.indexOf(startHeading);
  if (start < 0) return "";
  const end = content.indexOf(nextHeading, start + startHeading.length);
  return (end < 0 ? content.slice(start) : content.slice(start, end)).trimEnd();
}

function replaceSection(content, startHeading, nextHeading, replacement) {
  const start = content.indexOf(startHeading);
  if (start < 0) return content.trimEnd() + "\n\n" + replacement + "\n";
  const end = content.indexOf(nextHeading, start + startHeading.length);
  if (end < 0) return content.slice(0, start) + replacement + "\n";
  return content.slice(0, start) + replacement + "\n\n" + content.slice(end);
}

function sourceSection(ctx, relativePath, startHeading, nextHeading) {
  const content = fs.readFileSync(path.join(ctx.rootDir, "boilerplate", relativePath), "utf8");
  return extractSection(content, startHeading, nextHeading);
}

function patchAgents(ctx, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original;
  if (content.includes("- MVP に含めるもの / 含めないもの")) {
    content = content.replace("- MVP に含めるもの / 含めないもの", AGENTS_DISCOVERY_BULLETS);
  } else if (!containsComparableText(content, "初期提供範囲 / 初期提供範囲に含めないもの")) {
    content = content.replace(
      "- 誰の何の課題を解くか",
      "- 誰の何の課題を解くか\n" + AGENTS_DISCOVERY_BULLETS
    );
  }
  content = content.replaceAll(
    "docs/WORK/0.1/concept_template.md",
    "docs/WORK/0.1/product_definition.md"
  );
  const section = sourceSection(
    ctx,
    "_AGENTS.md",
    "### 5.2 新規プロジェクト開始時の作業順序",
    "### 5.3 skill の使用"
  );
  content = replaceSection(
    content,
    "### 5.2 新規プロジェクト開始時の作業順序",
    "### 5.3 skill の使用",
    section
  );
  return writeIfChanged(targetPath, original, content);
}

function patchDevelopmentGuideline(ctx, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  const section = sourceSection(
    ctx,
    path.join("docs", "DEVELOPMENT_GUIDELINE.md"),
    "## 6. 新規アプリケーション開始プロセス",
    "## 7. platform guideline の扱い"
  );
  const content = replaceSection(
    original,
    "## 6. 新規アプリケーション開始プロセス",
    "## 7. platform guideline の扱い",
    section
  );
  return writeIfChanged(targetPath, original, content);
}

function patchDocumentation(ctx, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  const section = sourceSection(
    ctx,
    path.join("docs", "DOCUMENTATION.md"),
    "## 7. 新規プロジェクト開始時の文書運用",
    "## 8. セッション運用"
  );
  let content = replaceSection(
    original,
    "## 7. 新規プロジェクト開始時の文書運用",
    "## 8. セッション運用",
    section
  );
  content = content.replace("- MVP に含めるもの / 含めないもの", AGENTS_DISCOVERY_BULLETS);
  return writeIfChanged(targetPath, original, content);
}

function patchWorkReadme(ctx, targetPath) {
  const source = fs.readFileSync(
    path.join(ctx.rootDir, "boilerplate", "docs", "WORK", "0.1", "README.md"),
    "utf8"
  );
  if (!fs.existsSync(targetPath)) {
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, source, "utf8");
    return true;
  }
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original.replaceAll("concept_template.md", "product_definition.md");
  if (!containsComparableText(content, "役割:")) {
    content = content.trimEnd() + "\n\n" + source.slice(source.indexOf("役割:"));
  }
  return writeIfChanged(targetPath, original, content);
}

function patchSkillReadme(targetPath) {
  const entry = "- `project-bootstrap`: 対話的な要求開発、技術・非機能要件の検討、PoC と初期実用提供の段階設計から WBS までを補助する。";
  let content = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "# skills\n";
  const original = content;
  if (/^- `project-bootstrap`:.*$/m.test(content)) {
    content = content.replace(/^- `project-bootstrap`:.*$/m, entry);
  } else {
    content = content.trimEnd() + "\n" + entry + "\n";
  }
  return writeIfChanged(targetPath, original, content);
}

function copyProductDocument(ctx) {
  const sourcePath = path.join(
    ctx.rootDir,
    "boilerplate",
    "docs",
    "WORK",
    "0.1",
    "product_definition.md"
  );
  const targetPath = path.join(
    ctx.targetRoot,
    "docs",
    "WORK",
    "0.1",
    "product_definition.md"
  );
  if (fs.existsSync(targetPath)) return false;
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function patchBootstrapAdoption(targetPath, skillTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const historyEntry =
    "  - " + timestamp + ": Applied project-bootstrap-planning feature from project-bootstrap-kit";
  const filesEntry = [
    "  - " + timestamp,
    "    - docs/WORK/0.1/product_definition.md",
    "    - updated initial project planning guidance",
    ...skillTargets.map((item) => "    - " + item),
  ].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = content.trimEnd() + "\n- Upgrade History:\n" + historyEntry + "\n";
  } else if (!content.includes("Applied project-bootstrap-planning feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, body, next) => {
      return "- Upgrade History:\n" + body.replace(/\n+$/, "") + "\n" + historyEntry + next;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = content.trimEnd() + "\n- Upgrade Added Files:\n" + filesEntry + "\n";
  } else if (!content.includes("updated initial project planning guidance")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, body) => {
      return "- Upgrade Added Files:\n" + body.replace(/\n+$/, "") + "\n" + filesEntry + "\n";
    });
  }
  return writeIfChanged(targetPath, original, content);
}

function skillStatuses(ctx) {
  if (!ctx.aiSurface) {
    return [{
      label: ".agents/skills/project-bootstrap/ or .claude/skills/project-bootstrap/",
      status: "WARN",
    }];
  }
  const source = path.join(ctx.rootDir, "boilerplate", "skills", "project-bootstrap");
  const results = [];
  for (const root of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
    const target = path.join(root, "project-bootstrap");
    results.push({
      label: path.relative(ctx.targetRoot, target) + "/",
      status: !fs.existsSync(target)
        ? "ADD"
        : hashDirectory(source) === hashDirectory(target) ? "SKIP(SAME)" : "UPDATE",
    });
    const readme = path.join(root, "README.md");
    results.push({
      label: path.relative(ctx.targetRoot, readme),
      status: containsComparableText(readIfExists(readme), "対話的な要求開発")
        ? "SKIP(SAME)"
        : fs.existsSync(readme) ? "UPDATE" : "ADD",
    });
  }
  return results;
}

function getStatus(ctx) {
  const results = [];
  const sourceProduct = path.join(
    ctx.rootDir,
    "boilerplate",
    "docs",
    "WORK",
    "0.1",
    "product_definition.md"
  );
  const targetProduct = path.join(
    ctx.targetRoot,
    "docs",
    "WORK",
    "0.1",
    "product_definition.md"
  );
  results.push({
    label: "docs/WORK/0.1/product_definition.md",
    status: !fs.existsSync(targetProduct)
      ? "ADD"
      : fs.readFileSync(sourceProduct, "utf8") === fs.readFileSync(targetProduct, "utf8")
        ? "SKIP(SAME)" : "SKIP(KEEP)",
  });
  if (fs.existsSync(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "concept_template.md"))) {
    results.push({ label: "docs/WORK/0.1/concept_template.md", status: "SKIP(KEEP)" });
  }
  const agents = readIfExists(path.join(ctx.targetRoot, "AGENTS.md"));
  results.push({
    label: "AGENTS.md",
    status:
      containsComparableText(agents, "product_definition.md") &&
      containsComparableText(agents, "初期構想の整理では project-bootstrap skill を使用")
        ? "SKIP(SAME)" : "UPDATE",
  });
  const development = readIfExists(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"));
  results.push({
    label: "docs/DEVELOPMENT_GUIDELINE.md",
    status:
      containsComparableText(development, "### 6.2 開発成熟度") &&
      containsComparableText(development, "### 6.4 非機能要件の初期整理")
        ? "SKIP(SAME)" : "UPDATE",
  });
  const documentation = readIfExists(path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"));
  results.push({
    label: "docs/DOCUMENTATION.md",
    status:
      containsComparableText(documentation, "product_definition.md") &&
      containsComparableText(documentation, "### 7.3 開発成熟度とフェーズ") &&
      containsComparableText(documentation, "### 7.5 技術候補と非機能要件")
        ? "SKIP(SAME)" : "UPDATE",
  });
  const workReadmePath = path.join(ctx.targetRoot, "docs", "WORK", "0.1", "README.md");
  const workReadme = readIfExists(workReadmePath);
  results.push({
    label: "docs/WORK/0.1/README.md",
    status:
      containsComparableText(workReadme, "product_definition.md") &&
      containsComparableText(workReadme, "要求、初期提供範囲、技術構成、非機能要件")
        ? "SKIP(SAME)" : fs.existsSync(workReadmePath) ? "UPDATE" : "ADD",
  });
  results.push(...skillStatuses(ctx));
  const adoption = readIfExists(path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: adoption.includes("Applied project-bootstrap-planning feature from project-bootstrap-kit")
      ? "SKIP(SAME)" : "UPDATE",
  });
  return results;
}

export function dryRun(ctx) {
  const results = getStatus(ctx);
  console.log("");
  printSection("Project Bootstrap Planning Diff");
  for (const item of results) console.log("[" + item.status + "] " + item.label);
  const count = (status) => results.filter((item) => item.status === status).length;
  console.log("");
  console.log(
    "Result: " + count("ADD") + " add, " + count("UPDATE") + " update, " +
    count("SKIP(SAME)") + " skip(same), " + count("SKIP(KEEP)") +
    " skip(keep), " + count("WARN") + " warn."
  );
  printDryRunSummary([
    "1. SKIP(KEEP) は既存の初期構想文書を保全する項目です。",
    "2. WARN が出た場合は --ai-surface codex|rovo|claude|both を指定してください。",
    "3. --diff の内容を確認し、問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const productAdded = copyProductDocument(ctx);
  const skillRoots = ctx.aiSurface ? getSkillTargets(ctx.aiSurface, ctx.targetRoot) : [];
  const sourceSkill = path.join(ctx.rootDir, "boilerplate", "skills", "project-bootstrap");
  const copiedSkills = [];
  for (const root of skillRoots) {
    const target = path.join(root, "project-bootstrap");
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
    ensureDir(target);
    copyRecursive(sourceSkill, target);
    copiedSkills.push(path.relative(ctx.targetRoot, target) + "/");
  }
  const results = [
    ["docs/WORK/0.1/product_definition.md", productAdded],
    ["AGENTS.md", patchAgents(ctx, path.join(ctx.targetRoot, "AGENTS.md"))],
    [
      "docs/DEVELOPMENT_GUIDELINE.md",
      patchDevelopmentGuideline(ctx, path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md")),
    ],
    [
      "docs/DOCUMENTATION.md",
      patchDocumentation(ctx, path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md")),
    ],
    [
      "docs/WORK/0.1/README.md",
      patchWorkReadme(ctx, path.join(ctx.targetRoot, "docs", "WORK", "0.1", "README.md")),
    ],
    ...skillRoots.map((root) => [
      path.relative(ctx.targetRoot, path.join(root, "README.md")),
      patchSkillReadme(path.join(root, "README.md")),
    ]),
    [
      "docs/BOOTSTRAP_ADOPTION.md",
      patchBootstrapAdoption(
        path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"),
        copiedSkills
      ),
    ],
  ];
  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of results) {
    console.log((changed ? "[APPLY] " : "[SKIP] ") + label);
  }
  for (const skill of copiedSkills) console.log("[APPLY] " + skill);
  if (!ctx.aiSurface) {
    console.log("[WARN] project-bootstrap skill was not updated because --ai-surface was not specified.");
  }
  if (fs.existsSync(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "concept_template.md"))) {
    console.log("[SKIP(KEEP)] docs/WORK/0.1/concept_template.md");
  }
  console.log("");
  console.log("Result: project-bootstrap-planning feature was applied.");
  printDryRunSummary([
    "1. 既存の初期構想文書が保持されていることを確認してください。",
    "2. 規範文書の差分がプロジェクト固有ルールと矛盾しないか確認してください。",
    "3. 新しい初期構想や再構想時に product_definition.md と project-bootstrap skill を利用してください。",
  ], "<<< Upgrade apply completed. >>>");
}
