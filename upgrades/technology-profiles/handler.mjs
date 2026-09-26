import fs from "node:fs";
import path from "node:path";
import {
  applyTechnologyProfiles,
  getTechnologyProfileStatuses,
  loadTechnologyProfile,
} from "../../scripts/technology-profile-lib.mjs";
import {
  copyRecursive,
  ensureDir,
  getSkillTargets,
  hashDirectory,
  normalizeComparableText,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "docs/TECHNOLOGY/",
    summary: "Add a composable Technology Profile index and project-specific adoption record",
    locations: [
      "Install zero or more profiles selected with repeatable --technology-profile options",
      "Keep project-specific decisions in ADOPTION.md",
      "Load only profiles related to the current task",
    ],
  },
  {
    file: "AGENTS.md / docs/DEVELOPMENT_GUIDELINE.md / docs/DOCUMENTATION.md",
    summary: "Replace the single platform guideline workflow with the Technology Profile lifecycle",
    locations: [
      "Allow profile selection during or after WORK/0.1",
      "Update adoption decisions during implementation and operations",
      "Extract cross-project knowledge at milestone and phase close",
    ],
  },
  {
    file: "legacy docs/PLATFORM_GUIDELINE.md",
    summary: "Safely migrate the legacy single-profile document",
    locations: [
      "Delete it only when equivalent to the selected profile guideline",
      "Move customized content to LEGACY_PLATFORM_GUIDELINE.md for manual review",
      "Keep it in place and report WARN when no single matching profile is selected",
    ],
  },
];

const COMMON_SKILLS = [
  "technology-profile-governance",
  "knowledge-feedback",
  "project-bootstrap",
  "phase-transition",
];
const SKILL_README_ENTRIES = [
  "- `technology-profile-governance`: 複数Technology Profileの選定、後付け、採否記録、継続更新を補助する。",
  "- `knowledge-feedback`: Technology Profileに限らず、文書運用、初期構想、WBS、skill、script、test、運用を含むkit全体の改善知識を抽出する。",
];

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeIfChanged(filePath, content) {
  const original = readIfExists(filePath);
  if (content === original) return false;
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
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
  if (start < 0 || !replacement) return content;
  const end = content.indexOf(nextHeading, start + startHeading.length);
  if (end < 0) return `${content.slice(0, start)}${replacement}\n`;
  return `${content.slice(0, start)}${replacement}\n\n${content.slice(end)}`;
}

function sourceSection(ctx, relativePath, startHeading, nextHeading) {
  return extractSection(
    fs.readFileSync(path.join(ctx.rootDir, "boilerplate", relativePath), "utf8"),
    startHeading,
    nextHeading
  );
}

function appendAfter(content, marker, addition) {
  if (normalizeComparableText(content).includes(normalizeComparableText(addition))) return content;
  if (!content.includes(marker)) return content;
  return content.replace(marker, `${marker}\n${addition}`);
}

function buildSkillReadme(content) {
  let updated = content || "# skills\n";
  for (const entry of SKILL_README_ENTRIES) {
    const skillName = entry.match(/`([^`]+)`/)?.[1];
    if (skillName && !updated.includes(`\`${skillName}\``)) {
      updated = `${updated.trimEnd()}\n${entry}\n`;
    }
  }
  return updated;
}

