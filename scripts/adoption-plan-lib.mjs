import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  ADOPTION_RELATIVE_PATH,
  STATE_RELATIVE_PATH,
  copyDistributionTree,
  copyEntry,
  createExpectedBootstrap,
  entryExists,
  entryInfo,
  ensureDir,
  getKitGitMetadata,
  loadDistributionContract,
  managedFingerprint,
  managedFingerprintFromEvidence,
  readEntryBytes,
  reasonWarnings,
  storeBaselineObject,
  timestampForFile,
  validateSingleLineReason,
  walkDistributionFiles,
  writeBootstrapState,
  readAndValidateBootstrapState,
} from "./bootstrap-state-lib.mjs";
import { projectModelManifestDigest } from "./project-model-lib.mjs";

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }

function validateExistingTarget(targetRoot) {
  if (!entryExists(targetRoot) || !fs.statSync(targetRoot).isDirectory()) throw new Error(`Existing project target was not found: ${targetRoot}`);
  if (!entryExists(path.join(targetRoot, ".git"))) throw new Error(`Existing project target must be a Git repository: ${targetRoot}`);
  const entries = fs.readdirSync(targetRoot).filter((name) => name !== ".git" && name !== ".bootstrap-upgrade-diff");
  if (entries.length === 0) throw new Error("Target is empty. Use normal init without --adopt-existing.");
  if (entryExists(path.join(targetRoot, STATE_RELATIVE_PATH))) throw new Error("Target already has bootstrap state. Use upgrade-project.mjs --scan.");
}

function defaultPlanPath(targetRoot) { return path.join(targetRoot, ".bootstrap-upgrade-diff", `adoption-plan_${timestampForFile()}.json`); }
function bundlePath(planPath) { return `${planPath}.bundle`; }
function snapshotPath(planPath) { return path.join(bundlePath(planPath), "snapshot"); }

function validateOutputPath(targetRoot, requestedPath) {
  const outputPath = path.resolve(requestedPath || defaultPlanPath(targetRoot));
  const target = path.resolve(targetRoot);
  if (outputPath === target || outputPath.startsWith(`${target}${path.sep}`)) {
    const allowed = path.join(target, ".bootstrap-upgrade-diff");
    if (outputPath !== allowed && !outputPath.startsWith(`${allowed}${path.sep}`)) throw new Error(`Plan inside target must be under ${allowed}`);
  }
  return outputPath;
}

const SYNTHETIC_SNAPSHOT_APPLIED_AT = "2000-01-01 00:00:00Z";

function classifyFiles(expectedRoot, targetRoot, contract, adoptionMode) {
  const expectedFiles = walkDistributionFiles(expectedRoot);
  const targetFiles = walkDistributionFiles(targetRoot);
  const expectedSet = new Set(expectedFiles);
  const files = expectedFiles.map((relativePath) => {
    const upstream = entryInfo(expectedRoot, relativePath);
    const project = entryInfo(targetRoot, relativePath);
    const status = !project.exists ? "ADD" : project.kind === upstream.kind && project.hash === upstream.hash && project.mode === upstream.mode ? "SKIP(SAME)" : "CONFLICT";
    const engineManaged = contract.engineManagedPaths.includes(relativePath);
    const preservesLegacyAdoption = adoptionMode === "legacy-state-migration" && relativePath === ADOPTION_RELATIVE_PATH && status === "CONFLICT";
    return {
      path: relativePath,
      status,
      upstream,
      project,
      engineManaged,
      resolution: status === "SKIP(SAME)" ? "same" : preservesLegacyAdoption ? "keep" : engineManaged && status === "ADD" ? "add" : "unresolved",
      confirmAdd: engineManaged && status === "ADD",
      confirmReplace: false,
      reason: preservesLegacyAdoption ? "legacy adoption historyを保持しstate migration記録を追記" : "",
      satisfiedBy: null,
      supersededBy: null,
      ownership: status === "CONFLICT" ? "project-owned" : "kit-managed",
      decisionAcceptedAt: null,
      acceptedProjectHash: null,
    };
  });
  return { files, extras: targetFiles.filter((relativePath) => !expectedSet.has(relativePath)) };
}

function immutableMetadata(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    operation: plan.operation,
    kit: plan.kit,
    target: plan.target,
    options: plan.options,
    bundlePath: plan.bundlePath,
    files: plan.files.map(({ path: filePath, status, upstream, project, engineManaged }) => ({ path: filePath, status, upstream, project, engineManaged })),
  };
}

function planFingerprint(plan, targetRoot) { return managedFingerprint(targetRoot, plan.files, immutableMetadata(plan)); }

