#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  ensureDir,
  listFilesRecursive,
  printHeader,
  printPatchDetails,
  printPlannedChanges,
  printSection,
} from "./upgrade-lib.mjs";
import { applyUpgradePlan, scanUpgradeTarget } from "./upgrade-plan-lib.mjs";
import { acceptUpgradeDecision, updateFeatureState, updatePathOwnership } from "./bootstrap-upgrade-state-lib.mjs";
import { acceptAdoptionManualMerge, setAdoptionDecisions } from "./adoption-plan-lib.mjs";
import { readAndValidateBootstrapState, STATE_RELATIVE_PATH } from "./bootstrap-state-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const upgradesDir = path.join(rootDir, "upgrades");
const profilesDir = path.join(rootDir, "profiles");

function listFeatureNames() {
  return fs
    .readdirSync(upgradesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(upgradesDir, entry.name, "manifest.json")))
    .map((entry) => entry.name)
    .sort();
}

function usage() {
  const featureNames = listFeatureNames();
  const profileNames = fs.readdirSync(profilesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(profilesDir, entry.name, "profile.json")))
    .map((entry) => entry.name)
    .sort();
  console.log(`Usage:
  node scripts/upgrade-project.mjs --target <path> --feature <name> [--ai-surface <codex|claude|rovo|both>] [--technology-profile <profile-id> ...] [--dry-run|--apply]
  node scripts/upgrade-project.mjs --target <path> --feature <name> [--ai-surface <codex|claude|rovo|both>] [--technology-profile <profile-id> ...] --diff [--diff-output <path>]
  node scripts/upgrade-project.mjs --target <path> --scan [--project-name <name>] [--project-slug <slug>] [--product-name <name>] [--ai-surface <codex|claude|rovo|both>] [--technology-profile <profile-id> ...] [--plan-output <path>]
  node scripts/upgrade-project.mjs --apply-plan <path> [--target <path>] [--apply-safe-only]
  node scripts/upgrade-project.mjs --set-adoption-decisions <plan> --decisions <json> [--dry-run|--apply]
  node scripts/upgrade-project.mjs --accept-adoption-manual-merge <plan> --path <path> --reason <reason>
  node scripts/upgrade-project.mjs --accept-path-decision <plan> --path <path> --decision <value> --reason <reason> [--confirm]
  node scripts/upgrade-project.mjs --target <path> --update-path-state --path <path> --ownership <value> --reason <reason> [--satisfied-by <path>|--superseded-by <path>]
  node scripts/upgrade-project.mjs --target <path> --update-feature-state --feature <id> --feature-state <value> --reason <reason> [--evidence <value> ...]

Options:
  --target <path>                 Target project path
  --feature <name>               Upgrade feature name
  --scan                         Scan state, or create a state migration plan for a legacy adopter
  --apply-plan <path>            Apply a previously reviewed, unchanged-target plan
  --plan-output <path>           Scan plan output. Default: <target>/.bootstrap-upgrade-diff/upgrade-plan_<timestamp>.json
  --include-review               Include REVIEW features in the generated plan
  --apply-safe-only              Apply only approved ADD paths in a state migration plan
  --set-adoption-decisions <plan> Preview adoption decision edits; save only with --apply
  --decisions <json>             schemaVersion 1 decision table for adopt-existing plans
  --accept-adoption-manual-merge Record a migration-plan manual merge decision
  --accept-path-decision <path>  Record a reviewed state-upgrade path decision
  --update-path-state            Change ownership/path state without editing the manifest directly
  --update-feature-state         Change feature state with reason and evidence
  --ai-surface <value>           codex | claude | rovo | both
  --technology-profile <id>      Repeatable technology profile selector
  --project-name <name>          Override legacy adoption project name inference
  --project-slug <slug>          Override legacy slug inference (no bootstrap state only)
  --product-name <name>          Override legacy adoption product name inference
  --dry-run                      Preview only
  --apply                        Apply the feature
  --diff                         Write an apply-preview unified diff during dry-run
  --diff-output <path>           Diff output path. Default: <target>/.bootstrap-upgrade-diff/<feature>_<timestamp>.diff
  -h, --help                     Show this help

Available features:
  ${featureNames.join("\n  ")}

Available technology profiles:
  ${profileNames.join("\n  ")}

Plan routing (check plan.operation before choosing a command):
  adopt-existing: --set-adoption-decisions, --accept-adoption-manual-merge, --apply-plan [--apply-safe-only]
  state-upgrade: --accept-path-decision, --apply-plan (no safe-only)
  bootstrap-state-schema-migration: --apply-plan (metadata only; no path acceptance)
Manual merge: edit ONE managed file, accept it, then edit the next. Other managed paths must still match the plan.
Each scan writes a plan and bundle, including CURRENT-only checks. See docs/guides/upgrading.md for retention and cleanup.`);
}