function patchAgents(ctx, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original
    .replaceAll("docs/PLATFORM_GUIDELINE.md", "docs/TECHNOLOGY/INDEX.md")
    .replaceAll("PLATFORM_GUIDELINE", "TECHNOLOGY");
  const principle = sourceSection(
    ctx,
    "_AGENTS.md",
    "- **原則8: Technology Profile の適用**",
    "- **原則9: versioning ルールの遵守**"
  );
  content = replaceSection(
    content,
    content.includes("- **原則8: platform guideline の優先**")
      ? "- **原則8: platform guideline の優先**"
      : "- **原則8: Technology Profile の適用**",
    "- **原則9: versioning ルールの遵守**",
    principle
  );
  const initialCheck = sourceSection(
    ctx,
    "_AGENTS.md",
    "1. **プロジェクト状態の把握**",
    "2. **前回セッションの確認**"
  );
  content = replaceSection(
    content,
    "1. **プロジェクト状態の把握**",
    "2. **前回セッションの確認**",
    initialCheck
  );
  content = replaceSection(
    content,
    "### 4.5 フェーズ移行時の処理",
    "### 4.6 capture inbox の運用",
    sourceSection(ctx, "_AGENTS.md", "### 4.5 フェーズ移行時の処理", "### 4.6 capture inbox の運用")
  );
  content = replaceSection(
    content,
    "### 5.2 新規プロジェクト開始時の作業順序",
    "### 5.3 skill の使用",
    sourceSection(ctx, "_AGENTS.md", "### 5.2 新規プロジェクト開始時の作業順序", "### 5.3 skill の使用")
  );
  content = appendAfter(
    content,
    "- 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか",
    "- 採用候補または採用済み技術に対応するTechnology Profileがあるか\n- profileを初期化時に選択していない場合、WORK/0.1完了までに追加するか"
  );
  content = appendAfter(
    content,
    "- `[x]` への変更と次回再開プロンプトの確定更新は、ユーザーがレビュー完了または受入完了を明示した後に行う",
    "- 技術選定ADRを確定した場合、恒常的な実装ルールとプロセス規律をガイドラインへ昇格する必要があるか確認する\n- profileと異なる知見、production実証、失敗事例を得た場合は `docs/TECHNOLOGY/ADOPTION.md` を更新し、knowledge feedback候補として捕捉する"
  );
  if (!content.includes("WBSマイルストーンのクローズ時は、Technology Profileの採否")) {
    content = appendAfter(
      content,
      "- profileと異なる知見、production実証、失敗事例を得た場合は `docs/TECHNOLOGY/ADOPTION.md` を更新し、knowledge feedback候補として捕捉する",
      "- WBSマイルストーンのクローズ時は、Technology Profileの採否と汎用知識の有無を確認する"
    );
  }
  if (!content.includes("skills/technology-profile-governance/")) {
    content = appendAfter(
      content,
      "- `skills/capture-inbox/`\n  - 作業中の気づき、課題、疑問を `docs/WORK/inbox/` に捕捉する",
      "- `skills/technology-profile-governance/`\n  - 複数Technology Profileの選定、後付け、採否記録、継続更新を補助する"
    );
  }
  if (!content.includes("skills/knowledge-feedback/")) {
    content = appendAfter(
      content,
      "- `skills/technology-profile-governance/`\n  - 複数Technology Profileの選定、後付け、採否記録、継続更新を補助する",
      "- `skills/knowledge-feedback/`\n  - Technology Profileに限らず、文書運用、初期構想、WBS、skill、script、test、運用を含むkit全体の改善知識を抽出する"
    );
  }
  if (!content.includes("project-bootstrap-kitへ還元する汎用知識の抽出")) {
    content = appendAfter(
      content,
      "見送り事項は、後続フェーズ計画時に忘れず再検討できるよう、再検討タイミング、再検討観点、根拠文書を持つ台帳として残す。",
      "\nフェーズ移行時は、Technology Profileの採否・例外・一次検証を棚卸しし、他プロジェクトへ還元できる汎用知識を `knowledge-feedback` skillで抽出する。"
    );
  }
  return writeIfChanged(targetPath, content);
}