function topLevelCounts(extras) {
  const counts = new Map();
  for (const item of extras) { const top = item.split(path.sep)[0]; counts.set(top, (counts.get(top) ?? 0) + 1); }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function printPlan(plan, outputPath, showExtras) {
  const count = (status) => plan.files.filter((entry) => entry.status === status).length;
  console.log("\n========================================\n Mature Existing Project Adoption Plan\n========================================");
  console.log(`Target:              ${plan.target}`);
  console.log(`Kit Version:         ${plan.kit.version}`);
  console.log(`Kit Commit:          ${plan.kit.commit}${plan.kit.clean ? "" : " (dirty plan source)"}`);
  console.log(`AI Surface:          ${plan.options.aiSurface}`);
  console.log(`Technology Profiles: ${plan.options.technologyProfiles.join(", ") || "none"}`);
  console.log(`ADD:                 ${count("ADD")}\nSKIP(SAME):          ${count("SKIP(SAME)")}\nCONFLICT:            ${count("CONFLICT")}\nEXTRA:               ${plan.extras.length}\n`);
  for (const entry of plan.files.filter((item) => item.status !== "SKIP(SAME)")) console.log(`[${entry.status}] ${entry.path}`);
  console.log("\nEXTRA summary:");
  for (const [top, total] of topLevelCounts(plan.extras)) console.log(`  ${top}: ${total}`);
  if (showExtras) for (const item of plan.extras) console.log(`[EXTRA] ${item}`);
  else if (plan.extras.length > 0) console.log("Use --show-extras or inspect plan.extras for the full list.");
  console.log(`\nPlan file: ${outputPath}\nBundle:    ${plan.bundlePath}`);
  console.log("ADD and CONFLICT decisions are unresolved by default. Review every managed path before complete apply.");
}

export function createAdoptionPlan({ rootDir, initScript, targetRoot, projectModel, projectName, projectSlug, productName, aiSurface, technologyProfiles, planOutput, showExtras = false, adoptionMode = "mature-adoption" }) {
  validateExistingTarget(targetRoot);
  const contract = loadDistributionContract(rootDir);
  const outputPath = validateOutputPath(targetRoot, planOutput);
  const bundle = bundlePath(outputPath);
  if (entryExists(outputPath) || entryExists(bundle)) throw new Error(`Adoption plan or bundle already exists: ${outputPath}`);
  ensureDir(path.dirname(outputPath));
  const kitVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
  const kitGit = getKitGitMetadata(rootDir);
  const modelMetadata = {
    id: projectModel.id,
    version: projectModel.version,
    status: projectModel.status,
    contractVersion: projectModel.schemaVersion,
    manifestDigest: projectModelManifestDigest(projectModel),
  };
  const { tempParent, expectedRoot } = createExpectedBootstrap({ initScript, projectModel: modelMetadata, projectName, projectSlug, productName, aiSurface, technologyProfiles });
  try {
    const { files, extras } = classifyFiles(expectedRoot, targetRoot, contract, adoptionMode);
    copyDistributionTree(expectedRoot, snapshotPath(outputPath));
    const plan = {
      schemaVersion: contract.adoptionPlanSchemaVersion,
      operation: "adopt-existing",
      generatedAt: new Date().toISOString(),
      adoptionStatus: "pending",
      kit: { name: "project-bootstrap-kit", version: kitVersion, commit: kitGit.commit, clean: kitGit.clean },
      target: path.resolve(targetRoot),
      bundlePath: bundle,
      options: { projectModel: modelMetadata, projectName, projectSlug, productName, aiSurface, technologyProfiles, snapshotAppliedAt: SYNTHETIC_SNAPSHOT_APPLIED_AT, adoptionMode },
      managedFingerprint: "",
      files,
      extras,
      warnings: kitGit.clean ? [] : ["Plan was created from a dirty kit checkout; complete apply requires a clean matching HEAD."],
    };
    plan.managedFingerprint = planFingerprint(plan, targetRoot);
    fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    printPlan(plan, outputPath, showExtras);
    return { plan, outputPath };
  } finally { fs.rmSync(tempParent, { recursive: true, force: true }); }
}

function validatePlanStructure(plan, planPath, rootDir, allowCompleted = false, allowChangedPath = null) {
  const contract = loadDistributionContract(rootDir);
  if (plan.schemaVersion !== contract.adoptionPlanSchemaVersion || plan.operation !== "adopt-existing") throw new Error(`Unsupported adoption plan schema ${plan.schemaVersion}; recreate with schema ${contract.adoptionPlanSchemaVersion}.`);
  if (!allowCompleted && plan.adoptionStatus !== "pending") throw new Error(`Adoption plan is not pending: ${plan.adoptionStatus}`);
  const targetRoot = path.resolve(plan.target ?? "");
  if (!entryExists(path.join(targetRoot, ".git"))) throw new Error(`Target is not a Git repository: ${targetRoot}`);
  if (path.resolve(plan.bundlePath ?? "") !== path.resolve(bundlePath(planPath))) throw new Error("Plan bundle path does not match the plan path.");
  const snapshot = snapshotPath(planPath);
  if (!entryExists(snapshot) || !fs.statSync(snapshot).isDirectory()) throw new Error(`Plan snapshot is missing: ${snapshot}`);
  const snapshotFiles = walkDistributionFiles(snapshot);
  const planPaths = plan.files.map((entry) => entry.path).sort();
  if (JSON.stringify(planPaths) !== JSON.stringify(snapshotFiles)) throw new Error("Plan does not cover every snapshot file exactly once.");
  const seen = new Set();
  for (const entry of plan.files) {
    if (!entry.path || path.isAbsolute(entry.path) || entry.path.split(path.sep).includes("..") || seen.has(entry.path)) throw new Error(`Invalid plan path: ${entry.path}`);
    seen.add(entry.path);
    if (JSON.stringify(entryInfo(snapshot, entry.path)) !== JSON.stringify(entry.upstream)) throw new Error(`Snapshot evidence changed: ${entry.path}`);
    const current = entryInfo(targetRoot, entry.path);
    const safeApplied = entry.status === "ADD" && current.exists && current.kind === entry.upstream.kind && current.hash === entry.upstream.hash && current.mode === entry.upstream.mode;
    const manualMerged = entry.status === "CONFLICT" && entry.resolution === "manual-merged" && entry.acceptedProjectHash === current.hash;
    if (JSON.stringify(current) !== JSON.stringify(entry.project) && !safeApplied && !manualMerged && entry.path !== allowChangedPath) throw new Error(`Managed target evidence changed: ${entry.path}. Manual merge must proceed one file at a time: edit one file, accept it, then edit the next. Preserve your edits before recreating a stale plan.`);
  }
  const recordedEvidence = plan.files.map((entry) => ({ path: entry.path, current: entry.project })).sort((left, right) => left.path.localeCompare(right.path));
  if (plan.managedFingerprint !== managedFingerprintFromEvidence(recordedEvidence, immutableMetadata(plan))) throw new Error("Plan immutable evidence or recorded fingerprint changed.");
  if (!allowChangedPath && plan.managedFingerprint !== planFingerprint(plan, targetRoot)) throw new Error("Managed target fingerprint changed.");
  const currentKitVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
  const currentKit = getKitGitMetadata(rootDir);
  if (plan.kit.version !== currentKitVersion || plan.kit.commit !== currentKit.commit) throw new Error("Plan kit version/commit does not match the current kit checkout.");
  return { targetRoot, snapshot, contract };
}

function validateMappedReference(targetRoot, entry) {
  const reference = entry.satisfiedBy || entry.supersededBy;
  if (!reference) return;
  if (typeof reference !== "string" || path.isAbsolute(reference) || reference.includes("\\") || reference.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`${entry.path}: mapped reference is invalid`);
  if (!entryExists(path.join(targetRoot, reference))) throw new Error(`${entry.path}: mapped reference does not exist: ${reference}`);
  const realTarget = fs.realpathSync(targetRoot);
  const realReference = fs.realpathSync(path.join(targetRoot, reference));
  if (!realReference.startsWith(`${realTarget}${path.sep}`)) throw new Error(`${entry.path}: mapped reference resolves outside target`);
}

// Decision tables edit mutable fields only. The full plan evidence is checked before
// validation and immediately before the atomic save; target files are never written.
export function setAdoptionDecisions({ rootDir, planPath, decisionsPath, apply = false }) {
  const resolved = path.resolve(planPath);
  if (!fs.lstatSync(resolved).isFile()) throw new Error("Decision editing requires a regular plan file, not a symlink.");
  const original = fs.readFileSync(resolved, "utf8");
  const plan = JSON.parse(original);
  if (plan.operation !== "adopt-existing") throw new Error("Decision tables require operation adopt-existing. For state-upgrade use --accept-path-decision; schema migration has no path decisions.");
  const { targetRoot } = validatePlanStructure(plan, resolved, rootDir);
  const inputPath = path.resolve(decisionsPath);
  if (inputPath === resolved) throw new Error("The decision table must be separate from the plan.");
  const stat = fs.lstatSync(inputPath);
  if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error("Decision table must be a regular JSON file of at most 1 MiB.");
  const table = readJson(inputPath);
  const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  if (!isObject(table) || Object.keys(table).some((key) => !["schemaVersion", "decisions"].includes(key)) || table.schemaVersion !== 1 || !Array.isArray(table.decisions) || table.decisions.length === 0) throw new Error("Expected {schemaVersion: 1, decisions: [explicit path decisions]}.");
  const allowedKeys = new Set(["path", "resolution", "reason", "confirmAdd", "confirmReplace", "satisfiedBy", "supersededBy"]);
  const seen = new Set();
  const changedEntries = [];
  const changes = [];
  for (const row of table.decisions) {
    if (!isObject(row) || Object.keys(row).some((key) => !allowedKeys.has(key))) throw new Error("Decision row contains unsupported fields; hashes, ownership and acceptance evidence cannot be supplied.");
    if (typeof row.path !== "string" || !row.path || row.path.includes("\\") || path.isAbsolute(row.path) || row.path.split("/").some((part) => !part || part === "." || part === "..") || seen.has(row.path)) throw new Error("Invalid or duplicate decision path.");
    seen.add(row.path);
    const entry = plan.files.find((item) => item.path === row.path);
    if (!entry || !["ADD", "CONFLICT"].includes(entry.status)) throw new Error(`${row.path}: path is not a reviewable ADD or CONFLICT`);
    if (entry.resolution === "manual-merged") throw new Error(`${row.path}: accepted manual merge cannot be replaced by a decision table`);
    const values = entry.status === "ADD" ? ["add", "skip"] : ["keep", "replace"];
    if (!values.includes(row.resolution)) throw new Error(`${row.path}: resolution must be ${values.join(" or ")}; manual merge requires the dedicated acceptance CLI`);
    if (("confirmAdd" in row && row.resolution !== "add") || ("confirmReplace" in row && row.resolution !== "replace") || (("satisfiedBy" in row || "supersededBy" in row) && row.resolution !== "skip")) throw new Error(`${row.path}: fields do not match the resolution`);
    if (row.satisfiedBy && row.supersededBy) throw new Error(`${row.path}: choose only one mapped reference`);
    for (const key of ["satisfiedBy", "supersededBy"]) if (key in row && (typeof row[key] !== "string" || !row[key])) throw new Error(`${row.path}: mapped reference must be a nonempty path`);
    if (typeof row.reason !== "string") throw new Error(`${row.path}: reason must be a string`);
    if (row.resolution === "add" && row.confirmAdd !== true) throw new Error(`${row.path}: add requires confirmAdd: true`);
    if (row.resolution === "replace" && row.confirmReplace !== true) throw new Error(`${row.path}: replace requires confirmReplace: true`);
    const reason = validateSingleLineReason(row.reason, row.path);
    changes.push({ path: row.path, from: entry.resolution, to: row.resolution });
    Object.assign(entry, {
      resolution: row.resolution, reason,
      confirmAdd: row.resolution === "add" && row.confirmAdd === true,
      confirmReplace: row.resolution === "replace" && row.confirmReplace === true,
      satisfiedBy: row.satisfiedBy ?? null, supersededBy: row.supersededBy ?? null,
      ownership: row.resolution === "keep" ? "project-owned" : "kit-managed",
      acceptedProjectHash: null, decisionAcceptedAt: null,
    });
    changedEntries.push(entry);
  }
  // Partial tables may leave other paths unresolved; every supplied decision must
  // satisfy the same rules used by complete apply, including engine-managed paths.
  for (const warning of validateDecisions({ ...plan, files: changedEntries }, targetRoot, false)) console.warn(`[WARN] ${warning}`);
  validatePlanStructure(plan, resolved, rootDir);
  if (apply) {
    const tempDir = fs.mkdtempSync(path.join(path.dirname(resolved), ".adoption-decisions-"));
    try {
      const nextPath = path.join(tempDir, "plan.json");
      fs.writeFileSync(nextPath, `${JSON.stringify(plan, null, 2)}\n`, { encoding: "utf8", mode: fs.statSync(resolved).mode & 0o777 });
      if (!fs.lstatSync(resolved).isFile() || fs.readFileSync(resolved, "utf8") !== original) throw new Error("Plan changed during decision editing; no decisions were saved.");
      validatePlanStructure(plan, resolved, rootDir);
      fs.renameSync(nextPath, resolved);
    } finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
  }
  return { applied: apply, changes, unresolved: plan.files.filter((entry) => ["unresolved", "manual-merge"].includes(entry.resolution)).map((entry) => entry.path) };
}

function validateDecisions(plan, targetRoot, safeOnly) {
  const warnings = [];
  for (const entry of plan.files) {
    if (entry.status === "SKIP(SAME)") continue;
    if (entry.status === "ADD") {
      if (entry.engineManaged && entry.path === ADOPTION_RELATIVE_PATH) continue;
      if (entry.resolution === "add") {
        if (entry.confirmAdd !== true) throw new Error(`${entry.path}: add requires confirmAdd: true`);
        entry.ownership ||= "kit-managed";
      } else if (entry.resolution === "skip") {
        if (entry.engineManaged) throw new Error(`${entry.path}: engine-managed path cannot be skipped`);
        entry.reason = validateSingleLineReason(entry.reason, entry.path);
        validateMappedReference(targetRoot, entry);
        entry.ownership = entry.satisfiedBy || entry.supersededBy ? "mapped" : "intentionally-absent";
      } else if (!safeOnly || entry.resolution !== "unresolved") throw new Error(`${entry.path}: ADD is unresolved`);
    } else if (entry.status === "CONFLICT") {
      if (safeOnly) continue;
      if (entry.resolution === "keep") {
        const preservesLegacyAdoption = plan.options.adoptionMode === "legacy-state-migration" && entry.path === ADOPTION_RELATIVE_PATH;
        if (entry.engineManaged && !preservesLegacyAdoption) throw new Error(`${entry.path}: engine-managed path cannot be kept`);
        entry.reason = validateSingleLineReason(entry.reason, entry.path);
        entry.ownership ||= "project-owned";
      } else if (entry.resolution === "replace") {
        if (entry.confirmReplace !== true) throw new Error(`${entry.path}: replace requires confirmReplace: true`);
        if (entry.project.kind === "directory") throw new Error(`${entry.path}: directory conflict requires manual resolution`);
        entry.ownership ||= "kit-managed";
      } else if (entry.resolution === "manual-merged") {
        entry.reason = validateSingleLineReason(entry.reason, entry.path);
        if (!entry.decisionAcceptedAt || entry.acceptedProjectHash !== entryInfo(targetRoot, entry.path).hash) throw new Error(`${entry.path}: use the explicit manual merge acceptance CLI`);
        entry.ownership = "managed-merge";
      } else throw new Error(`${entry.path}: CONFLICT is unresolved`);
    }
    warnings.push(...reasonWarnings(entry.reason, entry.path));
  }
  return warnings;
}

function validateCleanKit(plan, rootDir) {
  const current = getKitGitMetadata(rootDir);
  if (!current.clean) throw new Error("Complete apply requires a clean kit Git checkout.");
  if (current.commit !== plan.kit.commit) throw new Error(`Plan kit commit ${plan.kit.commit} does not match current HEAD ${current.commit}.`);
}

function validateSnapshotAgainstCurrentKit(plan, planPath, rootDir) {
  const { tempParent, expectedRoot } = createExpectedBootstrap({ initScript: path.join(rootDir, "scripts", "init-project.mjs"), ...plan.options });
  try {
    const expectedFiles = walkDistributionFiles(expectedRoot);
    const snapshotFiles = walkDistributionFiles(snapshotPath(planPath));
    if (JSON.stringify(expectedFiles) !== JSON.stringify(snapshotFiles)) throw new Error("Plan snapshot file set does not match current clean kit HEAD.");
    for (const relativePath of expectedFiles) if (JSON.stringify(entryInfo(expectedRoot, relativePath)) !== JSON.stringify(entryInfo(snapshotPath(planPath), relativePath))) throw new Error(`Plan snapshot differs from current clean kit HEAD: ${relativePath}`);
  } finally { fs.rmSync(tempParent, { recursive: true, force: true }); }
}

function backupPath(targetRoot, planPath, relativePath) { return path.join(targetRoot, ".bootstrap-upgrade-diff", "adoption-backup", path.basename(planPath), relativePath); }

function humanTimestamp(value) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/u, "Z");
}

