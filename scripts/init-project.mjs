#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  assertTechnologyProfilesApplicable,
  applyTechnologyProfiles,
  listTechnologyProfileIds,
  loadTechnologyProfile,
} from "./technology-profile-lib.mjs";
import {
  loadProjectModelCatalog,
  materializeProjectModel,
  projectModelManifestDigest,
  resolveProjectModel,
} from "./project-model-lib.mjs";
import { acceptAdoptionManualMerge, applyAdoptionPlan, createAdoptionPlan, initializeFreshBootstrapState } from "./adoption-plan-lib.mjs";
import { getKitGitMetadata } from "./bootstrap-state-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const profilesDir = path.join(rootDir, "profiles");
const verifyScript = path.join(rootDir, "scripts", "verify-project-init.mjs");
const versionFile = path.join(rootDir, "VERSION");

function usage() {
  const profiles = listTechnologyProfileIds(profilesDir).join("|");
  console.log(`Usage:
  node scripts/init-project.mjs --target <path> --project-name <name> --project-slug <slug> --ai-surface <codex|claude|rovo|both> [--project-model <development|task-workspace>] [--product-name <name>] [--technology-profile <${profiles}> ...]
  node scripts/init-project.mjs --target <path> --project-name <name> --project-slug <slug> --ai-surface <codex|claude|rovo|both> [--project-model <development|task-workspace>] [--product-name <name>] [--technology-profile <${profiles}> ...] --adopt-existing [--plan-output <path>]
  node scripts/init-project.mjs --apply-adoption-plan <path> [--apply-safe-only]
  node scripts/init-project.mjs --accept-adoption-manual-merge <plan> --path <path> --reason <reason>

Options:
  --adopt-existing              Create a non-destructive adoption plan for a non-empty, unadopted Git repository
  --apply-adoption-plan <path>  Apply a reviewed adoption plan
  --apply-safe-only             Apply only ADD entries and keep formal adoption pending
  --plan-output <path>          Adoption plan bundle path; may be outside the target
  --show-extras                 Print every EXTRA path during adoption planning
  --force-overwrite             Deprecated for non-empty targets; use --adopt-existing`);
}

