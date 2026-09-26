import fs from "node:fs";
import path from "node:path";
import {
  ADOPTION_RELATIVE_PATH,
  STATE_RELATIVE_PATH,
  canonicalJson,
  entryExists,
  entryInfo,
  getKitGitMetadata,
  loadDistributionContract,
  sha256Buffer,
  stateDigest,
  timestampForFile,
  writeBootstrapState,
} from "./bootstrap-state-lib.mjs";
import { loadProjectModelCatalog, projectModelManifestDigest, resolveProjectModel } from "./project-model-lib.mjs";

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function defaultPlanPath(targetRoot) { return path.join(targetRoot, ".bootstrap-upgrade-diff", `state-schema-migration-plan_${timestampForFile()}.json`); }
function planDigest(plan) {
  const copy = structuredClone(plan);
  delete copy.planIntegrity;
  return sha256Buffer(Buffer.from(canonicalJson(copy), "utf8"));
}

function loadLegacyState(targetRoot, rootDir) {
  const statePath = path.join(targetRoot, STATE_RELATIVE_PATH);
  if (!entryExists(statePath)) throw new Error(`Bootstrap state is missing: ${statePath}`);
  const state = readJson(statePath);
  if (state.schemaVersion !== 1) throw new Error(`State schema migration expects schema 1; actual=${state.schemaVersion}`);
  if (state.integrity?.digest !== stateDigest(state)) throw new Error("Legacy bootstrap state integrity digest does not match.");
  const contract = loadDistributionContract(rootDir);
  const seen = new Set();
  for (const item of state.paths ?? []) {
    if (!item.path || path.isAbsolute(item.path) || item.path.split(path.sep).includes("..") || seen.has(item.path)) throw new Error(`Invalid or duplicate legacy state path: ${item.path}`);
    seen.add(item.path);
    if (!contract.ownershipValues.includes(item.ownership)) throw new Error(`Invalid legacy ownership: ${item.path}`);
    if (item.baselineObject) {
      const hash = item.acceptedUpstreamHash;
      if (!/^sha256:[a-f0-9]{64}$/u.test(hash ?? "")) throw new Error(`Invalid legacy baseline hash: ${item.path}`);
      const expected = path.join(".project-bootstrap", "baselines", "sha256", hash.slice("sha256:".length));
      if (item.baselineObject !== expected) throw new Error(`Invalid legacy baseline reference: ${item.path}`);
      const baselinePath = path.join(targetRoot, expected);
      if (!entryExists(baselinePath)) throw new Error(`Legacy baseline object is missing: ${item.path}`);
      if (sha256Buffer(fs.readFileSync(baselinePath)) !== hash) throw new Error(`Legacy baseline object hash mismatch: ${item.path}`);
    }
  }
  return state;
}

function modelMetadata(rootDir) {
  const model = resolveProjectModel(loadProjectModelCatalog(rootDir), "development");
  return {
    id: model.id,
    version: model.version,
    status: model.status,
    contractVersion: model.schemaVersion,
    manifestDigest: projectModelManifestDigest(model),
  };
}