function renderCompletedAdoption(baseContent, plan, completedAt) {
  const linesFor = (predicate, render) => { const entries = plan.files.filter(predicate); return entries.length > 0 ? entries.map(render) : ["  - none"]; };
  const migrationEntry = `  - ${humanTimestamp(completedAt)}: Migrated legacy adopter state to v${plan.kit.version}`;
  const contentWithMigration = plan.options.adoptionMode === "legacy-state-migration"
    ? baseContent.includes("- Upgrade History:\n")
      ? baseContent.replace("- Upgrade History:\n", `- Upgrade History:\n${migrationEntry}\n`)
      : `${baseContent.trimEnd()}\n- Upgrade History:\n${migrationEntry}\n`
    : baseContent;
  return `${contentWithMigration.trimEnd()}\n\n${[
    "- Adoption Mode: mature-existing-project-plan",
    "- Adoption Status: complete",
    `- Adoption Plan Schema: ${plan.schemaVersion}`,
    `- Kit Commit: ${plan.kit.commit}`,
    "- Kept Existing Files:",
    ...linesFor((entry) => entry.resolution === "keep" || entry.resolution === "manual-merged", (entry) => `  - ${entry.path}: ${entry.reason}`),
    "- Replaced Existing Files:", ...linesFor((entry) => entry.resolution === "replace", (entry) => `  - ${entry.path}`),
    "- Added Files:", ...linesFor((entry) => entry.status === "ADD" && entry.resolution === "add" && entry.path !== ADOPTION_RELATIVE_PATH, (entry) => `  - ${entry.path}`),
    "- Skipped Bootstrap Files:",
    ...linesFor((entry) => entry.status === "ADD" && entry.resolution === "skip", (entry) => `  - ${entry.path}: ${entry.reason}${entry.satisfiedBy ? `; satisfiedBy=${entry.satisfiedBy}` : entry.supersededBy ? `; supersededBy=${entry.supersededBy}` : ""}`),
  ].join("\n")}\n`;
}