function parseArgs(argv) {
  const args = {
    target: "",
    projectModel: "",
    projectName: "",
    projectSlug: "",
    productName: "",
    technologyProfiles: [],
    aiSurface: "",
    forceOverwrite: false,
    operation: "init",
    adoptionPlan: "",
    applySafeOnly: false,
    planOutput: "",
    sawAdoptExisting: false,
    sawApplyAdoptionPlan: false,
    internalSnapshot: false,
    showExtras: false,
    decisionPath: "",
    reason: "",
    internalAppliedAt: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target") {
      args.target = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--project-model") {
      if (args.projectModel) {
        console.error("--project-model can be specified only once.");
        process.exit(1);
      }
      args.projectModel = argv[i + 1] ?? "";
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
    } else if (arg === "--technology-profile") {
      args.technologyProfiles.push(argv[i + 1] ?? "");
      i += 1;
    } else if (arg === "--ai-surface") {
      args.aiSurface = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--force-overwrite") {
      args.forceOverwrite = true;
    } else if (arg === "--adopt-existing") {
      args.operation = "adopt-existing";
      args.sawAdoptExisting = true;
    } else if (arg === "--apply-adoption-plan") {
      args.operation = "apply-adoption-plan";
      args.sawApplyAdoptionPlan = true;
      args.adoptionPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--apply-safe-only") {
      args.applySafeOnly = true;
    } else if (arg === "--plan-output") {
      args.planOutput = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--show-extras") {
      args.showExtras = true;
    } else if (arg === "--accept-adoption-manual-merge") {
      args.operation = "accept-adoption-manual-merge";
      args.adoptionPlan = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--path") {
      args.decisionPath = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--reason") {
      args.reason = argv[i + 1] ?? "";
      i += 1;
    } else if (arg === "--internal-snapshot") {
      args.internalSnapshot = true;
    } else if (arg === "--internal-applied-at") {
      args.internalAppliedAt = argv[i + 1] ?? "";
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

  if (args.sawAdoptExisting && args.sawApplyAdoptionPlan) {
    console.error("--adopt-existing and --apply-adoption-plan cannot be used together.");
    process.exit(1);
  }
  if (args.operation === "apply-adoption-plan" || args.operation === "accept-adoption-manual-merge") {
    if (!args.adoptionPlan) {
      usage();
      process.exit(1);
    }
    if (args.forceOverwrite || args.planOutput) {
      console.error("--apply-adoption-plan cannot be combined with --force-overwrite or --plan-output.");
      process.exit(1);
    }
    if (args.operation === "accept-adoption-manual-merge" && (!args.decisionPath || !args.reason)) {
      console.error("--accept-adoption-manual-merge requires --path and --reason.");
      process.exit(1);
    }
    return args;
  }
  if (!args.target || !args.projectName || !args.projectSlug || !args.aiSurface) {
    if (args.target && args.projectName && args.productName && !args.projectSlug) {
      console.error("Legacy naming arguments are no longer accepted: --project-name is now the human-facing name. Add an explicit lowercase kebab-case --project-slug; do not infer it from the old --project-name value.");
    }
    usage();
    process.exit(1);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(args.projectSlug)) {
    console.error(`Invalid project slug: ${args.projectSlug}. Use lowercase kebab-case.`);
    process.exit(1);
  }
  if (!["codex", "claude", "rovo", "both"].includes(args.aiSurface)) {
    console.error(`Unsupported ai surface: ${args.aiSurface}`);
    usage();
    process.exit(1);
  }

  args.technologyProfiles = [...new Set(args.technologyProfiles.filter(Boolean))];

  if (args.operation === "adopt-existing" && args.forceOverwrite) {
    console.error("--adopt-existing and --force-overwrite cannot be used together.");
    process.exit(1);
  }
  if (args.operation !== "apply-adoption-plan" && args.applySafeOnly) {
    console.error("--apply-safe-only requires --apply-adoption-plan.");
    process.exit(1);
  }
  if (args.operation !== "adopt-existing" && args.planOutput) {
    console.error("--plan-output is only available with --adopt-existing.");
    process.exit(1);
  }

  return args;
}

function getSkillTargets(aiSurface, targetRoot) {
  if (aiSurface === "codex" || aiSurface === "rovo") {
    return [path.join(targetRoot, ".agents", "skills")];
  }
  if (aiSurface === "claude") {
    return [path.join(targetRoot, ".claude", "skills")];
  }
  if (aiSurface === "both") {
    return [
      path.join(targetRoot, ".agents", "skills"),
      path.join(targetRoot, ".claude", "skills"),
    ];
  }
  console.error(`Unsupported ai surface: ${aiSurface}`);
  process.exit(1);
}

function isGitRepo(target) {
  return fs.existsSync(path.join(target, ".git"));
}

function isRepoEmptyExceptGit(target) {
  const entries = fs.readdirSync(target).filter((name) => name !== ".git");
  return entries.length === 0;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function replacePlaceholders(rootPath, replacements) {
  function walk(dirPath) {
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
      } else if (entry.isFile() && /\.(md|mjs|js|json|txt)$/u.test(entry.name)) {
        let content = fs.readFileSync(entryPath, "utf8");
        for (const [from, to] of replacements) {
          content = content.replaceAll(from, to);
        }
        fs.writeFileSync(entryPath, content, "utf8");
      }
    }
  }

  walk(rootPath);
}

