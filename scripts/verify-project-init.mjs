#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { loadTechnologyProfile } from "./technology-profile-lib.mjs";
import { verifyExistingAdoptionPlan } from "./adoption-plan-lib.mjs";
import { readAndValidateBootstrapState, STATE_RELATIVE_PATH } from "./bootstrap-state-lib.mjs";
import { loadProjectModelCatalog, resolveProjectModel, resolveProjectModelOutput } from "./project-model-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const profilesDir = path.join(rootDir, "profiles");

function usage() {
  console.log(`Usage:
  node scripts/verify-project-init.mjs --target <path> --project-model <development|task-workspace> --ai-surface <codex|claude|rovo|both> [--technology-profile <profile-id> ...]
  node scripts/verify-project-init.mjs --target <path> --adoption-plan <path>`);
}

function parseArgs(argv) {
  const args = { target: "", projectModel: "development", technologyProfiles: [], aiSurface: "", adoptionPlan: "", internalSnapshot: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target") {
      args.target = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--project-model") {
      args.projectModel = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--ai-surface") {
      args.aiSurface = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--technology-profile") {
      args.technologyProfiles.push(argv[i + 1] ?? "");
      i += 1;
    } else if (arg === "--adoption-plan") {
      args.adoptionPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--internal-snapshot") {
      args.internalSnapshot = true;
    } else if (arg === "-h" || arg === "--help") {
      usage();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(1);
    }
  }
  if (!args.target || (!args.aiSurface && !args.adoptionPlan)) {
    usage();
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

function ok(message) {
  console.log(`[OK] ${message}`);
}

function warn(message) {
  console.log(`[WARN] ${message}`);
}

function fail(message) {
  console.log(`[FAIL] ${message}`);
}

function exists(target, relativePath) {
  return fs.existsSync(path.join(target, relativePath));
}

function isGitRepo(target) {
  return exists(target, ".git");
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(rootDir, results = []) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(entryPath, results);
    } else if (entry.isFile()) {
      results.push(entryPath);
    }
  }
  return results;
}

function repositoryContainsPattern(target, regex) {
  for (const filePath of walkFiles(target)) {
    try {
      const content = readText(filePath);
      if (regex.test(content)) {
        return true;
      }
    } catch {
      // Ignore unreadable or binary files.
    }
  }
  return false;
}

function checkTemplateMarker(target, relativePath, regex, message) {
  const fullPath = path.join(target, relativePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return false;
  }
  const content = readText(fullPath);
  if (regex.test(content)) {
    warn(message);
    return true;
  }
  return false;
}

const { target, projectModel: projectModelId, technologyProfiles, aiSurface, adoptionPlan, internalSnapshot } = parseArgs(process.argv.slice(2));
const normalizedTarget = path.resolve(target);

if (!isGitRepo(normalizedTarget)) {
  console.error(`Target must be a git repository: ${normalizedTarget}`);
  process.exit(1);
}