function replaceSyntheticProfileTimestamps(targetRoot, plan, completedAt) {
  if (plan.options.adoptionMode !== "legacy-state-migration") return;
  const adoptionPath = path.join(targetRoot, "docs", "TECHNOLOGY", "ADOPTION.md");
  if (!entryExists(adoptionPath)) return;
  const content = fs.readFileSync(adoptionPath, "utf8");
  const next = content.replaceAll(`- Added At: ${plan.options.snapshotAppliedAt}`, `- Added At: ${humanTimestamp(completedAt)}`);
  if (next !== content) fs.writeFileSync(adoptionPath, next, "utf8");
}

function featureState(rootDir, mature, projectModelId) {
  const catalog = readJson(path.join(rootDir, "upgrades", "catalog.json"));
  const version = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
  return Object.fromEntries(catalog.features.map((feature) => {
    const applicable = (feature.supportedProjectModels ?? ["development"]).includes(projectModelId);
    return [feature.name, {
    state: applicable ? mature ? "pending-review" : "applied" : "not-applicable",
    acceptedKitVersion: applicable && !mature ? version : null,
    acceptedHandlerVersion: feature.contractVersion ?? 1,
    evidence: applicable ? mature ? [] : ["fresh-init-generated-snapshot"] : [`project-model:${projectModelId}`],
  }];
  }));
}

