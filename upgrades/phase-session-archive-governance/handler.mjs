import fs from "node:fs";
import path from "node:path";
import {
  getSkillTargets,
  nowTimestamp,
  printDryRunSummary,
  printSection,
} from "../../scripts/upgrade-lib.mjs";

const MARKER = "完了フェーズのsession archive";

export const planDetails = [
  {
    file: "AGENTS.md",
    summary: "Require reference-safe completed-phase session archiving",
    locations: ["Add mapped session-root, active-root, resume-prompt, and not-applicable rules"],
  },
  {
    file: "docs/DEVELOPMENT_GUIDELINE.md",
    summary: "Add session archive to the phase transition process and completion criteria",
    locations: ["Add a conditional archive step without automatically moving files"],
  },
  {
    file: "docs/DOCUMENTATION.md",
    summary: "Define active and archived session directory roles and inventory checks",
    locations: ["Add phase-session lifecycle rules under phase transition documentation"],
  },
  {
    file: "docs/agent_sessions/README.md or existing mapped session-root README when present",
    summary: "Clarify active session root and completed-phase archive roles",
    locations: ["Preserve mature-adopter session-root mappings"],
  },
  {
    file: ".agents/skills/phase-transition/SKILL.md or .claude/skills/phase-transition/SKILL.md",
    summary: "Add archive and reference-scan steps to phase-transition",
    locations: ["Update the selected AI surface only"],
  },
];

const AGENTS_BLOCK = `#### 完了フェーズのsession archive

フェーズを正式完了した後は、そのフェーズに属するsessionを特定し、移動前にrepository内の参照を確認する。参照切れがない場合だけ、設定済みsession root配下のフェーズ別archiveへ移す。

現行フェーズ、フェーズ間作業、最新resume promptはactive session rootへ残す。mature adopterでは既存のmapped session rootを尊重し、kit既定pathへ強制移動しない。immutable referenceまたは監査要件で移動できない場合は、適用除外理由と代替索引を記録する。`;

const DEVELOPMENT_BLOCK = `#### 完了フェーズのsession archive

フェーズの正式完了後、そのフェーズに属するsessionを特定し、repository内のreference scanを行う。参照切れがない場合だけ、設定済みsession root配下のフェーズ別archiveへ移す。

- 現行フェーズ、フェーズ間作業、最新resume promptはactive session rootへ残す
- mature adopterでは既存のmapped session rootを尊重する
- immutable referenceまたは監査要件がある場合は移動せず、適用除外理由と代替索引を記録する
- 完了判定ではarchive、active rootの残存範囲、resume promptと現行計画の整合を確認する`;

const DOCUMENTATION_BLOCK = `#### 完了フェーズのsession archive

- active session rootには、現行フェーズとフェーズ間作業のsession、および最新resume promptを置く
- 正式完了したフェーズのsessionは、reference scan後に設定済みsession root配下の\`phaseN/\`等へ移す
- mature adopterでは既存のmapped session rootを尊重し、kit既定pathへ強制移動しない
- immutable referenceまたは監査要件がある場合は移動せず、適用除外理由と代替索引を記録する
- フェーズ移行時はarchive対象、active root残存範囲、resume promptと現行計画の整合を棚卸しする`;

const SESSION_README_BLOCK = `## 完了フェーズのsession archive

active rootには現行フェーズ、フェーズ間作業、最新resume promptを置く。正式完了したフェーズのsessionは、reference scan後に設定済みsession root配下の\`phaseN/\`等へ移す。

mature adopterでは既存のmapped session rootを尊重する。immutable referenceまたは監査要件がある場合は移動せず、適用除外理由と代替索引を記録する。`;

const SKILL_BLOCK = `## 完了フェーズのsession archive

1. 正式完了したフェーズに属するsessionを特定する
2. 移動前にrepository内のreference scanを行う
3. 参照切れがない場合だけ、設定済みsession root配下のフェーズ別directoryへ移す
4. 現行フェーズ、inter-phase session、最新resume promptはactive rootへ残す
5. mature adopterでは既存のmapped session rootを尊重する
6. immutable referenceまたは監査要件がある場合は移動せず、適用除外理由と代替索引を記録する

完了checkでは、archive対象、active rootの残存範囲、reference scan、resume promptと現行計画の整合を確認する。`;

function readIfExists(targetPath) {
  return fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
}

function inspectSafeFile(targetRoot, targetPath) {
  let stat;
  try {
    stat = fs.lstatSync(targetPath);
  } catch {
    return { safe: false, reason: "missing" };
  }
  if (stat.isSymbolicLink()) return { safe: false, reason: "symlink" };
  if (!stat.isFile()) return { safe: false, reason: "not-regular-file" };
  const realRoot = fs.realpathSync(targetRoot);
  const realTarget = fs.realpathSync(targetPath);
  const rootPrefix = `${realRoot}${path.sep}`;
  if (realTarget !== realRoot && !realTarget.startsWith(rootPrefix)) return { safe: false, reason: "outside-target-root" };
  return { safe: true, reason: null };
}