function parseArgs(argv) {
  const args = {
    target: "",
    feature: "",
    aiSurface: "",
    technologyProfiles: [],
    mode: "dry-run",
    diff: false,
    diffOutput: "",
    operation: "feature",
    applyPlan: "",
    planOutput: "",
    includeReview: false,
    decisionPath: "",
    decision: "",
    reason: "",
    confirm: false,
    ownership: "",
    satisfiedBy: "",
    supersededBy: "",
    featureState: "",
    evidence: [],
    projectName: "",
    projectSlug: undefined,
    decisionsFile: "",
    productName: "",
    applySafeOnly: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target") {
      args.target = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--feature") {
      args.feature = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--scan") {
      args.operation = "scan";
    } else if (arg === "--apply-plan") {
      args.operation = "apply-plan";
      args.applyPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--plan-output") {
      args.planOutput = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--include-review") {
      args.includeReview = true;
    } else if (arg === "--accept-path-decision") {
      args.operation = "accept-path-decision";
      args.applyPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--accept-adoption-manual-merge") {
      args.operation = "accept-adoption-manual-merge";
      args.applyPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--set-adoption-decisions") {
      args.operation = "set-adoption-decisions";
      args.applyPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--decisions") {
      args.decisionsFile = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--update-path-state") {
      args.operation = "update-path-state";
    } else if (arg === "--update-feature-state") {
      args.operation = "update-feature-state";
    } else if (arg === "--path") {
      args.decisionPath = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--decision") {
      args.decision = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--reason") {
      args.reason = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--confirm") {
      args.confirm = true;
    } else if (arg === "--ownership") {
      args.ownership = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--satisfied-by") {
      args.satisfiedBy = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--superseded-by") {
      args.supersededBy = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--feature-state") {
      args.featureState = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--evidence") {
      args.evidence.push(argv[i + 1] ?? "");
      i += 1;
    } else if (arg === "--project-name") {
      args.projectName = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--project-slug") {
      args.projectSlug = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--product-name") {
      args.productName = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--apply-safe-only") {
      args.applySafeOnly = true;
    } else if (arg === "--ai-surface") {
      args.aiSurface = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--technology-profile") {
      args.technologyProfiles.push(argv[i + 1] ?? "");
      i += 1;
    } else if (arg === "--dry-run") {
      args.mode = "dry-run";
    } else if (arg === "--apply") {
      args.mode = "apply";
    } else if (arg === "--diff") {
      args.diff = true;
    } else if (arg === "--diff-output") {
      args.diff = true;
      args.diffOutput = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }

  if (args.operation === "feature" && (!args.target || !args.feature)) {
    usage();
    process.exit(1);
  }
  if (args.operation === "scan" && !args.target) {
    usage();
    process.exit(1);
  }
  if (args.operation === "apply-plan" && !args.applyPlan) {
    usage();
    process.exit(1);
  }
  if (args.operation === "set-adoption-decisions" && (!args.applyPlan || !args.decisionsFile)) {
    usage();
    process.exit(1);
  }
  if (args.decisionsFile && args.operation !== "set-adoption-decisions") {
    console.error("--decisions requires --set-adoption-decisions.");
    process.exit(1);
  }
  if (args.projectSlug !== undefined && (args.operation !== "scan" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(args.projectSlug))) {
    console.error("--project-slug requires --scan and a lowercase kebab-case slug.");
    process.exit(1);
  }
  if (args.operation === "accept-path-decision" && (!args.applyPlan || !args.decisionPath || !args.decision || !args.reason)) {
    usage();
    process.exit(1);
  }
  if (args.operation === "accept-adoption-manual-merge" && (!args.applyPlan || !args.decisionPath || !args.reason)) {
    usage();
    process.exit(1);
  }
  if (args.operation === "update-path-state" && (!args.target || !args.decisionPath || !args.ownership || !args.reason)) {
    usage();
    process.exit(1);
  }
  if (args.operation === "update-feature-state" && (!args.target || !args.feature || !args.featureState || !args.reason)) {
    usage();
    process.exit(1);
  }
  if (args.applySafeOnly && args.operation !== "apply-plan") {
    console.error("--apply-safe-only requires --apply-plan.");
    process.exit(1);
  }
  if (args.aiSurface && !["codex", "claude", "rovo", "both"].includes(args.aiSurface)) {
    console.error(`Unsupported ai surface: ${args.aiSurface}`);
    usage();
    process.exit(1);
  }

  args.technologyProfiles = [...new Set(args.technologyProfiles.filter(Boolean))];

  return args;
}

