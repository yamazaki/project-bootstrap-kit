import fs from "node:fs";
import path from "node:path";
import { applyStateUpgrade, scanStateUpgrade } from "./bootstrap-upgrade-state-lib.mjs";
import { STATE_RELATIVE_PATH } from "./bootstrap-state-lib.mjs";
import { applyAdoptionPlan, createAdoptionPlan } from "./adoption-plan-lib.mjs";
import { applyStateSchemaMigration, scanStateSchemaMigration } from "./state-schema-migration-lib.mjs";
import { loadProjectModelCatalog, resolveProjectModel } from "./project-model-lib.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function initProjectCommand(targetRoot) {
  return `node scripts/init-project.mjs --target ${JSON.stringify(targetRoot)} --project-name <project-name> --project-slug <project-slug> --ai-surface <codex|claude|rovo|both> --adopt-existing`;
}

function adoptionMetadata(targetRoot) {
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  const content = fs.existsSync(adoptionPath) ? fs.readFileSync(adoptionPath, "utf8") : "";
  const field = (name) => content.match(new RegExp(`^- ${name}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
  const profileText = field("Technology Profiles") || field("Platform Profile");
  const technologyProfiles = !profileText || profileText === "none" ? [] : profileText.split(",").map((value) => value.trim()).filter(Boolean);
  let aiSurface = field("AI Surface");
  if (!aiSurface) {
    const agents = fs.existsSync(path.join(targetRoot, ".agents", "skills"));
    const claude = fs.existsSync(path.join(targetRoot, ".claude", "skills"));
    aiSurface = agents && claude ? "both" : claude ? "claude" : agents ? "codex" : "";
  }
  return {
    content,
    projectName: field("Project Name") || path.basename(targetRoot),
    productName: field("Product Name") || field("Project Name") || path.basename(targetRoot),
    aiSurface,
    technologyProfiles,
  };
}

function validateAdoptedTarget(targetRoot, operationLabel) {
  if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) {
    throw new Error(`Target directory was not found: ${targetRoot}`);
  }
  if (!fs.existsSync(path.join(targetRoot, ".git"))) {
    throw new Error(`Target must be a Git repository: ${targetRoot}`);
  }
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  const adoption = fs.existsSync(adoptionPath) ? fs.readFileSync(adoptionPath, "utf8") : "";
  if (!/^- Bootstrap Kit:\s*project-bootstrap-kit\s*$/mu.test(adoption)) {
    throw new Error([
      `project-bootstrap-kitの適用記録を確認できないため${operationLabel}を停止しました。`,
      `Target: ${targetRoot}`,
      "未適用projectでは最新kitのmature adoption planを生成してください。",
      `  ${initProjectCommand(targetRoot)}`,
    ].join("\n"));
  }
}

export function scanUpgradeTarget({ rootDir, targetRoot, planOutput, aiSurface, technologyProfiles = [], projectName, productName }) {
  const normalizedTarget = path.resolve(targetRoot);
  validateAdoptedTarget(normalizedTarget, "upgrade scan");
  if (!fs.existsSync(path.join(normalizedTarget, STATE_RELATIVE_PATH))) {
    const metadata = adoptionMetadata(normalizedTarget);
    const selectedAiSurface = aiSurface || metadata.aiSurface;
    if (!selectedAiSurface) throw new Error("AI surface could not be inferred from the legacy adoption. Re-run --scan with --ai-surface.");
    console.log("Bootstrap state is missing; creating a legacy-adopter state migration plan.");
    return createAdoptionPlan({
      rootDir,
      initScript: path.join(rootDir, "scripts", "init-project.mjs"),
      targetRoot: normalizedTarget,
      projectModel: resolveProjectModel(loadProjectModelCatalog(rootDir), "development"),
      projectName: projectName || metadata.projectName,
      projectSlug: metadata.projectName,
      productName: productName || metadata.productName,
      aiSurface: selectedAiSurface,
      technologyProfiles: technologyProfiles.length > 0 ? technologyProfiles : metadata.technologyProfiles,
      planOutput,
      adoptionMode: "legacy-state-migration",
    });
  }
  const rawState = readJson(path.join(normalizedTarget, STATE_RELATIVE_PATH));
  if (rawState.schemaVersion === 1) {
    console.log("Bootstrap state schema 1 detected; creating a metadata-only schema migration plan.");
    return scanStateSchemaMigration({ rootDir, targetRoot: normalizedTarget, planOutput, projectName });
  }
  return scanStateUpgrade({ rootDir, targetRoot: normalizedTarget, planOutput });
}

export function applyUpgradePlan({ rootDir, planPath, requestedTarget, safeOnly = false }) {
  const resolvedPlanPath = path.resolve(planPath);
  const plan = readJson(resolvedPlanPath);
  if (requestedTarget && path.resolve(requestedTarget) !== path.resolve(plan.target)) {
    throw new Error(`Plan target does not match requested target: ${plan.target}`);
  }
  if (plan.operation === "adopt-existing") {
    applyAdoptionPlan({ rootDir, planPath: resolvedPlanPath, safeOnly });
    return;
  }
  if (plan.operation === "bootstrap-state-schema-migration") {
    if (safeOnly) throw new Error("--apply-safe-only is not valid for a state schema migration plan.");
    applyStateSchemaMigration({ rootDir, planPath: resolvedPlanPath });
    return;
  }
  if (plan.operation !== "state-upgrade") throw new Error("Unsupported legacy plan. Re-run --scan to create schema 2 state migration or upgrade plan.");
  if (safeOnly) throw new Error("--apply-safe-only is only valid for a legacy-adopter state migration plan.");
  validateAdoptedTarget(path.resolve(plan.target), "upgrade plan apply");
  applyStateUpgrade({ rootDir, planPath: resolvedPlanPath });
}
