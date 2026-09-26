import fs from "node:fs";
import path from "node:path";
import {
  containsComparableText,
  copyRecursive,
  ensureDir,
  getSkillTargets,
  hashDirectory,
  nowTimestamp,
  printSection,
  printDryRunSummary,
  replaceIfMissing,
} from "../../scripts/upgrade-lib.mjs";

export const planDetails = [
  {
    file: "CHANGELOG.md",
    summary: "Add a root ChangeLog template without overwriting an existing history",
    locations: [
      "Add the standard template only when the file is missing",
      "Keep an existing CHANGELOG.md unchanged",
      "Warn when an existing file has no Unreleased section",
    ],
  },
  {
    file: "docs/VERSIONING.md",
    summary: "Add ChangeLog, release-boundary, monorepo, and release-finalization guidance",
    locations: [
      "Keep project-specific version sources and release mechanisms",
      "Insert only missing generic policy sections",
      "Require a root CHANGELOG.md while preserving project-specific version and upgrade sources",
    ],
  },
  {
    file: "AGENTS.md",
    summary: "Add VERSIONING.md references and version-governance skill entries",
    locations: [
      "Replace the '優先する規範' line to include docs/VERSIONING.md",
      "Insert a new '原則9: versioning ルールの遵守' block after the platform guideline principle",
      "Add docs/VERSIONING.md to the session-start document checklist",
      "Expand the implementation checklist reference list with VERSIONING",
      "Append version-governance to the skill list",
    ],
  },
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Add VERSIONING.md and ChangeLog checks to the development workflow",
    locations: [
      "Add a supplement line near the top-level document references",
      "Add docs/VERSIONING.md to the document system section",
      "Add versioning and ChangeLog checks to the implementation pre-check section",
    ],
  },
  {
    file: "docs/INDEX.md",
    summary: "Add direct links to docs/VERSIONING.md and CHANGELOG.md",
    locations: [
      "Insert the VERSIONING.md and root CHANGELOG.md links",
    ],
  },
  {
    file: "docs/BOOTSTRAP_ADOPTION.md",
    summary: "Append an upgrade history entry for the versioning feature",
    locations: [
      "Add a new line under 'Upgrade History:'",
      "Append upgraded skill targets under 'Upgrade Added Files:'",
    ],
  },
];

function extractSection(content, startHeading, nextHeading) {
  const start = content.indexOf(startHeading);
  if (start < 0) return "";
  const end = content.indexOf(nextHeading, start + startHeading.length);
  return (end < 0 ? content.slice(start) : content.slice(start, end)).trimEnd();
}

function insertSectionBefore(content, section, nextHeading) {
  if (!section || content.includes(section.split("\n", 1)[0])) return content;
  if (!content.includes(nextHeading)) return `${content.trimEnd()}\n\n${section}\n`;
  return content.replace(nextHeading, `${section}\n\n${nextHeading}`);
}

function insertAfterIfPresent(content, marker, insertion) {
  if (content.includes(insertion.trim()) || !content.includes(marker)) return content;
  return content.replace(marker, `${marker}\n${insertion}`);
}