function patchDevelopment(ctx, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original.replaceAll("docs/PLATFORM_GUIDELINE.md", "docs/TECHNOLOGY/INDEX.md");
  if (!content.includes("- `docs/TECHNOLOGY/*`")) {
    content = appendAfter(
      content,
      "- `docs/VERSIONING.md`\n  - version 管理のルール",
      "- `docs/TECHNOLOGY/*`\n  - 選択済み技術のguideline、実証reference、プロジェクト固有の採否"
    );
  }
  const lifecycle = sourceSection(
    ctx,
    path.join("docs", "DEVELOPMENT_GUIDELINE.md"),
    "## 7. Technology Profileのライフサイクル",
    "## 8."
  );
  const oldHeading = content.includes("## 7. platform guideline の扱い")
    ? "## 7. platform guideline の扱い"
    : "## 7. Technology Profileのライフサイクル";
  content = replaceSection(content, oldHeading, "## 8.", lifecycle);
  if (oldHeading === "## 7. platform guideline の扱い" && !content.includes(lifecycle)) {
    content = `${content.trimEnd()}\n\n${lifecycle}\n`;
  }
  if (!content.includes("### 3.7 WBSマイルストーンクローズ時の技術知識レビュー")) {
    const milestoneReview = sourceSection(
      ctx,
      path.join("docs", "DEVELOPMENT_GUIDELINE.md"),
      "### 3.7 WBSマイルストーンクローズ時の技術知識レビュー",
      "## 4. 設計ガイドライン"
    );
    if (content.includes("## 4. 設計ガイドライン")) {
      content = content.replace("## 4. 設計ガイドライン", `${milestoneReview}\n\n## 4. 設計ガイドライン`);
    }
  }
  if (!content.includes("技術選定ADRを確定した場合")) {
    content = appendAfter(
      content,
      "- 外部公開または外部連携されるエンドポイントを持つプロジェクトでは、API / Webhook / Callback / Request URL などの FQDN と環境別構成を設計対象に含める",
      "- 技術選定ADRを確定した場合は、恒常的な実装規約とプロセス規律のガイドライン昇格要否を確認する"
    );
  }
  if (!content.includes("Technology Profileは")) {
    content = appendAfter(
      content,
      "AI は推奨案と理由を提示できるが、未確認の前提を補って技術構成を確定してはならない。",
      "\nTechnology Profileは初期化時に未指定でもよい。WORK/0.1で採用技術が確定した時点、または実装着手判定までに追加要否を判断する。"
    );
  }
  content = replaceSection(
    content,
    "### 6.1 標準フロー",
    "### 6.2 開発成熟度",
    sourceSection(
      ctx,
      path.join("docs", "DEVELOPMENT_GUIDELINE.md"),
      "### 6.1 標準フロー",
      "### 6.2 開発成熟度"
    )
  );
  return writeIfChanged(targetPath, content);
}