function createStateAndBaselines({ rootDir, targetRoot, snapshot, plan, mature, completedAt }) {
  const contract = loadDistributionContract(rootDir);
  const counter = { bytes: 0 };
  const now = completedAt || new Date().toISOString();
  const paths = [];
  for (const entry of plan.files) {
    if (entry.path === ADOPTION_RELATIVE_PATH || entry.path === STATE_RELATIVE_PATH) continue;
    const baseline = storeBaselineObject(targetRoot, contract, readEntryBytes(path.join(snapshot, entry.path)), counter);
    const project = entryInfo(targetRoot, entry.path);
    let ownership = entry.ownership;
    if (entry.status === "ADD" && entry.resolution === "skip") ownership = entry.satisfiedBy || entry.supersededBy ? "mapped" : "intentionally-absent";
    paths.push({
      path: entry.path, ownership, acceptedKitVersion: plan.kit.version, acceptedKitCommit: plan.kit.commit,
      acceptedUpstreamHash: baseline.hash, acceptedProjectHash: project.hash, baselineObject: baseline.baselineObject,
      acceptedProjectKind: project.kind, acceptedProjectMode: project.mode,
      resolution: entry.resolution, reason: entry.reason || null, satisfiedBy: entry.satisfiedBy || null,
      supersededBy: entry.supersededBy || null, upstreamKind: entry.upstream.kind, upstreamMode: entry.upstream.mode,
      lastEvaluatedAt: now,
    });
  }
  return writeBootstrapState(targetRoot, {
    schemaVersion: contract.bootstrapStateSchemaVersion,
    kit: { name: "project-bootstrap-kit", version: plan.kit.version, commit: plan.kit.commit },
    project: {
      name: plan.options.projectName,
      slug: plan.options.projectSlug,
      productName: plan.options.productName,
      model: plan.options.projectModel,
      aiSurface: plan.options.aiSurface,
      technologyProfiles: plan.options.technologyProfiles,
      snapshotAppliedAt: mature ? humanTimestamp(now) : plan.options.snapshotAppliedAt,
    },
    paths: paths.sort((a, b) => a.path.localeCompare(b.path)), features: featureState(rootDir, mature, plan.options.projectModel.id),
    history: [{ at: now, operation: mature ? plan.options.adoptionMode === "legacy-state-migration" ? "legacy-state-migration" : "mature-adoption" : "fresh-init", kitVersion: plan.kit.version, kitCommit: plan.kit.commit }],
  });
}