function buildVersioningDocument(ctx, current) {
  const source = fs.readFileSync(
    path.join(ctx.rootDir, "boilerplate", "docs", "VERSIONING.md"),
    "utf8"
  );
  if (!current) return source;

  let content = current;
  content = content
    .replace(
      "- 開発中の変更は、プロジェクトが定めた未リリース変更の記録先へ蓄積する",
      "- 開発中の変更は、ルート `CHANGELOG.md` の `Unreleased` へ蓄積する"
    )
    .replace(
      "そのため、本ガイドでは一律にリポジトリ直下の `VERSION`, `CHANGELOG.md`, `UPGRADE_GUIDE.md` を必須とはしない。",
      "そのため、本ガイドでは一律にリポジトリ直下の `VERSION`, `UPGRADE_GUIDE.md` を必須とはしない。`CHANGELOG.md` はリポジトリ直下に置き、プロジェクト全体の変更履歴の入口とする。"
    )
    .replace(
      "5. 未リリース変更をrelease履歴またはrelease noteへ移す",
      "5. `CHANGELOG.md` の `Unreleased` を `vX.Y.Z - YYYY-MM-DD` の節へ移し、空の `Unreleased` を先頭に残す"
    )
    .replace(
      "8. プロジェクト方針でGit tagやrelease作成を行う場合は、versionとの一致を確認する",
      "8. `CHANGELOG.md` のversion、version正本、Git tag、release名が一致していることを確認する"
    );
  content = insertSectionBefore(
    content,
    extractSection(source, "### 3.1 リリース境界", "## 4. version の保持場所"),
    "## 4. version の保持場所"
  );
  content = content.replace(
    "### 4.4 UI 表示用 build 情報",
    "### 4.5 UI 表示用 build 情報"
  );
  content = insertSectionBefore(
    content,
    extractSection(source, "### 4.4 ChangeLog の記録ルール", "### 4.5 UI 表示用 build 情報"),
    "### 4.5 UI 表示用 build 情報"
  );
  content = insertSectionBefore(
    content,
    extractSection(source, "### 5.4 `0.x` の扱い", "## 6. 誰が version を更新するか"),
    "## 6. 誰が version を更新するか"
  );
  content = insertSectionBefore(
    content,
    extractSection(source, "### 7.5 リリース確定手順", "## 8. モノレポにおける考え方"),
    "## 8. モノレポにおける考え方"
  );

  const hasDeployableUnitRule =
    content.includes("原則として、実際に変更された deployable unit / package のversionだけを更新する")
    || content.includes("原則として変更された deployable unit / package だけを更新する");
  if (!hasDeployableUnitRule) {
    const monorepoUnits = "- 別々にデプロイ・配布できるアプリケーションは、それぞれ別versionでよい\n- 原則として変更された deployable unit / package だけを更新する\n- 共有packageや共通契約の変更では、依存する各単位への影響を確認する";
    if (content.includes("- `center/admin` と `center/console` のように、別デプロイ単位なら別 version でよい")) {
      content = content.replace(
        "- `center/admin` と `center/console` のように、別デプロイ単位なら別 version でよい",
        monorepoUnits
      );
    } else if (content.includes("- 同時リリースでも、必ず同一 version にする必要はない")) {
      content = content.replace(
        "- 同時リリースでも、必ず同一 version にする必要はない",
        `${monorepoUnits}\n- 同時リリースでも、必ず同一 version にする必要はない`
      );
    }
  }

  const additions = [
    ["- version をいつ、どこで、誰が、どう更新するかを明確にする", "- 変更内容を `CHANGELOG.md` に継続して残し、リリース内容を追跡可能にする"],
    ["- update / upgrade 手順をどこに記録するか", "- 未リリース変更をどこに記録するか\n- release note と migration 情報をどこに記録するか\n- version 更新を確定するタイミングと承認者"],
    ["- ただし、スイートとして束ねて説明する必要がある場合は、release note や ROADMAP などで関係を説明する", "- repository / project versionは、複数の配布単位を一つの製品releaseとして扱う場合に限って採用を検討する"],
    ["- version 更新判断に迷う場合は、`SPEC`, `ADR`, `ROADMAP`, `PLAN_PHASE_CURRENT` を見て変更の意味を確認する", "- version正本、未リリース変更、release履歴、release note、upgrade / migration手順の整合を保つ"],
    ["- version が関係する変更では、`docs/VERSIONING.md` を確認する", "- 意味のある変更を完了する際は、`CHANGELOG.md` の `Unreleased` への追記要否を確認する\n- 実装完了やWBS完了だけを理由にversionを確定更新しない\n- リリースを確定する際は、変更されたdeployable unit、`CHANGELOG.md`、version正本、migration要否を確認する"],
  ];
  for (const [marker, insertion] of additions) {
    content = insertAfterIfPresent(content, marker, insertion);
  }
  return content;
}

