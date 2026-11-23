import fs from "node:fs";
import path from "node:path";

const ALWAYS_FORBIDDEN_PATTERNS = [
  [/\/(?:Users|home|private|Volumes|workspace|mnt)\/[^\s`)]+/u, "absolute Unix-like path"],
  [/[A-Za-z]:\\[^\s`)]+/u, "absolute Windows path"],
  [/file:\/\//u, "file URL"],
  [/Internal Evidence Map/u, "internal evidence map"],
  [/元プロジェクト内の参照文書/u, "source-project document reference section"],
  [/(?:Authorization:\s*Bearer|api[_-]?key\s*[=:]|secret\s*[=:]|token\s*[=:])\s*\S+/iu, "credential-like value"],
];

const SOURCE_PATH_PATTERNS = [
  [/`(?:docs|src|apps|packages|agent_sessions)\/[^`]+`/u, "project-local relative path"],
  [/(?:^|[\s(])(?:docs|src|apps|packages|agent_sessions)\/[A-Za-z0-9_.\-/]+/mu, "plain project-local relative path"],
];

const REQUIRED_SANITIZATION_CHECKS = [
  "project / product / repository / organization names removed",
  "customer / tenant / person identifiers removed",
  "local paths and source document names removed",
  "real service URLs and credentials removed",
  "internal evidence map is not included",
  "official source URLs are clearly distinguished from project URLs",
];

const TARGET_PATH_PREFIXES = ["boilerplate/", "profiles/", "upgrades/", "scripts/", "docs/", "models/"];
const TARGET_ROOT_FILES = new Set(["AGENTS.md", "README.md", "GETTING_STARTED.md", "UPGRADE_GUIDE.md", "CHANGELOG.md", "VERSION"]);
const MAX_EXPORT_BYTES = 1024 * 1024;

function findSection(content, headingPattern) {
  const match = content.match(new RegExp(`^##\\s+\\d+(?:\\.\\d+)?\\.\\s+(?:${headingPattern})\\s*$`, "imu"));
  if (!match || match.index === undefined) return null;
  const bodyStart = match.index + match[0].length;
  const nextHeading = content.slice(bodyStart).search(/^##\s+\d+(?:\.\d+)?\.\s+/mu);
  const bodyEnd = nextHeading === -1 ? content.length : bodyStart + nextHeading;
  return { start: match.index, end: bodyEnd, body: content.slice(bodyStart, bodyEnd).trim() };
}

function removeSection(content, section) {
  if (!section) return content;
  return `${content.slice(0, section.start)}\n${content.slice(section.end)}`;
}

function collectTargetPaths(targetBody) {
  const newPaths = new Set();
  const invalid = new Set();
  const existingBody = targetBody.replace(
    /^[ \t]*\|[ \t]*\[new\][ \t]+`([^`\r\n]*)`[ \t]*(?=\|)/gmu,
    (_cell, value) => {
      const segments = value.split("/");
      if (segments.some((segment) => (
        !segment || /^\s|[.\s]$/u.test(segment) || /^\.git$/iu.test(segment)
      )) || /[\\<>:"|?*\u0000-\u001f\u007f]/u.test(value)) {
        invalid.add(value);
      } else {
        newPaths.add(value);
      }
      return "|";
    },
  );
  const matches = existingBody.matchAll(/`([^`]+)`/gu);
  const paths = [];
  for (const match of matches) {
    const value = match[1].replace(/\/$/u, "");
    if (value.includes("<") || value.includes("|")) continue;
    const looksLikeTarget = TARGET_ROOT_FILES.has(value) || TARGET_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
    if (!looksLikeTarget) continue;
    if (value.includes("\\") || value.split("/").includes("..") || path.posix.normalize(value) !== value) invalid.add(value);
    else paths.push(value);
  }
  const malformedNewTarget = /^[ \t]*\|[ \t]*\[new\](?=[ \t|]|$)/mu.test(existingBody);
  return { paths: [...new Set(paths)], newPaths, invalid, malformedNewTarget };
}

function checkNewTarget(root, targetPath) {
  let candidate = root;
  const segments = targetPath.split("/");
  for (const [index, segment] of segments.entries()) {
    candidate = path.join(candidate, segment);
    let entry;
    try {
      entry = fs.lstatSync(candidate, { throwIfNoEntry: false });
    } catch {
      return "cannot inspect new kit target";
    }

    if (!entry) return null;
    if (entry.isSymbolicLink()) return "new kit target must not traverse a symlink";
    if (index === segments.length - 1) {
      if (!entry.isFile()) return "new kit target must be a file";
    } else if (!entry.isDirectory()) {
      return "new kit target parent must be a directory";
    }
  }
  return null;
}

function hasSectionContent(content, headingPattern) {
  const section = findSection(content, headingPattern);
  return Boolean(section?.body);
}

export function verifyFeedbackExport(inputPath, options = {}) {
  const filePath = inputPath ? path.resolve(inputPath) : "";
  const mode = options.mode ?? "final";
  const targetRoot = options.targetRoot ? path.resolve(options.targetRoot) : null;
  const failures = [];
  const warnings = [];

  if (!new Set(["pre-review", "final"]).has(mode)) {
    return { filePath, mode, failures: [`unsupported verification mode: ${mode}`], warnings };
  }

  if (!filePath || !fs.existsSync(filePath)) {
    return { filePath, mode, failures: ["export file does not exist"], warnings };
  }

  const inputStat = fs.lstatSync(filePath);
  if (!inputStat.isFile() || inputStat.isSymbolicLink()) {
    return { filePath, mode, failures: ["export path must be a regular file, not a symlink"], warnings };
  }
  if (inputStat.size > MAX_EXPORT_BYTES) {
    return { filePath, mode, failures: [`export file exceeds ${MAX_EXPORT_BYTES} bytes`], warnings };
  }

  const baseName = path.basename(filePath);
  const content = fs.readFileSync(filePath, "utf8");

  if (!/^kit_feedback_export_\d{8}_[a-z0-9][a-z0-9-]*\.md$/u.test(baseName)) {
    failures.push("file name must match kit_feedback_export_yyyymmdd_<neutral-slug>.md");
  }

  const targetSection = findSection(content, "Kit Target Map|kit側の反映候補");
  const sourceOnlyContent = removeSection(content, targetSection);

  for (const [pattern, label] of ALWAYS_FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) failures.push(`contains ${label}`);
  }
  for (const [pattern, label] of SOURCE_PATH_PATTERNS) {
    if (pattern.test(sourceOnlyContent)) failures.push(`contains ${label} outside Kit Target Map`);
  }

  if (!/^- Source Project:\s*redacted\s*$/mu.test(content)) {
    failures.push("Source Project must be redacted");
  }

  if (/<(?:neutral-id|YYYY-MM-DD|profile ids or none|anonymized evidence summary[^>]*)>/u.test(content)) {
    failures.push("template placeholders remain");
  }

  for (const check of REQUIRED_SANITIZATION_CHECKS) {
    if (!content.includes(`- [x] ${check}`)) failures.push(`unchecked: ${check}`);
  }

  if (mode === "final" && !content.includes("- [x] export内容をユーザーが確認した")) {
    failures.push("unchecked: export内容をユーザーが確認した");
  }

  const collectedTargets = collectTargetPaths(targetSection?.body ?? "");
  const targetPaths = [...new Set([...collectedTargets.paths, ...collectedTargets.newPaths])];
  if (collectedTargets.malformedNewTarget) failures.push("invalid [new] kit target cell: use [new] followed by a backticked file path");
  for (const invalidPath of collectedTargets.invalid) failures.push(`invalid kit target path: ${JSON.stringify(invalidPath)}`);
  const hasTargetException = hasSectionContent(content, "Redaction Exceptions / Rationale|匿名化例外(?:と理由)?");
  if (!targetSection?.body && !hasTargetException) failures.push("missing or empty: Kit Target Map");
  if (targetSection?.body && targetPaths.length === 0 && !hasTargetException) failures.push("Kit Target Map has no recognizable kit target path");
  if (!hasSectionContent(content, "Proposed Semantic Diff / Required Change|Required change|必要な変更|kit側の反映候補")) {
    failures.push("missing or empty: Proposed Semantic Diff / Required Change");
  }
  if (!hasSectionContent(content, "Reproduction Steps|再現手順")) failures.push("missing or empty: Reproduction Steps");
  if (!hasSectionContent(content, "Acceptance Criteria|受入条件")) failures.push("missing or empty: Acceptance Criteria");

  if (targetRoot) {
    if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) {
      failures.push("kit target root does not exist or is not a directory");
      return { filePath, mode, targetPaths, failures, warnings };
    }
    const realTargetRoot = fs.realpathSync(targetRoot);
    for (const targetPath of collectedTargets.paths) {
      const candidate = path.resolve(realTargetRoot, targetPath);
      const rootPrefix = `${realTargetRoot}${path.sep}`;
      if (!candidate.startsWith(rootPrefix)) {
        failures.push(`kit target escapes repository root: ${targetPath}`);
      } else if (!fs.existsSync(candidate)) {
        failures.push(`kit target does not exist: ${targetPath}`);
      } else {
        const realCandidate = fs.realpathSync(candidate);
        if (realCandidate !== realTargetRoot && !realCandidate.startsWith(rootPrefix)) failures.push(`kit target resolves outside repository root: ${targetPath}`);
      }
    }
    for (const targetPath of collectedTargets.newPaths) {
      const problem = checkNewTarget(realTargetRoot, targetPath);
      if (problem) failures.push(`${problem}: ${targetPath}`);
    }
  } else if (targetPaths.length > 0) {
    warnings.push("kit target filesystem checks were not run; run final verification in the kit repository");
  }

  return { filePath, mode, targetPaths, failures, warnings };
}

export function printFeedbackExportVerification(result) {
  for (const warning of result.warnings ?? []) console.log(`[WARN] ${warning}`);
  if (result.failures.length > 0) {
    for (const failure of result.failures) console.log(`[FAIL] ${failure}`);
    console.log(`\nKnowledge feedback export verification failed with ${result.failures.length} issue(s).`);
    return false;
  }

  console.log("[OK] export file name is valid");
  console.log("[OK] common path and credential patterns are absent");
  console.log("[OK] reproducibility sections are present");
  console.log("[OK] required sanitization checks are complete");
  console.log(`[OK] verification mode: ${result.mode}`);
  console.log("\nKnowledge feedback export verification completed.");
  return true;
}