function writeBootstrapAdoption(target, meta) {
  const generatedLines = meta.generatedPaths.map((generatedPath) => `    - ${generatedPath}`).join("\n");
  const output = `# Bootstrap Adoption

- Bootstrap Kit: project-bootstrap-kit
- Version: ${meta.version}
- Applied At: ${meta.appliedAt}
- Project Name: ${meta.projectName}
- Project Slug: ${meta.projectSlug}
- Product Name: ${meta.productName || "not-applicable"}
- Project Model: ${meta.projectModel.id}
- Project Model Version: ${meta.projectModel.version}
- Project Model Status: ${meta.projectModel.status}
- Project Model Contract Version: ${meta.projectModel.schemaVersion}
- Project Model Manifest Digest: ${meta.projectModel.manifestDigest}
- Technology Profiles: ${meta.technologyProfiles.join(", ") || "none"}
- AI Surface: ${meta.aiSurface}
- Force Overwrite: ${String(meta.forceOverwrite)}
- Upgrade History:
  - ${meta.appliedAt}: Initial bootstrap from v${meta.version}
- Generated Files:
  - ${meta.appliedAt}
${generatedLines}
`;

  fs.writeFileSync(path.join(target, "docs", "BOOTSTRAP_ADOPTION.md"), output, "utf8");
}

const {
  target,
  projectModel: projectModelId,
  projectName,
  projectSlug,
  productName,
  technologyProfiles,
  aiSurface,
  forceOverwrite,
  operation,
  adoptionPlan,
  applySafeOnly,
  planOutput,
  internalSnapshot,
  showExtras,
  decisionPath,
  reason,
  internalAppliedAt,
} = parseArgs(process.argv.slice(2));
const normalizedTarget = target ? path.resolve(target) : "";
let projectModel;

try {
  const modelCatalog = loadProjectModelCatalog(rootDir);
  projectModel = resolveProjectModel(modelCatalog, projectModelId);
  if (projectModel.id === "development" && !productName) {
    // The development model uses the project name as the default product name.
  } else if (projectModel.id !== "development" && productName) {
    throw new Error(`--product-name is not applicable to Project Model ${projectModel.id}`);
  }
  if (projectModel.technologyProfilePolicy === "none" && technologyProfiles.length > 0) {
    throw new Error(`Project Model ${projectModel.id} does not accept Technology Profiles`);
  }
  assertTechnologyProfilesApplicable(profilesDir, technologyProfiles, projectModel.id);
  for (const profileId of technologyProfiles) {
    loadTechnologyProfile(profilesDir, profileId);
  }
} catch (error) {
  console.error(error.message);
  usage();
  process.exit(1);
}

if (!fs.existsSync(versionFile)) {
  console.error(`VERSION file is missing: ${versionFile}`);
  process.exit(1);
}