function insertBeforeHeading(content, heading, block) {
  if (content.includes(MARKER)) return content;
  if (content.includes(heading)) return content.replace(heading, `${block}\n\n${heading}`);
  return `${content.trimEnd()}\n\n${block}\n`;
}

function patchFile(targetRoot, targetPath, heading, block) {
  if (!inspectSafeFile(targetRoot, targetPath).safe) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  const content = insertBeforeHeading(original, heading, block);
  if (content === original) return false;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

function skillPaths(ctx) {
  if (!ctx.aiSurface) return [];
  return getSkillTargets(ctx.aiSurface, ctx.targetRoot).map((root) => path.join(root, "phase-transition", "SKILL.md"));
}

function resolveSessionReadme(ctx) {
  const defaultRelative = "docs/agent_sessions/README.md";
  const defaultPath = path.join(ctx.targetRoot, defaultRelative);
  const statePath = path.join(ctx.targetRoot, "docs", "BOOTSTRAP_STATE.json");
  if (!fs.existsSync(statePath)) return { path: defaultPath, label: defaultRelative, mappedWithoutReadme: false, skipStatus: null };

  try {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const entry = state.paths?.find((item) => item.path === defaultRelative);
    if (entry?.ownership !== "mapped" || !entry.satisfiedBy) {
      return { path: defaultPath, label: defaultRelative, mappedWithoutReadme: false, skipStatus: null };
    }

    const mappedPath = path.resolve(ctx.targetRoot, entry.satisfiedBy);
    const realTargetRoot = fs.realpathSync(ctx.targetRoot);
    const targetPrefix = `${path.resolve(ctx.targetRoot)}${path.sep}`;
    if (path.isAbsolute(entry.satisfiedBy) || (!mappedPath.startsWith(targetPrefix) && mappedPath !== path.resolve(ctx.targetRoot))) {
      return { path: null, label: `${entry.satisfiedBy} (invalid mapped session root)`, mappedWithoutReadme: true, skipStatus: "WARN" };
    }
    let mappedStat;
    try {
      mappedStat = fs.lstatSync(mappedPath);
    } catch {
      return { path: null, label: `${entry.satisfiedBy}/ (mapped session root; READMEなし)`, mappedWithoutReadme: true, skipStatus: "SKIP(MAPPED)" };
    }
    if (mappedStat.isSymbolicLink()) {
      return { path: null, label: `${entry.satisfiedBy} (mapped session root is a symlink)`, mappedWithoutReadme: true, skipStatus: "WARN" };
    }
    const realMappedPath = fs.realpathSync(mappedPath);
    const realRootPrefix = `${realTargetRoot}${path.sep}`;
    if (realMappedPath !== realTargetRoot && !realMappedPath.startsWith(realRootPrefix)) {
      return { path: null, label: `${entry.satisfiedBy} (mapped session root resolves outside target)`, mappedWithoutReadme: true, skipStatus: "WARN" };
    }
    if (mappedStat.isFile()) {
      return { path: mappedPath, label: entry.satisfiedBy, mappedWithoutReadme: false, skipStatus: null };
    }
    const mappedReadme = path.join(mappedPath, "README.md");
    if (fs.existsSync(mappedReadme) && fs.statSync(mappedReadme).isFile()) {
      return { path: mappedReadme, label: path.join(entry.satisfiedBy, "README.md"), mappedWithoutReadme: false, skipStatus: null };
    }
    return { path: null, label: `${entry.satisfiedBy}/ (mapped session root; READMEなし)`, mappedWithoutReadme: true, skipStatus: "SKIP(MAPPED)" };
  } catch {
    return { path: null, label: "docs/BOOTSTRAP_STATE.json (session root mappingを解釈できないためREADME更新を停止)", mappedWithoutReadme: true, skipStatus: "WARN" };
  }
}

function status(label, targetPath, targetRoot) {
  if (!inspectSafeFile(targetRoot, targetPath).safe) return { label, status: "WARN" };
  return { label, status: readIfExists(targetPath).includes(MARKER) ? "SKIP(SAME)" : "UPDATE" };
}

function getStatuses(ctx) {
  const sessionReadme = resolveSessionReadme(ctx);
  const results = [
    status("AGENTS.md", path.join(ctx.targetRoot, "AGENTS.md"), ctx.targetRoot),
    status("docs/DEVELOPMENT_GUIDELINE.md", path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"), ctx.targetRoot),
    status("docs/DOCUMENTATION.md", path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"), ctx.targetRoot),
    sessionReadme.mappedWithoutReadme
      ? { label: sessionReadme.label, status: sessionReadme.skipStatus }
      : status(sessionReadme.label, sessionReadme.path, ctx.targetRoot),
  ];
  if (!ctx.aiSurface) {
    results.push({ label: ".agents/skills/phase-transition/SKILL.md or .claude/skills/phase-transition/SKILL.md", status: "WARN" });
  } else {
    for (const skillPath of skillPaths(ctx)) results.push(status(path.relative(ctx.targetRoot, skillPath), skillPath, ctx.targetRoot));
  }
  return results;
}

function patchBootstrapAdoption(targetRoot, targetPath) {
  if (!inspectSafeFile(targetRoot, targetPath).safe) return false;
  const original = fs.readFileSync(targetPath, "utf8");
  if (original.includes("Applied phase-session-archive-governance feature")) return false;
  const entry = `  - ${nowTimestamp()}: Applied phase-session-archive-governance feature from project-bootstrap-kit`;
  const content = original.includes("- Upgrade History:")
    ? original.replace("- Upgrade History:", `- Upgrade History:\n${entry}`)
    : `${original.trimEnd()}\n- Upgrade History:\n${entry}\n`;
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

export function dryRun(ctx) {
  const results = getStatuses(ctx);
  console.log("");
  printSection("Phase Session Archive Governance Diff");
  for (const item of results) console.log(`[${item.status}] ${item.label}`);
  console.log("");
  console.log(`Result: ${results.filter((item) => item.status === "UPDATE").length} update, ${results.filter((item) => item.status === "SKIP(SAME)").length} skip(same), ${results.filter((item) => item.status === "SKIP(MAPPED)").length} skip(mapped), ${results.filter((item) => item.status === "WARN").length} warn.`);
  printDryRunSummary([
    "1. Phaseを持たないprojectでは適用せず、not-applicable理由を記録してください。",
    "2. WARNがある場合はpath mappingとAI surfaceを確認してください。",
    "3. このfeatureはsession fileを自動移動しません。",
  ]);
}

export function apply(ctx) {
  const sessionReadme = resolveSessionReadme(ctx);
  if (sessionReadme.skipStatus === "WARN") {
    throw new Error(`session root mappingを安全に解決できないためapplyを停止しました: ${sessionReadme.label}`);
  }
  const requiredFiles = [
    path.join(ctx.targetRoot, "AGENTS.md"),
    path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"),
    path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"),
    path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"),
    ...skillPaths(ctx),
    ...(sessionReadme.mappedWithoutReadme ? [] : [sessionReadme.path]),
  ];
  for (const requiredFile of requiredFiles) {
    const inspection = inspectSafeFile(ctx.targetRoot, requiredFile);
    if (!inspection.safe) throw new Error(`unsafe or missing patch target (${inspection.reason}): ${path.relative(ctx.targetRoot, requiredFile)}`);
  }
  const results = [
    ["AGENTS.md", patchFile(ctx.targetRoot, path.join(ctx.targetRoot, "AGENTS.md"), "### 4.6", AGENTS_BLOCK)],
    ["docs/DEVELOPMENT_GUIDELINE.md", patchFile(ctx.targetRoot, path.join(ctx.targetRoot, "docs", "DEVELOPMENT_GUIDELINE.md"), "### 3.6", DEVELOPMENT_BLOCK)],
    ["docs/DOCUMENTATION.md", patchFile(ctx.targetRoot, path.join(ctx.targetRoot, "docs", "DOCUMENTATION.md"), "### 4.5", DOCUMENTATION_BLOCK)],
    [sessionReadme.label, sessionReadme.mappedWithoutReadme ? false : patchFile(ctx.targetRoot, sessionReadme.path, "推奨ファイル:", SESSION_README_BLOCK)],
  ];
  for (const skillPath of skillPaths(ctx)) {
    results.push([path.relative(ctx.targetRoot, skillPath), patchFile(ctx.targetRoot, skillPath, "## PLAN の粒度", SKILL_BLOCK)]);
  }
  results.push(["docs/BOOTSTRAP_ADOPTION.md", patchBootstrapAdoption(ctx.targetRoot, path.join(ctx.targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"))]);

  console.log("");
  printSection("Apply Result");
  for (const [label, changed] of results) console.log(`${changed ? "[APPLY]" : "[SKIP]"} ${label}`);
  if (!ctx.aiSurface) console.log("[WARN] ai-surface was not specified, so phase-transition skill was not patched.");
  console.log("");
  console.log("Result: phase-session-archive-governance feature was applied.");
  printDryRunSummary([
    "1. session root mappingと既存referenceを確認してください。",
    "2. 自動moveは行われていないため、次回phase transition時に対象一覧をreviewしてください。",
    "3. 再実行して全対象がSKIP(SAME)になることを確認してください。",
  ], "<<< Upgrade apply completed. >>>");
}