function patchVersioningDocument(ctx, targetPath) {
  const original = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
  const content = buildVersioningDocument(ctx, original);
  if (content === original) return false;
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function patchChangelog(ctx, targetPath) {
  if (fs.existsSync(targetPath)) return false;
  const sourcePath = path.join(ctx.featureDir, "files", "CHANGELOG.md");
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function patchAgents(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  content = content.replace(
    "本リポジトリでは `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`、必要に応じて `docs/PLATFORM_GUIDELINE.md` を優先する",
    "本リポジトリでは `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`、`docs/VERSIONING.md`、`docs/TECHNOLOGY/INDEX.md`、関連するTechnology Profileを優先する"
  );
  if (!content.includes("version の更新判断、更新対象、更新手順は `docs/VERSIONING.md` を正本として扱う")) {
    content = replaceIfMissing(
      content,
      "- **原則8: platform guideline の優先**\n  - `docs/PLATFORM_GUIDELINE.md` が存在する場合、プラットフォーム固有の制約についてはこれを優先して参照する\n  - 共通ルールと platform 固有制約が矛盾する場合、当該制約に関しては `docs/PLATFORM_GUIDELINE.md` を優先する",
      `\n- **原則9: versioning ルールの遵守**\n  - version の更新判断、更新対象、更新手順は \`docs/VERSIONING.md\` を正本として扱う\n  - build number と semantic version を混同しない\n  - version の確定更新は、承認された変更の一部として扱う`
    );
  }
  if (!content.includes("`CHANGELOG.md` の `Unreleased` への追記要否を確認する")) {
    content = insertAfterIfPresent(
      content,
      "  - version の更新判断、更新対象、更新手順は `docs/VERSIONING.md` を正本として扱う",
      "  - 利用者、運用者、開発者に意味のある変更では、`CHANGELOG.md` の `Unreleased` への追記要否を確認する"
    );
  }
  content = content.replace(
    "3. docs/DOCUMENTATION.md\n   4. docs/PLATFORM_GUIDELINE.md （存在する場合）",
    "3. docs/DOCUMENTATION.md\n   4. docs/VERSIONING.md\n   5. docs/TECHNOLOGY/INDEX.md\n   6. docs/TECHNOLOGY/ADOPTION.md と対象WBSに関係するprofile"
  );
  content = content.replace(
    "- 参照すべき `SPEC / ADR / REF / DOCUMENTATION / PLATFORM_GUIDELINE`",
    "- 参照すべき `SPEC / ADR / REF / DOCUMENTATION / VERSIONING / TECHNOLOGY`"
  );
  if (!containsComparableText(content, "skills/version-governance/")) {
    content = content.replace(
      "- `skills/project-bootstrap/`\n  - アイデアから WBS までの整理を補助する",
      "- `skills/project-bootstrap/`\n  - アイデアから WBS までの整理を補助する\n- `skills/version-governance/`\n  - version 更新判断、更新対象、更新手順確認を補助する"
    );
  }
  content = content.replace(
    "skill は補助であり、正本ではない。正本は `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`、必要に応じて `docs/PLATFORM_GUIDELINE.md` である。",
    "skill は補助であり、正本ではない。正本は `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`、`docs/VERSIONING.md`、`docs/TECHNOLOGY/INDEX.md`、`docs/TECHNOLOGY/ADOPTION.md`、選択済みprofileの `GUIDELINE.md` である。"
  );
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
  if (!content.includes("version 更新の判断、更新対象、更新手順は `docs/VERSIONING.md` を正本とする")) {
    content = content.replace(
      "- ドキュメント体系、分類、昇格、命名、運用手順は `docs/DOCUMENTATION.md` を正本とする。",
      "- ドキュメント体系、分類、昇格、命名、運用手順は `docs/DOCUMENTATION.md` を正本とする。\n- version 更新の判断、更新対象、更新手順は `docs/VERSIONING.md` を正本とする。"
    );
  }
  if (!content.includes("- `docs/VERSIONING.md`\n  - version 管理のルール")) {
    content = content.replace(
      "- `docs/agent_sessions/*`\n  - セッション記録",
      "- `docs/agent_sessions/*`\n  - セッション記録\n- `docs/VERSIONING.md`\n  - version 管理のルール"
    );
  }
  if (!content.includes("- `CHANGELOG.md`\n  - 利用者、運用者、開発者に影響する未リリース変更とリリース履歴")) {
    content = insertAfterIfPresent(
      content,
      "- `docs/VERSIONING.md`\n  - version 管理のルール",
      "- `CHANGELOG.md`\n  - 利用者、運用者、開発者に影響する未リリース変更とリリース履歴"
    );
  }
  if (!content.includes("version が関係する変更では `docs/VERSIONING.md` を確認する")) {
    content = content.replace(
      "- 依存する `SPEC / ADR / REF / PLATFORM_GUIDELINE` を確認する",
      "- 依存する `SPEC / ADR / REF / PLATFORM_GUIDELINE` を確認する\n- version が関係する変更では `docs/VERSIONING.md` を確認する"
    );
  }
  if (!content.includes("`CHANGELOG.md` の `Unreleased` への追記要否を確認する")) {
    content = insertAfterIfPresent(
      content,
      "- version が関係する変更では `docs/VERSIONING.md` を確認する",
      "- 利用者、運用者、開発者に意味のある変更では、`CHANGELOG.md` の `Unreleased` への追記要否を確認する"
    );
  }
  if (!content.includes("### 5.4 ChangeLog の更新")) {
    const changelogSection = `### 5.4 ChangeLog の更新

- 機能追加、仕様変更、不具合修正、廃止、互換性影響を伴う変更では、実装と検証にあわせてルート \`CHANGELOG.md\` の \`Unreleased\` を更新する
- 記載対象と分類は \`docs/VERSIONING.md\` を正本とし、commit一覧や作業手順ではなく、変更の結果と影響を記載する
- versionを更新しない変更も、次回リリースで告知すべき内容なら \`Unreleased\` に残す
- リリース時はversion正本の更新と同じ変更で、\`Unreleased\` の内容を日付付きversion節へ移す`;
    content = content
      .replace("#### 5.4.4 commit 後の報告", "#### 5.5.4 commit 後の報告")
      .replace("#### 5.4.3 commit message", "#### 5.5.3 commit message")
      .replace("#### 5.4.2 commit 前の確認", "#### 5.5.2 commit 前の確認")
      .replace("#### 5.4.1 承認境界", "#### 5.5.1 承認境界")
      .replace("### 5.4 Git commit の実行と記録", `${changelogSection}\n\n### 5.5 Git commit の実行と記録`);
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchIndex(targetPath) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  if (!content.includes("VERSIONING.md")) {
    content = content.replace(
      "- ドキュメント運用ガイド: [DOCUMENTATION.md](./DOCUMENTATION.md)",
      "- ドキュメント運用ガイド: [DOCUMENTATION.md](./DOCUMENTATION.md)\n- バージョニングガイド: [VERSIONING.md](./VERSIONING.md)"
    );
  }
  if (!content.includes("[../CHANGELOG.md](../CHANGELOG.md)")) {
    content = insertAfterIfPresent(
      content,
      "- バージョニングガイド: [VERSIONING.md](./VERSIONING.md)",
      "- ChangeLog: [../CHANGELOG.md](../CHANGELOG.md)"
    );
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function patchBootstrapAdoption(targetPath, addedSkillTargets) {
  if (!fs.existsSync(targetPath)) return false;
  let content = fs.readFileSync(targetPath, "utf8");
  const original = content;
  const timestamp = nowTimestamp();
  const entry = `  - ${timestamp}: Applied versioning feature from project-bootstrap-kit`;
  const policyEntry = `  - ${timestamp}: Added ChangeLog governance from project-bootstrap-kit`;
  const addedFilesBlock = [
    `  - ${timestamp}`,
    `    - CHANGELOG.md`,
    `    - docs/VERSIONING.md`,
    ...addedSkillTargets.map((item) => `    - ${item}`),
  ].join("\n");
  const policyFilesBlock = [
    `  - ${timestamp}`,
    `    - CHANGELOG.md`,
    `    - updated docs/VERSIONING.md release policy`,
    `    - updated CHANGELOG.md governance`,
    `    - updated version-governance skill`,
  ].join("\n");
  if (!content.includes("Upgrade History:")) {
    content = `${content.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  } else if (!content.includes("Applied versioning feature from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${entry}${nextSection}`;
    });
  }
  if (!content.includes("Added ChangeLog governance from project-bootstrap-kit")) {
    content = content.replace(/- Upgrade History:\n([\s\S]*?)(\n- [A-Z]|$)/, (match, historyBody, nextSection) => {
      const trimmedBody = historyBody.replace(/\n+$/, "");
      return `- Upgrade History:\n${trimmedBody}\n${policyEntry}${nextSection}`;
    });
  }
  if (!content.includes("Upgrade Added Files:")) {
    content = `${content.trimEnd()}\n- Upgrade Added Files:\n${addedFilesBlock}\n`;
  } else if (!content.includes("version-governance/")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${addedFilesBlock}\n`;
    });
  }
  if (!content.includes("updated CHANGELOG.md governance")) {
    content = content.replace(/- Upgrade Added Files:\n([\s\S]*?)$/, (match, addedBody) => {
      const trimmedBody = addedBody.replace(/\n+$/, "");
      return `- Upgrade Added Files:\n${trimmedBody}\n${policyFilesBlock}\n`;
    });
  }
  if (content !== original) {
    fs.writeFileSync(targetPath, content, "utf8");
    return true;
  }
  return false;
}

function getVersioningStatus(ctx) {
  const result = [];
  const changelogPath = path.join(ctx.targetRoot, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    result.push({ label: "CHANGELOG.md", status: "ADD" });
  } else if (!fs.readFileSync(changelogPath, "utf8").includes("## Unreleased")) {
    result.push({ label: "CHANGELOG.md", status: "WARN" });
  } else {
    result.push({ label: "CHANGELOG.md", status: "SKIP(SAME)" });
  }

  const docsPath = path.join(ctx.targetRoot, "docs", "VERSIONING.md");
  if (!fs.existsSync(docsPath)) {
    result.push({ label: "docs/VERSIONING.md", status: "ADD" });
  } else {
    const current = fs.readFileSync(docsPath, "utf8");
    result.push({
      label: "docs/VERSIONING.md",
      status: buildVersioningDocument(ctx, current) === current ? "SKIP(SAME)" : "UPDATE",
    });
  }

  const agentsPath = path.join(ctx.targetRoot, "AGENTS.md");
  const agents = !fs.existsSync(agentsPath)
    ? "WARN"
    : fs.readFileSync(agentsPath, "utf8").includes("`CHANGELOG.md` の `Unreleased` への追記要否を確認する")
      ? "SKIP(SAME)" : "UPDATE";
  result.push({ label: "AGENTS.md", status: agents });

  const guidelinePath = path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md");
  const guideline = !fs.existsSync(guidelinePath)
    ? "WARN"
    : fs.readFileSync(guidelinePath, "utf8").includes("### 5.4 ChangeLog の更新")
      ? "SKIP(SAME)" : "UPDATE";
  result.push({ label: "docs/DEVELOPMENT_GUIDELINE.md", status: guideline });

  const indexPath = path.join(ctx.targetRoot, "docs", "INDEX.md");
  const index = !fs.existsSync(indexPath)
    ? "WARN"
    : fs.readFileSync(indexPath, "utf8").includes("[../CHANGELOG.md](../CHANGELOG.md)")
      ? "SKIP(SAME)" : "UPDATE";
  result.push({ label: "docs/INDEX.md", status: index });

  const skillTargets = getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  const sourceSkillRoot = path.join(ctx.featureDir, "files", "skills", "version-governance");
  for (const skillTarget of skillTargets) {
    const targetSkillRoot = path.join(skillTarget, "version-governance");
    if (!fs.existsSync(targetSkillRoot)) {
      result.push({ label: `${path.relative(ctx.targetRoot, targetSkillRoot)}/`, status: "ADD" });
    } else {
      result.push({
        label: `${path.relative(ctx.targetRoot, targetSkillRoot)}/`,
        status: hashDirectory(sourceSkillRoot) === hashDirectory(targetSkillRoot) ? "SKIP(SAME)" : "UPDATE",
      });
    }
  }

  const hasFunctionalChanges = result.some((item) => item.status === "ADD" || item.status === "UPDATE");
  const adoption = hasFunctionalChanges ? "UPDATE" : "SKIP(SAME)";
  result.push({ label: "docs/BOOTSTRAP_ADOPTION.md", status: adoption });

  return result;
}

export function dryRun(ctx) {
  const diffResults = getVersioningStatus(ctx);
  console.log("");
  printSection("Versioning Diff");
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
    "1. WARN が出た必須文書は、versioning参照を追加する前に配置状況を確認してください。",
    "2. UPDATE が出た項目だけ反映対象として考えてください。",
    "3. すべて SKIP(SAME) なら、既にこの feature は組み込み済みです。",
    "4. 問題なければ --apply を付けて再実行してください。",
  ]);
}

export function apply(ctx) {
  const preApplyStatus = getVersioningStatus(ctx);
  const needsAdoptionUpdate = preApplyStatus
    .filter((item) => item.label !== "docs/BOOTSTRAP_ADOPTION.md")
    .some((item) => item.status === "ADD" || item.status === "UPDATE");
  const skillTargets = getSkillTargets(ctx.aiSurface, ctx.targetRoot);
  const skillSource = path.join(ctx.featureDir, "files", "skills");
  if (fs.existsSync(skillSource)) {
    for (const skillTarget of skillTargets) {
      ensureDir(skillTarget);
      copyRecursive(skillSource, skillTarget);
    }
  }

  const changelogPath = path.join(ctx.targetRoot, "CHANGELOG.md");

  const patchResults = [
    ["CHANGELOG.md", patchChangelog(ctx, changelogPath)],
    ["docs/VERSIONING.md", patchVersioningDocument(ctx, path.join(ctx.targetRoot, "docs", "VERSIONING.md"))],
    ["AGENTS.md", patchAgents(path.join(ctx.targetRoot, "AGENTS.md"))],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchDevelopmentGuideline(path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"))],
    ["docs/INDEX.md", patchIndex(path.join(ctx.targetRoot, "docs", "INDEX.md"))],
    [
      "docs/BOOTSTRAP_ADOPTION.md",
      needsAdoptionUpdate && patchBootstrapAdoption(
        path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"),
        skillTargets.map((target) => `${path.relative(ctx.targetRoot, target)}/version-governance/`)
      ),
    ],
  ];

  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of patchResults) {
    console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  }
  for (const target of skillTargets) {
    console.log(`[APPLY] ${path.relative(ctx.targetRoot, target)}/version-governance/`);
  }
  console.log("");
  console.log("Result: versioning feature was applied.");
  printDryRunSummary([
    "1. git diff で変更内容を確認してください。",
    "2. docs/VERSIONING.md の内容を、そのプロジェクトの技術スタックに合わせて調整してください。",
    "3. 既存 CHANGELOG.md に WARN が出た場合は、履歴を保ったまま Unreleased 節を手動で追加してください。",
    "4. AGENTS.md, docs/DEVELOPMENT_GUIDELINE.md, docs/INDEX.md の追記位置が自然か確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