function patchDocumentation(ctx, targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original.replaceAll("docs/PLATFORM_GUIDELINE.md", "docs/TECHNOLOGY/INDEX.md");
  content = content.replace(
    /├── PLATFORM_GUIDELINE\.md[^\n]*\n/u,
    "├── TECHNOLOGY/\n│   ├── INDEX.md\n│   ├── ADOPTION.md\n│   └── <profile-id>/\n"
  );
  if (!content.includes("- `TECHNOLOGY/`")) {
    content = appendAfter(
      content,
      "- `WORK/x.y/`\n  - 特定マイルストーン `x.y` に閉じる作業文書",
      "- `TECHNOLOGY/`\n  - 複数の採用技術に対するprofile、プロジェクト固有の採否、実証知識への導線"
    );
  }
  const technologySection = sourceSection(
    ctx,
    path.join("docs", "DOCUMENTATION.md"),
    "## 10. Technology Profileの文書運用",
    "## 11. skills の位置づけ"
  );
  const startHeading = content.includes("## 10. platform guideline の扱い")
    ? "## 10. platform guideline の扱い"
    : "## 10. Technology Profileの文書運用";
  content = replaceSection(content, startHeading, "## 11. skills の位置づけ", technologySection);
  content = replaceSection(
    content,
    "### 7.1 初期構想は `WORK/0.1/` から始める",
    "### 7.2 初期構想文書",
    sourceSection(
      ctx,
      path.join("docs", "DOCUMENTATION.md"),
      "### 7.1 初期構想は `WORK/0.1/` から始める",
      "### 7.2 初期構想文書"
    )
  );
  content = replaceSection(
    content,
    "### 8.1 セッション開始時に確認するもの",
    "### 8.2 実装前に明示すること",
    sourceSection(
      ctx,
      path.join("docs", "DOCUMENTATION.md"),
      "### 8.1 セッション開始時に確認するもの",
      "### 8.2 実装前に明示すること"
    )
  );
  content = replaceSection(
    content,
    "## 11. skills の位置づけ",
    "## 12. この運用で目指す状態",
    sourceSection(
      ctx,
      path.join("docs", "DOCUMENTATION.md"),
      "## 11. skills の位置づけ",
      "## 12. この運用で目指す状態"
    )
  );
  if (!content.includes("### 6.5 技術選定ADRからのガイドライン昇格")) {
    const promotionSections = sourceSection(
      ctx,
      path.join("docs", "DOCUMENTATION.md"),
      "### 6.5 技術選定ADRからのガイドライン昇格",
      "## 7. 新規プロジェクト開始時の文書運用"
    );
    if (content.includes("## 7. 新規プロジェクト開始時の文書運用")) {
      content = content.replace(
        "## 7. 新規プロジェクト開始時の文書運用",
        `${promotionSections}\n\n## 7. 新規プロジェクト開始時の文書運用`
      );
    }
  }
  if (!content.includes("kit_feedback_export_yyyymmdd_<neutral-slug>.md")) {
    content = appendAfter(
      content,
      "- 完了済み `PLAN_PHASE_CURRENT.md` が `history` に退避されているか",
      "- `docs/TECHNOLOGY/ADOPTION.md` の採否、例外、一次検証、後続検討が更新されているか\n- 他プロジェクトへ還元できる知識が抽出されているか"
    );
  }
  return writeIfChanged(targetPath, content);
}

function patchIndex(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original.replace(
    /- プラットフォーム制約:.*\n/u,
    "- Technology Profiles: [TECHNOLOGY/INDEX.md](./TECHNOLOGY/INDEX.md)\n- Technology Profile採否: [TECHNOLOGY/ADOPTION.md](./TECHNOLOGY/ADOPTION.md)\n"
  );
  if (!content.includes("TECHNOLOGY/INDEX.md")) {
    content = appendAfter(
      content,
      "- バージョニングガイド: [VERSIONING.md](./VERSIONING.md)",
      "- Technology Profiles: [TECHNOLOGY/INDEX.md](./TECHNOLOGY/INDEX.md)\n- Technology Profile採否: [TECHNOLOGY/ADOPTION.md](./TECHNOLOGY/ADOPTION.md)"
    );
  }
  return writeIfChanged(targetPath, content);
}

function patchWorkReadme(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  let content = original;
  if (!content.includes("採用技術は初期化時に未確定でもよい")) {
    content = `${content.trimEnd()}\n\n採用技術は初期化時に未確定でもよい。技術候補が確定した時点で \`docs/TECHNOLOGY/INDEX.md\` と \`ADOPTION.md\` を確認し、必要なTechnology Profileを追加する。\n`;
  }
  return writeIfChanged(targetPath, content);
}

function patchImplementationReadyChecklist(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  const marker = "- [ ] 主要な技術候補、制約、判断理由、事前検証事項が整理されている";
  const additions = "- [ ] 採用技術に対応するTechnology Profileの追加要否が判断されている\n- [ ] 選択済みprofileの初期採否、例外、未決事項が `docs/TECHNOLOGY/ADOPTION.md` に記録されている\n- [ ] profile未収録技術について、公式一次情報の確認と制約整理が行われている";
  const content = normalizeComparableText(original).includes(normalizeComparableText(additions))
    ? original
    : appendAfter(original, marker, additions);
  return writeIfChanged(targetPath, content);
}