if (operation === "apply-adoption-plan") {
  try {
    applyAdoptionPlan({ rootDir, planPath: adoptionPlan, safeOnly: applySafeOnly });
  } catch (error) {
    console.error(`Existing project adoption failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (operation === "accept-adoption-manual-merge") {
  try {
    acceptAdoptionManualMerge({ rootDir, planPath: adoptionPlan, relativePath: decisionPath, reason });
    console.log(`Accepted manual merge for ${decisionPath}.`);
  } catch (error) {
    console.error(`Manual merge acceptance failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (operation === "adopt-existing") {
  try {
    createAdoptionPlan({
      rootDir,
      initScript: path.join(rootDir, "scripts", "init-project.mjs"),
      targetRoot: normalizedTarget,
      projectModel,
      projectName,
      projectSlug,
      productName: projectModel.id === "development" ? productName || projectName : null,
      aiSurface,
      technologyProfiles,
      planOutput,
      showExtras,
    });
  } catch (error) {
    console.error(`Existing project adoption planning failed: ${error.message}`);
    process.exit(1);
  }
  process.exit(0);
}

const kitVersion = fs.readFileSync(versionFile, "utf8").trim();
if (!internalSnapshot && !getKitGitMetadata(rootDir).clean) {
  console.error("Fresh init requires a clean project-bootstrap-kit Git checkout so VERSION, commit, state, and baseline agree.");
  process.exit(1);
}
ensureDir(normalizedTarget);

if (!isGitRepo(normalizedTarget)) {
  console.error(`Target must be a git repository: ${normalizedTarget}`);
  process.exit(1);
}

if (!isRepoEmptyExceptGit(normalizedTarget)) {
  if (forceOverwrite) {
    console.error("--force-overwrite is no longer supported for non-empty targets because it can overwrite existing files. Use --adopt-existing to create a reviewable plan.");
  } else {
    console.error("Target repository is not empty. Use --adopt-existing to create a non-destructive adoption plan.");
  }
  process.exit(1);
}

const modelOutput = materializeProjectModel({ rootDir, targetRoot: normalizedTarget, model: projectModel, aiSurface });

const attributionTarget = path.join(normalizedTarget, ".project-bootstrap", "licenses", "project-bootstrap-kit-MIT.txt");
ensureDir(path.dirname(attributionTarget));
fs.copyFileSync(path.join(rootDir, "assets", "licenses", "project-bootstrap-kit-MIT.txt"), attributionTarget);

const skillTargets = getSkillTargets(aiSurface, normalizedTarget);

if (projectModel.technologyProfilePolicy !== "none") {
  applyTechnologyProfiles({
    rootDir,
    profilesDir,
    targetRoot: normalizedTarget,
    profileIds: technologyProfiles,
    aiSurface,
    appliedAt: internalAppliedAt,
  });
}

replacePlaceholders(normalizedTarget, [
  ["<PROJECT_NAME>", projectName],
  ["<PROJECT_SLUG>", projectSlug],
  ["<PRODUCT_NAME>", projectModel.id === "development" ? productName || projectName : projectName],
]);

ensureDir(path.join(normalizedTarget, "docs"));
const appliedAt = internalAppliedAt || new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
writeBootstrapAdoption(normalizedTarget, {
  version: kitVersion,
  appliedAt,
  projectName,
  projectSlug,
  productName: projectModel.id === "development" ? productName || projectName : null,
  projectModel: { ...projectModel, manifestDigest: projectModelManifestDigest(projectModel) },
  technologyProfiles,
  aiSurface,
  forceOverwrite,
  generatedPaths: [
    ...modelOutput.map((entry) => entry.target),
    ".project-bootstrap/licenses/project-bootstrap-kit-MIT.txt",
    "docs/BOOTSTRAP_ADOPTION.md",
    "docs/BOOTSTRAP_STATE.json",
    ".project-bootstrap/baselines/",
    ...skillTargets.map((skillTarget) => `${path.relative(normalizedTarget, skillTarget)}/`),
  ].filter((value, index, values) => values.indexOf(value) === index).sort(),
});

if (!internalSnapshot) {
  initializeFreshBootstrapState({
    rootDir,
    targetRoot: normalizedTarget,
    projectModel,
    projectName,
    projectSlug,
    productName: projectModel.id === "development" ? productName || projectName : null,
    aiSurface,
    technologyProfiles,
    appliedAt,
  });
}

const verifyArgs = [verifyScript, "--target", normalizedTarget, "--project-model", projectModel.id, "--ai-surface", aiSurface];
if (internalSnapshot) verifyArgs.push("--internal-snapshot");
for (const profileId of technologyProfiles) {
  verifyArgs.push("--technology-profile", profileId);
}

console.log("");
console.log("========================================");
console.log(" Bootstrap Setup");
console.log("========================================");
console.log(`Target:              ${normalizedTarget}`);
console.log(`Project Name:        ${projectName}`);
console.log(`Project Slug:        ${projectSlug}`);
console.log(`Product Name:        ${projectModel.id === "development" ? productName || projectName : "not-applicable"}`);
console.log(`Project Model:       ${projectModel.id} (${projectModel.version}, ${projectModel.status})`);
console.log(`Technology Profiles: ${technologyProfiles.join(", ") || "none"}`);
console.log(`AI Surface:          ${aiSurface}`);
console.log(`Bootstrap Version:   ${kitVersion}`);
console.log("");
console.log("----------------------------------------");
console.log(" Verification");
console.log("----------------------------------------");
const verifyResult = spawnSync(process.execPath, verifyArgs, { stdio: "inherit" });
if (verifyResult.status !== 0) {
  process.exit(verifyResult.status ?? 1);
}

console.log("");
console.log("<<< Bootstrap completed. >>>");