if (adoptionPlan) {
  try {
    verifyExistingAdoptionPlan({ rootDir, targetRoot: normalizedTarget, planPath: adoptionPlan });
    console.log("Existing project adoption verification completed.");
  } catch (error) {
    console.error(`Existing project adoption verification failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

let failCount = 0;
let warnCount = 0;

function checkExists(relativePath) {
  if (exists(normalizedTarget, relativePath)) {
    ok(`${relativePath} exists`);
  } else {
    fail(`${relativePath} is missing`);
    failCount += 1;
  }
}

function checkNotExists(relativePath) {
  if (!exists(normalizedTarget, relativePath)) {
    ok(`${relativePath} is not present`);
  } else {
    fail(`${relativePath} should not be present`);
    failCount += 1;
  }
}

function checkContains(relativePath, regex, description) {
  const fullPath = path.join(normalizedTarget, relativePath);
  if (!fs.existsSync(fullPath) || !regex.test(readText(fullPath))) {
    fail(`${relativePath} does not ${description}`);
    failCount += 1;
    return;
  }
  ok(`${relativePath} ${description}`);
}

let projectModel;
try {
  projectModel = resolveProjectModel(loadProjectModelCatalog(rootDir), projectModelId);
  for (const output of resolveProjectModelOutput(projectModel, aiSurface)) checkExists(output.target);
} catch (error) {
  fail(error.message);
  failCount += 1;
}
if (aiSurface === "claude" || aiSurface === "both") checkContains("CLAUDE.md", /^@AGENTS\.md$/m, "imports AGENTS.md");
if (projectModel?.id === "development") {
  checkContains("CHANGELOG.md", /^## Unreleased$/m, "contains an Unreleased section");
} else if (projectModel?.id === "task-workspace") {
  for (const developmentOnly of ["CHANGELOG.md", "VERSION", "docs/VERSIONING.md", "docs/ROADMAP.md", "docs/PLAN_PHASE_CURRENT.md", "docs/DEVELOPMENT_GUIDELINE.md", "docs/TECHNOLOGY/INDEX.md"]) {
    checkNotExists(developmentOnly);
  }
}
checkNotExists("skills");
checkExists("docs/BOOTSTRAP_ADOPTION.md");
checkExists(".project-bootstrap/licenses/project-bootstrap-kit-MIT.txt");
if (!internalSnapshot) {
  checkExists(STATE_RELATIVE_PATH);
  try {
    readAndValidateBootstrapState(normalizedTarget, rootDir);
    ok(`${STATE_RELATIVE_PATH} integrity and baselines`);
  } catch (error) {
    fail(`${STATE_RELATIVE_PATH} validation failed: ${error.message}`);
    failCount += 1;
  }
}
checkNotExists("_AGENTS.md");
checkNotExists("_CLAUDE.md");
checkNotExists("docs/PLATFORM_GUIDELINE.md");

for (const profileId of technologyProfiles) {
  let profile;
  try {
    profile = loadTechnologyProfile(profilesDir, profileId);
  } catch (error) {
    fail(error.message);
    failCount += 1;
    continue;
  }
  checkExists(`docs/TECHNOLOGY/${profileId}/profile.json`);
  checkExists(`docs/TECHNOLOGY/${profileId}/GUIDELINE.md`);
  if (profile.reference) checkExists(`docs/TECHNOLOGY/${profileId}/REFERENCE.md`);
  for (const skillName of profile.skills ?? []) {
    if (aiSurface === "codex" || aiSurface === "rovo" || aiSurface === "both") {
      checkExists(`.agents/skills/${skillName}`);
    }
    if (aiSurface === "claude" || aiSurface === "both") {
      checkExists(`.claude/skills/${skillName}`);
    }
  }
}

if (repositoryContainsPattern(normalizedTarget, /<PROJECT_NAME>|<PROJECT_SLUG>|<PRODUCT_NAME>|<DATE>/)) {
  warn("Template placeholders are still present in the repository");
  warnCount += 1;
}

if (projectModel?.id === "development" &&
  checkTemplateMarker(
    normalizedTarget,
    "docs/ROADMAP.md",
    /何を実現するプロジェクトか|ここには完了済みフェーズを記載する|フェーズ候補/,
    "docs/ROADMAP.md is still template content"
  )
) {
  warnCount += 1;
}

if (projectModel?.id === "development" &&
  checkTemplateMarker(
    normalizedTarget,
    "docs/PLAN_PHASE_CURRENT.md",
    /ここに現在フェーズの主要目標を記載する|マイルストーン名|タスク名/,
    "docs/PLAN_PHASE_CURRENT.md is still template content"
  )
) {
  warnCount += 1;
}

if (failCount > 0) {
  console.log("");
  console.log(`Bootstrap verification completed with ${failCount} failures and ${warnCount} warnings.`);
  console.log("");
  console.log("----------------------------------------");
  console.log(" 次にやること");
  console.log("----------------------------------------");
  console.log("1. 失敗した項目を先に解消してください。");
  console.log("2. その後でもう一度 node scripts/verify-project-init.mjs を実行してください。");
  process.exit(1);
}

console.log("");
console.log(`Bootstrap verification completed with ${warnCount} warnings.`);
console.log("");
console.log("----------------------------------------");
console.log(" 次にやること");
console.log("----------------------------------------");
if (projectModel?.id === "development") {
  console.log("1. docs/WORK/0.1/ 配下の初期構想文書を更新して、発想、要求、技術候補、非機能要件を整理してください。");
  console.log("2. docs/ROADMAP.md と docs/PLAN_PHASE_CURRENT.md を具体化してください。");
  console.log("3. 採用技術が確定したら必要な technology profile を追加してください。");
} else {
  console.log("1. context/CONTEXT.md と context/MASTER.md に継続利用する前提を記録してください。");
  console.log("2. SESSION_HANDOFF.md と sessions/SESSION_INDEX.md を現在の作業へ更新してください。");
  console.log("3. 成果物は outputs/ に保存し、durable contextと区別してください。");
}