function commonSkillStatuses(ctx) {
  if (!ctx.aiSurface) return [{ label: "common Technology Profile skills", status: "WARN" }];
  const results = [];
  for (const skillName of COMMON_SKILLS) {
    const source = path.join(ctx.rootDir, "boilerplate", "skills", skillName);
    for (const skillRoot of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
      const target = path.join(skillRoot, skillName);
      results.push({
        label: `${path.relative(ctx.targetRoot, target)}/`,
        status: !fs.existsSync(target)
          ? "ADD"
          : hashDirectory(source) === hashDirectory(target)
            ? "SKIP(SAME)"
            : "UPDATE",
      });
    }
  }
  for (const skillRoot of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
    const readmePath = path.join(skillRoot, "README.md");
    const current = readIfExists(readmePath);
    results.push({
      label: path.relative(ctx.targetRoot, readmePath),
      status: buildSkillReadme(current) === current
        ? "SKIP(SAME)"
        : fs.existsSync(readmePath) ? "UPDATE" : "ADD",
    });
  }
  return results;
}

function applyCommonSkills(ctx) {
  const results = [];
  if (!ctx.aiSurface) return [{ label: "common Technology Profile skills", status: "WARN" }];
  for (const skillName of COMMON_SKILLS) {
    const source = path.join(ctx.rootDir, "boilerplate", "skills", skillName);
    for (const skillRoot of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
      const target = path.join(skillRoot, skillName);
      const status = !fs.existsSync(target)
        ? "ADD"
        : hashDirectory(source) === hashDirectory(target)
          ? "SKIP(SAME)"
          : "UPDATE";
      if (status === "ADD" || status === "UPDATE") {
        if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
        ensureDir(target);
        copyRecursive(source, target);
      }
      results.push({ label: `${path.relative(ctx.targetRoot, target)}/`, status });
    }
  }
  for (const skillRoot of getSkillTargets(ctx.aiSurface, ctx.targetRoot)) {
    const readmePath = path.join(skillRoot, "README.md");
    const current = readIfExists(readmePath);
    const updated = buildSkillReadme(current);
    const status = updated === current
      ? "SKIP(SAME)"
      : fs.existsSync(readmePath) ? "UPDATE" : "ADD";
    if (status === "ADD" || status === "UPDATE") writeIfChanged(readmePath, updated);
    results.push({ label: path.relative(ctx.targetRoot, readmePath), status });
  }
  return results;
}