function applyFiles({ targetRoot, snapshot, plan, safeOnly, createBackups, planPath, evidenceSnapshot = snapshot }) {
  for (const entry of plan.files) {
    if (entry.path === ADOPTION_RELATIVE_PATH) continue;
    const source = path.join(snapshot, entry.path);
    const target = path.join(targetRoot, entry.path);
    if (entry.status === "ADD" && entry.resolution === "add" && entry.confirmAdd === true) {
      if (!entryExists(target)) copyEntry(source, target);
      else if (!safeOnly && JSON.stringify(entryInfo(targetRoot, entry.path)) === JSON.stringify(entryInfo(evidenceSnapshot, entry.path))) copyEntry(source, target);
      else if (JSON.stringify(entryInfo(targetRoot, entry.path)) !== JSON.stringify(entry.upstream)) throw new Error(`ADD target changed: ${entry.path}`);
      else if (!safeOnly) copyEntry(source, target);
    } else if (entry.status === "SKIP(SAME)") {
      if (JSON.stringify(entryInfo(targetRoot, entry.path)) !== JSON.stringify(entry.upstream)) throw new Error(`SKIP(SAME) target changed: ${entry.path}`);
      if (!safeOnly && JSON.stringify(entryInfo(snapshot, entry.path)) !== JSON.stringify(entry.upstream)) copyEntry(source, target);
    } else if (!safeOnly && entry.status === "CONFLICT" && entry.resolution === "replace") {
      if (createBackups && entryExists(target)) copyEntry(target, backupPath(targetRoot, planPath, entry.path));
      copyEntry(source, target);
    }
  }
}