function shouldSkipCopy(relativePath) {
  const parts = relativePath.split(path.sep);
  return parts.includes(".git") || parts.includes("node_modules") || parts.includes(".bootstrap-upgrade-diff");
}

function copyTargetForDiff(sourceRoot, targetRoot, relativePath = "") {
  for (const entry of fs.readdirSync(path.join(sourceRoot, relativePath), { withFileTypes: true })) {
    const childRelativePath = path.join(relativePath, entry.name);
    if (shouldSkipCopy(childRelativePath)) continue;
    const sourcePath = path.join(sourceRoot, childRelativePath);
    const targetPath = path.join(targetRoot, childRelativePath);
    if (entry.isDirectory()) {
      ensureDir(targetPath);
      copyTargetForDiff(sourceRoot, targetRoot, childRelativePath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function listComparableFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  return listFilesRecursive(rootDir).filter((filePath) => !shouldSkipCopy(filePath));
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function readTextOrBinary(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, binary: false, text: "", buffer: Buffer.from("") };
  const buffer = fs.readFileSync(filePath);
  if (isBinary(buffer)) return { exists: true, binary: true, text: "", buffer };
  return { exists: true, binary: false, text: buffer.toString("utf8").replace(/\r\n/g, "\n"), buffer };
}

function splitLines(text) {
  if (text.length === 0) return [];
  return text.split("\n");
}

function buildLineOps(oldLines, newLines) {
  const cellCount = oldLines.length * newLines.length;
  if (cellCount > 4_000_000) {
    return [
      ...oldLines.map((line) => ["-", line]),
      ...newLines.map((line) => ["+", line]),
    ];
  }

  const rows = oldLines.length + 1;
  const cols = newLines.length + 1;
  const table = Array.from({ length: rows }, () => new Uint32Array(cols));

  for (let i = oldLines.length - 1; i >= 0; i -= 1) {
    for (let j = newLines.length - 1; j >= 0; j -= 1) {
      table[i][j] = oldLines[i] === newLines[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < oldLines.length && j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      ops.push([" ", oldLines[i]]);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      ops.push(["-", oldLines[i]]);
      i += 1;
    } else {
      ops.push(["+", newLines[j]]);
      j += 1;
    }
  }
  while (i < oldLines.length) {
    ops.push(["-", oldLines[i]]);
    i += 1;
  }
  while (j < newLines.length) {
    ops.push(["+", newLines[j]]);
    j += 1;
  }
  return ops;
}

function buildUnifiedDiff(relativePath, original, updated) {
  const oldPath = original.exists ? `a/${relativePath}` : "/dev/null";
  const newPath = updated.exists ? `b/${relativePath}` : "/dev/null";
  const lines = [
    `diff --bootstrap ${oldPath} ${newPath}`,
    `--- ${oldPath}`,
    `+++ ${newPath}`,
  ];

  if (original.binary || updated.binary) {
    lines.push(`Binary files ${oldPath} and ${newPath} differ`);
    return `${lines.join("\n")}\n`;
  }

  const oldLines = splitLines(original.text);
  const newLines = splitLines(updated.text);
  lines.push(`@@ -1,${oldLines.length} +1,${newLines.length} @@`);
  for (const [prefix, line] of buildLineOps(oldLines, newLines)) {
    lines.push(`${prefix}${line}`);
  }
  return `${lines.join("\n")}\n`;
}

function suppressConsole(callback) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  try {
    return callback();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function timestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").replace(/\.\d{3}Z$/, "Z");
}

function defaultDiffOutputPath(targetRoot, feature) {
  return path.join(targetRoot, ".bootstrap-upgrade-diff", `${feature}_${timestampForFile()}.diff`);
}

function createDryRunDiff(ctx, applyHandler, requestedOutputPath) {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "project-bootstrap-upgrade-"));
  const tempTarget = path.join(tempParent, "target");
  ensureDir(tempTarget);

  try {
    copyTargetForDiff(ctx.targetRoot, tempTarget);
    suppressConsole(() => {
      applyHandler({
        ...ctx,
        targetRoot: tempTarget,
        mode: "apply",
      });
    });

    const originalFiles = new Set(listComparableFiles(ctx.targetRoot));
    const updatedFiles = new Set(listComparableFiles(tempTarget));
    const allFiles = [...new Set([...originalFiles, ...updatedFiles])].sort();
    const changedFiles = [];
    const diffParts = [];

    for (const relativePath of allFiles) {
      const original = readTextOrBinary(path.join(ctx.targetRoot, relativePath));
      const updated = readTextOrBinary(path.join(tempTarget, relativePath));
      if (
        original.exists === updated.exists
        && original.binary === updated.binary
        && (original.binary ? original.buffer.equals(updated.buffer) : original.text === updated.text)
      ) {
        continue;
      }
      changedFiles.push({
        path: relativePath,
        status: !original.exists ? "ADD" : !updated.exists ? "DELETE" : "DIFF",
      });
      diffParts.push(buildUnifiedDiff(relativePath, original, updated));
    }

    const outputPath = requestedOutputPath
      ? path.resolve(requestedOutputPath)
      : defaultDiffOutputPath(ctx.targetRoot, ctx.feature);
    ensureDir(path.dirname(outputPath));

    if (diffParts.length > 0) {
      fs.writeFileSync(outputPath, diffParts.join("\n"), "utf8");
    }

    return { changedFiles, outputPath, wroteFile: diffParts.length > 0 };
  } finally {
    fs.rmSync(tempParent, { recursive: true, force: true });
  }
}

function printDryRunDiff(ctx, applyHandler, requestedOutputPath) {
  const result = createDryRunDiff(ctx, applyHandler, requestedOutputPath);
  console.log("");
  printSection("Dry Run Diff");
  if (result.changedFiles.length === 0) {
    console.log("No changes would be applied.");
    return;
  }
  for (const item of result.changedFiles) {
    console.log(`[${item.status}] ${item.path}`);
  }
  console.log("");
  console.log("Diff file:");
  const relativeOutputPath = path.relative(ctx.targetRoot, result.outputPath);
  const displayPath = relativeOutputPath && !relativeOutputPath.startsWith("..") && !path.isAbsolute(relativeOutputPath)
    ? relativeOutputPath
    : result.outputPath;
  console.log(`  ${displayPath}`);
}

const args = parseArgs(process.argv.slice(2));
const scriptPath = path.join(rootDir, "scripts", "upgrade-project.mjs");

if (args.operation === "scan") {
  try {
    scanUpgradeTarget({
      rootDir,
      scriptPath,
      targetRoot: path.resolve(args.target),
      aiSurface: args.aiSurface,
      technologyProfiles: args.technologyProfiles,
      includeReview: args.includeReview,
      planOutput: args.planOutput,
      projectName: args.projectName,
      projectSlug: args.projectSlug,
      productName: args.productName,
    });
  } catch (error) {
    console.error(`Upgrade scan failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.operation === "set-adoption-decisions") {
  try {
    const result = setAdoptionDecisions({ rootDir, planPath: args.applyPlan, decisionsPath: args.decisionsFile, apply: args.mode === "apply" });
    for (const change of result.changes) console.log(`[${result.applied ? "SAVED" : "PREVIEW"}] ${change.path}: ${change.from} -> ${change.to}`);
    console.log(`Unresolved (${result.unresolved.length}): ${result.unresolved.join(", ") || "none"}`);
    if (!result.applied) console.log("Plan and target are unchanged. Review the decision table, then use --apply to save the plan only.");
  } catch (error) {
    console.error(`Adoption decision edits failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.operation === "apply-plan") {
  try {
    applyUpgradePlan({
      rootDir,
      scriptPath,
      planPath: args.applyPlan,
      requestedTarget: args.target,
      safeOnly: args.applySafeOnly,
    });
  } catch (error) {
    console.error(`Upgrade plan apply failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.operation === "accept-path-decision") {
  try {
    acceptUpgradeDecision({ rootDir, planPath: args.applyPlan, relativePath: args.decisionPath, decision: args.decision, reason: args.reason, confirm: args.confirm });
    console.log(`Accepted ${args.decision} for ${args.decisionPath}.`);
  } catch (error) {
    console.error(`Path decision failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.operation === "accept-adoption-manual-merge") {
  try {
    acceptAdoptionManualMerge({ rootDir, planPath: args.applyPlan, relativePath: args.decisionPath, reason: args.reason });
    console.log(`Accepted adoption manual merge for ${args.decisionPath}.`);
  } catch (error) {
    console.error(`Adoption manual merge acceptance failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.operation === "update-path-state") {
  try {
    updatePathOwnership({ rootDir, targetRoot: path.resolve(args.target), relativePath: args.decisionPath, ownership: args.ownership, reason: args.reason, satisfiedBy: args.satisfiedBy, supersededBy: args.supersededBy });
    console.log(`Updated ownership for ${args.decisionPath} to ${args.ownership}.`);
  } catch (error) {
    console.error(`Path state update failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (args.operation === "update-feature-state") {
  try {
    updateFeatureState({ rootDir, targetRoot: path.resolve(args.target), featureName: args.feature, featureState: args.featureState, reason: args.reason, evidence: args.evidence });
    console.log(`Updated feature ${args.feature} to ${args.featureState}.`);
  } catch (error) {
    console.error(`Feature state update failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

const featureDir = path.join(upgradesDir, args.feature);
const manifestPath = path.join(featureDir, "manifest.json");
const handlerPath = path.join(featureDir, "handler.mjs");

if (!fs.existsSync(manifestPath)) {
  console.error(`Upgrade feature not found: ${args.feature}`);
  process.exit(1);
}

if (!fs.existsSync(handlerPath)) {
  console.error(`Upgrade handler not found: ${handlerPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
let targetProjectModel = "development";
const statePath = path.join(path.resolve(args.target), STATE_RELATIVE_PATH);
if (fs.existsSync(statePath)) {
  const rawState = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (rawState.schemaVersion === 2) targetProjectModel = readAndValidateBootstrapState(path.resolve(args.target), rootDir).state.project.model.id;
}
const upgradeCatalog = JSON.parse(fs.readFileSync(path.join(upgradesDir, "catalog.json"), "utf8"));
const featureContract = upgradeCatalog.features.find((entry) => entry.name === args.feature);
const supportedProjectModels = featureContract?.supportedProjectModels ?? ["development"];
if (!supportedProjectModels.includes(targetProjectModel)) {
  console.error(`Upgrade feature ${args.feature} is not applicable to Project Model ${targetProjectModel}. Model changes require a separate reviewed migration plan.`);
  process.exit(1);
}
const handlerModule = await import(pathToFileURL(handlerPath).href);
const planDetails = handlerModule.planDetails ?? [];
const dryRun = handlerModule.dryRun;
const apply = handlerModule.apply;

if (typeof dryRun !== "function" || typeof apply !== "function") {
  console.error(`Upgrade handler must export dryRun() and apply(): ${handlerPath}`);
  process.exit(1);
}

const ctx = {
  rootDir,
  upgradesDir,
  featureDir,
  targetRoot: path.resolve(args.target),
  aiSurface: args.aiSurface,
  technologyProfiles: args.technologyProfiles,
  mode: args.mode,
  manifest,
  feature: args.feature,
  projectModel: targetProjectModel,
};

printHeader("Upgrade Project", [
  ["Target:", ctx.targetRoot],
  ["Feature:", args.feature],
  ["Project Model:", targetProjectModel],
  ["AI Surface:", args.aiSurface || "not-specified"],
  ["Technology Profiles:", args.technologyProfiles.join(", ") || "none"],
  ["Mode:", args.mode],
  ["Dry Run Diff:", args.diff ? "enabled" : "disabled"],
]);
printPlannedChanges(manifest);
printPatchDetails(planDetails);

if (args.mode === "dry-run") {
  dryRun(ctx);
  if (args.diff) {
    printDryRunDiff(ctx, apply, args.diffOutput);
  }
} else {
  apply(ctx);
}