function legacyGuidelineStatus(ctx) {
  const legacyPath = path.join(ctx.targetRoot, "docs", "PLATFORM_GUIDELINE.md");
  if (!fs.existsSync(legacyPath)) return { label: "docs/PLATFORM_GUIDELINE.md", status: "SKIP(SAME)" };
  if (ctx.technologyProfiles.length === 0) {
    return { label: "docs/PLATFORM_GUIDELINE.md", status: "WARN" };
  }
  const normalizedLegacy = readIfExists(legacyPath)
    .replace(/^# PLATFORM GUIDELINE: GAS/m, "# TECHNOLOGY GUIDELINE: Google Apps Script")
    .replace(/^# PLATFORM GUIDELINE: Questetra/m, "# TECHNOLOGY GUIDELINE: Questetra")
    .replace(/^# PLATFORM GUIDELINE: Slack/m, "# TECHNOLOGY GUIDELINE: Slack");
  const exactMatches = [];
  for (const profileId of ctx.technologyProfiles) {
    const profile = loadTechnologyProfile(path.join(ctx.rootDir, "profiles"), profileId);
    const source = readIfExists(path.join(ctx.rootDir, "profiles", profile.id, profile.guideline));
    if (normalizeComparableText(normalizedLegacy) === normalizeComparableText(source)) {
      exactMatches.push(profileId);
    }
  }
  if (exactMatches.length === 1) {
    return { label: "docs/PLATFORM_GUIDELINE.md", status: "DELETE", profileId: exactMatches[0] };
  }

  const headingMappings = [
    [/^# (?:PLATFORM GUIDELINE: GAS|TECHNOLOGY GUIDELINE: Google Apps Script)/m, "gas"],
    [/^# (?:PLATFORM|TECHNOLOGY) GUIDELINE: Questetra/m, "questetra"],
    [/^# (?:PLATFORM|TECHNOLOGY) GUIDELINE: Slack/m, "slack"],
    [/^# (?:PLATFORM|TECHNOLOGY) GUIDELINE: Cloudflare Workers/m, "cloudflare-workers"],
  ];
  const originalLegacy = readIfExists(legacyPath);
  const headingMatch = headingMappings.find(([pattern, profileId]) =>
    pattern.test(originalLegacy) && ctx.technologyProfiles.includes(profileId)
  );
  const profileId = headingMatch?.[1] ?? (ctx.technologyProfiles.length === 1 ? ctx.technologyProfiles[0] : "");
  if (!profileId) return { label: "docs/PLATFORM_GUIDELINE.md", status: "WARN" };

  const destination = path.join(ctx.targetRoot, "docs", "TECHNOLOGY", profileId, "LEGACY_PLATFORM_GUIDELINE.md");
  return {
    label: "docs/PLATFORM_GUIDELINE.md",
    status: fs.existsSync(destination) ? "WARN" : "MOVE(KEEP)",
    profileId,
  };
}

function migrateLegacyGuideline(ctx) {
  const result = legacyGuidelineStatus(ctx);
  const legacyPath = path.join(ctx.targetRoot, "docs", "PLATFORM_GUIDELINE.md");
  if (result.status === "DELETE") {
    fs.rmSync(legacyPath);
  } else if (result.status === "MOVE(KEEP)") {
    const destination = path.join(ctx.targetRoot, "docs", "TECHNOLOGY", result.profileId, "LEGACY_PLATFORM_GUIDELINE.md");
    ensureDir(path.dirname(destination));
    fs.copyFileSync(legacyPath, destination);
    fs.rmSync(legacyPath);
  }
  return result;
}

function coreStatuses(ctx) {
  const checks = [
    ["AGENTS.md", ["Technology Profile の適用", "WBSマイルストーンのクローズ時は、Technology Profileの採否"]],
    ["docs/DEVELOPMENT_GUIDELINE.md", ["## 7. Technology Profileのライフサイクル", "### 3.7 WBSマイルストーンクローズ時の技術知識レビュー"]],
    ["docs/DOCUMENTATION.md", ["## 10. Technology Profileの文書運用", "### 6.5 技術選定ADRからのガイドライン昇格"]],
    ["docs/INDEX.md", ["TECHNOLOGY/INDEX.md"]],
    ["docs/WORK/0.1/README.md", ["採用技術は初期化時に未確定でもよい"]],
    ["docs/WORK/0.1/implementation_ready_checklist.md", ["Technology Profileの追加要否が判断されている"]],
  ];
  return checks.map(([relativePath, markers]) => {
    const targetPath = path.join(ctx.targetRoot, relativePath);
    const content = normalizeComparableText(readIfExists(targetPath));
    return {
      label: relativePath,
      status: !fs.existsSync(targetPath)
        ? "WARN"
        : markers.every((marker) => content.includes(normalizeComparableText(marker)))
          ? "SKIP(SAME)"
          : "UPDATE",
    };
  });
}

function patchBootstrapAdoption(ctx, changed) {
  const targetPath = path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  if (!fs.existsSync(targetPath) || !changed) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  const timestamp = nowTimestamp();
  const profileLabel = ctx.technologyProfiles.join(", ") || "system-only";
  const marker = `Applied technology-profiles feature: ${profileLabel}`;
  if (original.includes(marker)) return false;
  const historyEntry = `  - ${timestamp}: ${marker}`;
  const fileLines = [
    `  - ${timestamp}`,
    "    - docs/TECHNOLOGY/",
    ...ctx.technologyProfiles.map((profileId) => `    - technology profile: ${profileId}`),
  ].join("\n");
  let content = original;
  const installed = new Set();
  const currentMatch = content.match(/^- Technology Profiles:\s*(.*)$/m);
  if (currentMatch && currentMatch[1] !== "none") {
    for (const item of currentMatch[1].split(",").map((value) => value.trim()).filter(Boolean)) installed.add(item);
  }
  for (const profileId of ctx.technologyProfiles) installed.add(profileId);
  if (currentMatch) {
    content = content.replace(/^- Technology Profiles:.*$/m, `- Technology Profiles: ${[...installed].sort().join(", ") || "none"}`);
  } else {
    content = content.replace("- Platform Profile:", `- Technology Profiles: ${[...installed].sort().join(", ") || "none"}\n- Platform Profile:`);
  }
  if (content.includes("Upgrade History:")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, body, next) => {
      return `- Upgrade History:\n${body.replace(/\n+$/, "")}\n${historyEntry}${next}`;
    });
  } else {
    content = `${content.trimEnd()}\n- Upgrade History:\n${historyEntry}\n`;
  }
  if (content.includes("Upgrade Added Files:")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, body) => {
      return `- Upgrade Added Files:\n${body.replace(/\n+$/, "")}\n${fileLines}\n`;
    });
  } else {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${fileLines}\n`;
  }
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function allStatuses(ctx) {
  const profileStatuses = getTechnologyProfileStatuses({
    rootDir: ctx.rootDir,
    profilesDir: path.join(ctx.rootDir, "profiles"),
    targetRoot: ctx.targetRoot,
    profileIds: ctx.technologyProfiles,
    aiSurface: ctx.aiSurface,
  });
  const results = [
    ...profileStatuses,
    ...coreStatuses(ctx),
    ...commonSkillStatuses(ctx),
    legacyGuidelineStatus(ctx),
  ];
  const changed = results.some((item) => ["ADD", "UPDATE", "DELETE", "MOVE(KEEP)"].includes(item.status));
  results.push({ label: "docs/BOOTSTRAP_ADOPTION.md", status: changed ? "UPDATE" : "SKIP(SAME)" });
  return results;
}

function printResults(results) {
  for (const item of results) console.log(`[${item.status}] ${item.label}`);
  const count = (status) => results.filter((item) => item.status === status).length;
  console.log("");
  console.log(
    `Result: ${count("ADD")} add, ${count("UPDATE")} update, ${count("DELETE")} delete, ${count("MOVE(KEEP)")} move(keep), ${count("SKIP(SAME)")} skip(same), ${count("SKIP(KEEP)")} skip(keep), ${count("WARN")} warn.`
  );
}

export function dryRun(ctx) {
  if (!ctx.aiSurface) {
    console.log("");
    printSection("Technology Profiles Diff");
    console.log("[WARN] --ai-surface is required for technology-profiles");
    printDryRunSummary([
      "1. --ai-surface codex|rovo|claude|both を指定して再実行してください。",
    ]);
    return;
  }
  let results;
  try {
    results = allStatuses(ctx);
  } catch (error) {
    console.log("");
    printSection("Technology Profiles Diff");
    console.log(`[WARN] ${error.message}`);
    printDryRunSummary(["1. --technology-profileで利用可能なprofile idを指定してください。"]);
    return;
  }
  console.log("");
  printSection("Technology Profiles Diff");
  printResults(results);
  printDryRunSummary([
    "1. profileは初期化時に未指定でもよく、WORK/0.1で技術確定後に追加できます。",
    "2. SKIP(KEEP)とMOVE(KEEP)は既存のプロジェクト固有文書を保全します。",
    "3. WARNがある場合はlegacy guideline、profile id、ai-surfaceを確認してください。",
    "4. --diffを確認し、問題なければ--applyを付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  if (!ctx.aiSurface) {
    console.log("");
    printSection("Apply Result");
    console.log("[WARN] --ai-surface is required for technology-profiles");
    printDryRunSummary([
      "1. --ai-surface codex|rovo|claude|both を指定して再実行してください。",
    ], "<<< Upgrade apply stopped. >>>");
    return;
  }
  const legacyBefore = legacyGuidelineStatus(ctx);
  if (legacyBefore.status === "WARN") {
    console.log("");
    printSection("Apply Result");
    console.log("[WARN] docs/PLATFORM_GUIDELINE.md could not be mapped safely");
    printDryRunSummary([
      "1. legacy guidelineに対応する --technology-profile を指定してください。",
      "2. 複数候補がある場合は、見出しまたは内容を確認して対応profileを明確にしてください。",
      "3. 対応付けできない場合は、手作業で内容を保全してから再実行してください。",
    ], "<<< Upgrade apply stopped. >>>");
    return;
  }
  let before;
  try {
    before = allStatuses(ctx);
  } catch (error) {
    console.log("");
    printSection("Apply Result");
    console.log(`[WARN] ${error.message}`);
    printDryRunSummary(["1. profile idを確認して再実行してください。"], "<<< Upgrade apply stopped. >>>");
    return;
  }

  const results = applyTechnologyProfiles({
    rootDir: ctx.rootDir,
    profilesDir: path.join(ctx.rootDir, "profiles"),
    targetRoot: ctx.targetRoot,
    profileIds: ctx.technologyProfiles,
    aiSurface: ctx.aiSurface,
  });
  results.push(
    { label: "AGENTS.md", status: patchAgents(ctx, path.join(ctx.targetRoot, "AGENTS.md")) ? "UPDATE" : "SKIP(SAME)" },
    { label: "docs/DEVELOPMENT_GUIDELINE.md", status: patchDevelopment(ctx, path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md")) ? "UPDATE" : "SKIP(SAME)" },
    { label: "docs/DOCUMENTATION.md", status: patchDocumentation(ctx, path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md")) ? "UPDATE" : "SKIP(SAME)" },
    { label: "docs/INDEX.md", status: patchIndex(path.join(ctx.targetRoot, "docs", "INDEX.md")) ? "UPDATE" : "SKIP(SAME)" },
    { label: "docs/WORK/0.1/README.md", status: patchWorkReadme(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "README.md")) ? "UPDATE" : "SKIP(SAME)" },
    { label: "docs/WORK/0.1/implementation_ready_checklist.md", status: patchImplementationReadyChecklist(path.join(ctx.targetRoot, "docs", "WORK", "0.1", "implementation_ready_checklist.md")) ? "UPDATE" : "SKIP(SAME)" },
    ...applyCommonSkills(ctx),
    migrateLegacyGuideline(ctx)
  );
  const changed = before.some((item) => ["ADD", "UPDATE", "DELETE", "MOVE(KEEP)"].includes(item.status));
  results.push({
    label: "docs/BOOTSTRAP_ADOPTION.md",
    status: patchBootstrapAdoption(ctx, changed) ? "UPDATE" : "SKIP(SAME)",
  });

  console.log("");
  printSection("Apply Result");
  printResults(results);
  printDryRunSummary([
    "1. docs/TECHNOLOGY/INDEX.mdとADOPTION.mdを確認してください。",
    "2. profile追加時は初期採否、例外、未決事項をADOPTION.mdへ記入してください。",
    "3. MOVE(KEEP)されたlegacy guidelineは新profileと比較して手作業で統合してください。",
    "4. WORK/0.1、PLAN_PHASE_CURRENT、関連ADRへ技術選定結果を反映してください。",
  ], "<<< Upgrade apply completed. >>>");
}