export function scanStateSchemaMigration({ rootDir, targetRoot, planOutput, projectName }) {
  const state = loadLegacyState(targetRoot, rootDir);
  const projectSlug = state.project?.name ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(projectSlug)) {
    throw new Error(`Legacy project.name is not a valid lowercase kebab-case slug: ${projectSlug}`);
  }
  const productName = state.project?.productName;
  if (typeof productName !== "string" || !productName.trim()) throw new Error("Legacy state productName is missing.");
  const proposedProjectName = projectName || productName;
  const outputPath = path.resolve(planOutput || defaultPlanPath(targetRoot));
  if (entryExists(outputPath)) throw new Error(`State schema migration plan already exists: ${outputPath}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const kitVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
  const kitGit = getKitGitMetadata(rootDir);
  const plan = {
    schemaVersion: 1,
    operation: "bootstrap-state-schema-migration",
    generatedAt: new Date().toISOString(),
    target: path.resolve(targetRoot),
    kit: { name: "project-bootstrap-kit", version: kitVersion, commit: kitGit.commit, clean: kitGit.clean },
    previousStateDigest: state.integrity.digest,
    evidence: {
      state: entryInfo(targetRoot, STATE_RELATIVE_PATH),
      adoption: entryInfo(targetRoot, ADOPTION_RELATIVE_PATH),
    },
    migration: {
      fromSchemaVersion: 1,
      toSchemaVersion: 2,
      projectName: proposedProjectName,
      projectNameSource: projectName ? "explicit-cli" : "legacy-product-name-candidate",
      projectNameConfirmed: Boolean(projectName),
      projectSlug,
      productName,
      projectModel: modelMetadata(rootDir),
      contentFilesChanged: false,
    },
    warnings: [
      ...(projectName ? [] : ["Project Name is only a candidate. Re-run scan with --project-name after owner review before apply."]),
      ...(kitGit.clean ? [] : ["Plan was created from a dirty kit checkout; apply requires the matching clean HEAD."]),
    ],
  };
  plan.planIntegrity = { algorithm: "sha256", digest: planDigest(plan) };
  fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  console.log("\n========================================\n Bootstrap State Schema Migration\n========================================");
  console.log(`Target:              ${plan.target}`);
  console.log(`Schema:              1 -> 2`);
  console.log(`Project Name:        ${proposedProjectName}${projectName ? " (confirmed by scan input)" : " (review required)"}`);
  console.log(`Project Slug:        ${projectSlug}`);
  console.log(`Product Name:        ${productName}`);
  console.log("Project Model:       development");
  console.log("Content file change: none");
  console.log(`Plan file:           ${outputPath}`);
  return { plan, outputPath };
}

function addOrReplaceField(content, field, value) {
  const pattern = new RegExp(`^- ${field}:.*$`, "mu");
  if (pattern.test(content)) return content.replace(pattern, `- ${field}: ${value}`);
  const anchor = /^- Project Name:.*$/mu;
  if (anchor.test(content)) return content.replace(anchor, (line) => `${line}\n- ${field}: ${value}`);
  return `${content.trimEnd()}\n- ${field}: ${value}\n`;
}

export function applyStateSchemaMigration({ rootDir, planPath }) {
  const resolved = path.resolve(planPath);
  const plan = readJson(resolved);
  if (plan.schemaVersion !== 1 || plan.operation !== "bootstrap-state-schema-migration") throw new Error("Unsupported state schema migration plan.");
  if (plan.planIntegrity?.digest !== planDigest(plan)) throw new Error("State schema migration plan integrity does not match.");
  if (plan.migration?.projectNameConfirmed !== true || plan.migration.projectNameSource !== "explicit-cli") {
    throw new Error("Project Name is not owner-confirmed. Re-run --scan with explicit --project-name.");
  }
  const targetRoot = path.resolve(plan.target);
  const currentState = readJson(path.join(targetRoot, STATE_RELATIVE_PATH));
  if (currentState.schemaVersion === 2) {
    const same = currentState.project?.name === plan.migration.projectName
      && currentState.project?.slug === plan.migration.projectSlug
      && currentState.project?.productName === plan.migration.productName
      && canonicalJson(currentState.project?.model) === canonicalJson(plan.migration.projectModel);
    if (!same) throw new Error("Schema 2 state already exists with different Project Model metadata.");
    console.log("SKIP(SAME): bootstrap state schema migration is already applied.");
    return { state: currentState, targetRoot, status: "skipped" };
  }
  const state = loadLegacyState(targetRoot, rootDir);
  if (state.integrity.digest !== plan.previousStateDigest) throw new Error("Bootstrap state changed after migration scan.");
  if (JSON.stringify(entryInfo(targetRoot, STATE_RELATIVE_PATH)) !== JSON.stringify(plan.evidence.state)) throw new Error("Bootstrap state evidence changed after migration scan.");
  if (JSON.stringify(entryInfo(targetRoot, ADOPTION_RELATIVE_PATH)) !== JSON.stringify(plan.evidence.adoption)) throw new Error("Bootstrap adoption evidence changed after migration scan.");
  const kitGit = getKitGitMetadata(rootDir);
  if (!kitGit.clean || kitGit.commit !== plan.kit.commit) throw new Error("State schema migration apply requires the clean kit HEAD used to create the plan.");
  const currentModel = modelMetadata(rootDir);
  if (canonicalJson(currentModel) !== canonicalJson(plan.migration.projectModel)) throw new Error("Project Model manifest changed after migration scan.");

  const now = new Date().toISOString();
  const next = structuredClone(state);
  next.schemaVersion = 2;
  next.project = {
    name: plan.migration.projectName,
    slug: plan.migration.projectSlug,
    productName: plan.migration.productName,
    model: plan.migration.projectModel,
    aiSurface: state.project.aiSurface,
    technologyProfiles: state.project.technologyProfiles ?? [],
    snapshotAppliedAt: state.project.snapshotAppliedAt,
  };
  next.history = [...(state.history ?? []), {
    at: now,
    operation: "bootstrap-state-schema-migration",
    fromSchemaVersion: 1,
    toSchemaVersion: 2,
    projectNameSource: plan.migration.projectNameSource,
    kitVersion: plan.kit.version,
    kitCommit: plan.kit.commit,
  }];
  writeBootstrapState(targetRoot, next);

  const adoptionPath = path.join(targetRoot, ADOPTION_RELATIVE_PATH);
  if (entryExists(adoptionPath)) {
    let content = fs.readFileSync(adoptionPath, "utf8");
    content = addOrReplaceField(content, "Project Name", plan.migration.projectName);
    content = addOrReplaceField(content, "Project Slug", plan.migration.projectSlug);
    content = addOrReplaceField(content, "Product Name", plan.migration.productName);
    content = addOrReplaceField(content, "Project Model", plan.migration.projectModel.id);
    content = addOrReplaceField(content, "Project Model Version", plan.migration.projectModel.version);
    content = addOrReplaceField(content, "Project Model Status", plan.migration.projectModel.status);
    content = addOrReplaceField(content, "Project Model Contract Version", plan.migration.projectModel.contractVersion);
    content = addOrReplaceField(content, "Project Model Manifest Digest", plan.migration.projectModel.manifestDigest);
    content = `${content.trimEnd()}\n\n## State Schema Migration ${now}\n\n- Schema: 1 -> 2\n- Content Files Changed: none\n- Kit Version: ${plan.kit.version}\n- Kit Commit: ${plan.kit.commit}\n`;
    fs.writeFileSync(adoptionPath, content, "utf8");
  }
  console.log("Bootstrap state schema migration completed. Content files were not changed.");
  return { state: next, targetRoot, status: "applied" };
}