function copyTargetForPreflight(sourceRoot, targetRoot) {
  ensureDir(targetRoot);
  const result = spawnSync("git", ["init", "-q", targetRoot], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Could not initialize preflight repository: ${result.stderr.trim()}`);
  copyDistributionTree(sourceRoot, targetRoot);
}

export function acceptAdoptionManualMerge({ rootDir, planPath, relativePath, reason }) {
  const resolved = path.resolve(planPath);
  const plan = readJson(resolved);
  if (plan.operation !== "adopt-existing") throw new Error("--accept-adoption-manual-merge requires operation adopt-existing. For state-upgrade use --accept-path-decision with --decision manual-merged; schema migration has no path decisions.");
  const entry = plan.files.find((candidate) => candidate.path === relativePath);
  if (!entry || entry.status !== "CONFLICT") throw new Error(`Path is not a CONFLICT: ${relativePath}`);
  const { targetRoot } = validatePlanStructure(plan, resolved, rootDir, false, relativePath);
  const current = entryInfo(targetRoot, relativePath);
  if (!current.exists || current.kind === "directory") throw new Error(`${relativePath}: manual merge requires a file or symlink`);
  entry.reason = validateSingleLineReason(reason, relativePath);
  for (const warning of reasonWarnings(entry.reason, relativePath)) console.warn(`[WARN] ${warning}`);
  entry.resolution = "manual-merged";
  entry.ownership = "managed-merge";
  entry.acceptedProjectHash = current.hash;
  entry.decisionAcceptedAt = new Date().toISOString();
  entry.project = current;
  plan.managedFingerprint = planFingerprint(plan, targetRoot);
  fs.writeFileSync(resolved, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

export function applyAdoptionPlan({ rootDir, planPath, safeOnly }) {
  const resolved = path.resolve(planPath);
  const plan = readJson(resolved);
  const { targetRoot, snapshot } = validatePlanStructure(plan, resolved, rootDir);
  const warnings = validateDecisions(plan, targetRoot, safeOnly);
  for (const warning of warnings) console.warn(`[WARN] ${warning}`);
  if (!safeOnly) { validateCleanKit(plan, rootDir); validateSnapshotAgainstCurrentKit(plan, resolved, rootDir); }
  const completedAt = safeOnly ? null : new Date().toISOString();
  const finalized = safeOnly ? null : createExpectedBootstrap({ initScript: path.join(rootDir, "scripts", "init-project.mjs"), ...plan.options, snapshotAppliedAt: humanTimestamp(completedAt) });
  const applySnapshot = finalized?.expectedRoot ?? snapshot;
  try {
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "project-bootstrap-adoption-preflight-"));
    const tempTarget = path.join(tempParent, "target");
    try {
      copyTargetForPreflight(targetRoot, tempTarget);
      applyFiles({ targetRoot: tempTarget, snapshot: applySnapshot, evidenceSnapshot: snapshot, plan, safeOnly, createBackups: false, planPath: resolved });
      if (!safeOnly) {
        const adoption = path.join(tempTarget, ADOPTION_RELATIVE_PATH);
        ensureDir(path.dirname(adoption));
        const baseAdoption = plan.options.adoptionMode === "legacy-state-migration"
          ? fs.readFileSync(path.join(targetRoot, ADOPTION_RELATIVE_PATH), "utf8")
          : fs.readFileSync(path.join(applySnapshot, ADOPTION_RELATIVE_PATH), "utf8");
        fs.writeFileSync(adoption, renderCompletedAdoption(baseAdoption, plan, completedAt), "utf8");
        replaceSyntheticProfileTimestamps(tempTarget, plan, completedAt);
        createStateAndBaselines({ rootDir, targetRoot: tempTarget, snapshot: applySnapshot, plan, mature: true, completedAt });
        verifyExistingAdoption({ rootDir, targetRoot: tempTarget, plan, planPath: resolved, verificationSnapshot: applySnapshot });
      }
    } finally {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
    applyFiles({ targetRoot, snapshot: applySnapshot, evidenceSnapshot: snapshot, plan, safeOnly, createBackups: true, planPath: resolved });
    if (safeOnly) {
      plan.safeAppliedAt = new Date().toISOString();
      for (const entry of plan.files.filter((item) => item.status === "ADD" && item.resolution === "add" && item.confirmAdd === true)) entry.project = entryInfo(targetRoot, entry.path);
      plan.managedFingerprint = planFingerprint(plan, targetRoot);
      fs.writeFileSync(resolved, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
      console.log("Approved ADD paths were applied. Formal adoption remains pending.");
      return { status: "pending", targetRoot };
    }
    const adoption = path.join(targetRoot, ADOPTION_RELATIVE_PATH);
    ensureDir(path.dirname(adoption));
    const baseAdoption = plan.options.adoptionMode === "legacy-state-migration"
      ? fs.readFileSync(adoption, "utf8")
      : fs.readFileSync(path.join(applySnapshot, ADOPTION_RELATIVE_PATH), "utf8");
    fs.writeFileSync(adoption, renderCompletedAdoption(baseAdoption, plan, completedAt), "utf8");
    replaceSyntheticProfileTimestamps(targetRoot, plan, completedAt);
    createStateAndBaselines({ rootDir, targetRoot, snapshot: applySnapshot, plan, mature: true, completedAt });
    verifyExistingAdoption({ rootDir, targetRoot, plan, planPath: resolved, verificationSnapshot: applySnapshot });
    plan.adoptionStatus = "complete";
    plan.completedAt = completedAt;
    fs.writeFileSync(resolved, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    console.log("Mature existing project adoption completed with bootstrap state and baselines.");
    return { status: "complete", targetRoot };
  } finally {
    if (finalized) fs.rmSync(finalized.tempParent, { recursive: true, force: true });
  }
}

export function verifyExistingAdoption({ rootDir, targetRoot, plan, planPath, verificationSnapshot }) {
  const snapshot = verificationSnapshot ?? snapshotPath(planPath);
  for (const entry of plan.files) {
    const current = entryInfo(targetRoot, entry.path);
    const timestampCorrectedProfile = plan.options.adoptionMode === "legacy-state-migration" && entry.path === "docs/TECHNOLOGY/ADOPTION.md";
    if (entry.status === "ADD" && entry.resolution === "add" && !current.exists) throw new Error(`Added path is missing: ${entry.path}`);
    if (entry.status === "ADD" && entry.resolution === "skip" && current.exists) throw new Error(`Skipped path exists: ${entry.path}`);
    if (entry.path !== ADOPTION_RELATIVE_PATH && !timestampCorrectedProfile && entry.status === "CONFLICT" && (entry.resolution === "keep" || entry.resolution === "manual-merged") && current.hash !== (entry.acceptedProjectHash || entry.project.hash)) throw new Error(`Kept or merged path changed: ${entry.path}`);
    if ((entry.resolution === "add" || entry.resolution === "replace") && entry.path !== ADOPTION_RELATIVE_PATH && current.hash !== entryInfo(snapshot, entry.path).hash) throw new Error(`Managed path does not match snapshot: ${entry.path}`);
    if (entry.satisfiedBy || entry.supersededBy) validateMappedReference(targetRoot, entry);
    if ((entry.resolution === "add" || entry.resolution === "replace") && current.kind === "file") {
      try {
        const content = fs.readFileSync(path.join(targetRoot, entry.path), "utf8");
        if (/<PROJECT_NAME>|<PRODUCT_NAME>/u.test(content)) console.warn(`[WARN] Managed path still contains a required replacement placeholder: ${entry.path}`);
      } catch {
        // Binary or unreadable managed files are validated by hash, not text placeholders.
      }
    }
  }
  if (!entryExists(path.join(targetRoot, ADOPTION_RELATIVE_PATH))) throw new Error("Canonical adoption record is missing.");
  for (const required of ["docs/TECHNOLOGY/INDEX.md", "docs/TECHNOLOGY/ADOPTION.md"]) {
    if (!entryExists(path.join(targetRoot, required))) throw new Error(`Technology Profile base file is missing: ${required}`);
  }
  for (const profileId of plan.options.technologyProfiles) {
    const profile = readJson(path.join(rootDir, "profiles", profileId, "profile.json"));
    for (const fileName of ["profile.json", profile.guideline, profile.reference].filter(Boolean)) {
      const required = path.join("docs", "TECHNOLOGY", profileId, fileName === profile.guideline ? "GUIDELINE.md" : fileName === profile.reference ? "REFERENCE.md" : fileName);
      if (!entryExists(path.join(targetRoot, required))) throw new Error(`Selected Technology Profile file is missing: ${required}`);
    }
    const skillRoots = plan.options.aiSurface === "both" ? [".agents/skills", ".claude/skills"] : plan.options.aiSurface === "claude" ? [".claude/skills"] : [".agents/skills"];
    for (const skillName of profile.skills ?? []) for (const skillRoot of skillRoots) {
      const required = path.join(skillRoot, skillName);
      if (!entryExists(path.join(targetRoot, required))) throw new Error(`Selected Technology Profile skill is missing: ${required}`);
    }
  }
  const { state } = readAndValidateBootstrapState(targetRoot, rootDir);
  if (state.kit.commit !== plan.kit.commit) throw new Error("Bootstrap state kit commit does not match adoption plan.");
  return true;
}

export function verifyExistingAdoptionPlan({ rootDir, targetRoot, planPath }) {
  const resolved = path.resolve(planPath);
  const plan = readJson(resolved);
  const contract = loadDistributionContract(rootDir);
  if (plan.schemaVersion !== contract.adoptionPlanSchemaVersion) throw new Error(`Unsupported adoption plan schema: ${plan.schemaVersion}`);
  if (path.resolve(plan.target) !== path.resolve(targetRoot)) throw new Error("Adoption plan target does not match verification target.");
  if (plan.adoptionStatus !== "complete") throw new Error(`Adoption plan is not complete: ${plan.adoptionStatus}`);
  return verifyExistingAdoption({ rootDir, targetRoot: path.resolve(targetRoot), plan, planPath: resolved });
}

export function initializeFreshBootstrapState({ rootDir, targetRoot, projectModel, projectName, projectSlug, productName, aiSurface, technologyProfiles, appliedAt }) {
  const contract = loadDistributionContract(rootDir);
  const kitVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
  const kitGit = getKitGitMetadata(rootDir);
  if (!kitGit.clean) throw new Error("Fresh init state generation requires a clean kit Git checkout.");
  const files = walkDistributionFiles(targetRoot).map((relativePath) => ({
    path: relativePath, status: "SKIP(SAME)", upstream: entryInfo(targetRoot, relativePath), project: entryInfo(targetRoot, relativePath),
    engineManaged: contract.engineManagedPaths.includes(relativePath), resolution: "same", ownership: "kit-managed", reason: "", satisfiedBy: null, supersededBy: null,
  }));
  const modelMetadata = {
    id: projectModel.id,
    version: projectModel.version,
    status: projectModel.status,
    contractVersion: projectModel.schemaVersion,
    manifestDigest: projectModelManifestDigest(projectModel),
  };
  const plan = {
    schemaVersion: contract.adoptionPlanSchemaVersion,
    kit: { name: "project-bootstrap-kit", version: kitVersion, commit: kitGit.commit, clean: true },
    options: { projectModel: modelMetadata, projectName, projectSlug, productName, aiSurface, technologyProfiles, snapshotAppliedAt: appliedAt },
    files,
  };
  createStateAndBaselines({ rootDir, targetRoot, snapshot: targetRoot, plan, mature: false });
}
