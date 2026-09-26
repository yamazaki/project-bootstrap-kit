import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
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
  readAndValidateBootstrapState,
  readEntryBytes,
  reasonWarnings,
  storeBaselineObject,
  timestampForFile,
  validateSingleLineReason,
  walkDistributionFiles,
  writeBootstrapState,
} from "./bootstrap-state-lib.mjs";

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
function defaultPlanPath(targetRoot) { return path.join(targetRoot, ".bootstrap-upgrade-diff", `state-upgrade-plan_${timestampForFile()}.json`); }
function bundlePath(planPath) { return `${planPath}.bundle`; }
function snapshotPath(planPath) { return path.join(bundlePath(planPath), "snapshot"); }

function classify(upstreamChanged, localChanged) {
  if (!upstreamChanged && !localChanged) return "CURRENT";
  if (upstreamChanged && !localChanged) return "UPSTREAM_CHANGED";
  if (!upstreamChanged && localChanged) return "LOCAL_CHANGED";
  return "DIVERGED";
}

function immutableMetadata(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    operation: plan.operation,
    kit: plan.kit,
    target: plan.target,
    options: plan.options,
    bundlePath: plan.bundlePath,
    previousStateDigest: plan.previousStateDigest,
    humanRecordCorrection: plan.humanRecordCorrection ?? null,
    features: plan.features,
    paths: plan.paths.map(({ path: filePath, ownership, U0, U1, L0, L1, state, baselineObject }) => ({ path: filePath, ownership, U0, U1, L0, L1, state, baselineObject })),
  };
}

function humanTimestamp(value) {
  return value.replace("T", " ").replace(/\.\d{3}Z$/u, "Z");
}

function legacyHumanRecordCorrection(targetRoot, state) {
  const snapshotAppliedAt = state.project?.snapshotAppliedAt;
  const migration = [...(state.history ?? [])].reverse().find((entry) => entry.operation === "mature-adoption");
  if (snapshotAppliedAt !== "2000-01-01 00:00:00Z" || !migration?.at) return null;
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  const profilePath = path.join(targetRoot, "docs", "TECHNOLOGY", "ADOPTION.md");
  const adoption = entryExists(adoptionPath) ? fs.readFileSync(adoptionPath, "utf8") : "";
  const profile = entryExists(profilePath) ? fs.readFileSync(profilePath, "utf8") : "";
  if (!adoption.includes(snapshotAppliedAt) && !profile.includes(`- Added At: ${snapshotAppliedAt}`)) return null;
  return {
    kind: "v0.8.2-synthetic-timestamp",
    snapshotAppliedAt,
    correctedAppliedAt: migration.at,
    establishedKitVersion: migration.kitVersion ?? state.kit.version,
    adoptionRecord: adoption.includes(snapshotAppliedAt),
    technologyAdoption: profile.includes(`- Added At: ${snapshotAppliedAt}`),
    adoptionEvidence: entryInfo(targetRoot, "docs/BOOTSTRAP_ADOPTION.md"),
    technologyEvidence: entryInfo(targetRoot, "docs/TECHNOLOGY/ADOPTION.md"),
  };
}

function fingerprint(plan, targetRoot) { return managedFingerprint(targetRoot, plan.paths, immutableMetadata(plan)); }

function writeThreeWayEvidence(targetRoot, snapshot, planPath, item) {
  if (item.state !== "DIVERGED") return null;
  const safeName = Buffer.from(item.path, "utf8").toString("base64url");
  const evidenceRoot = path.join(bundlePath(planPath), "three-way", safeName);
  ensureDir(evidenceRoot);
  const baseline = path.join(targetRoot, item.baselineObject);
  if (entryExists(baseline)) fs.copyFileSync(baseline, path.join(evidenceRoot, "U0.baseline"));
  const upstream = path.join(snapshot, item.path);
  if (entryExists(upstream) && fs.lstatSync(upstream).isFile()) fs.copyFileSync(upstream, path.join(evidenceRoot, "U1.upstream"));
  const local = path.join(targetRoot, item.path);
  if (entryExists(local) && fs.lstatSync(local).isFile()) fs.copyFileSync(local, path.join(evidenceRoot, "L1.local"));
  return path.relative(path.dirname(planPath), evidenceRoot);
}

export function scanStateUpgrade({ rootDir, targetRoot, planOutput }) {
  const { state, contract } = readAndValidateBootstrapState(targetRoot, rootDir);
  const outputPath = path.resolve(planOutput || defaultPlanPath(targetRoot));
  if (entryExists(outputPath) || entryExists(bundlePath(outputPath))) throw new Error(`Upgrade plan or bundle already exists: ${outputPath}`);
  ensureDir(path.dirname(outputPath));
  const kitVersion = fs.readFileSync(path.join(rootDir, "VERSION"), "utf8").trim();
  const kitGit = getKitGitMetadata(rootDir);
  const { tempParent, expectedRoot } = createExpectedBootstrap({
    initScript: path.join(rootDir, "scripts", "init-project.mjs"),
    projectModel: state.project.model,
    projectName: state.project.name,
    projectSlug: state.project.slug,
    productName: state.project.productName,
    aiSurface: state.project.aiSurface,
    technologyProfiles: state.project.technologyProfiles,
    snapshotAppliedAt: state.project.snapshotAppliedAt,
  });
  try {
    copyDistributionTree(expectedRoot, snapshotPath(outputPath));
    const stateByPath = new Map(state.paths.map((item) => [item.path, item]));
    const snapshotFiles = walkDistributionFiles(expectedRoot).filter((relativePath) => !contract.engineManagedPaths.includes(relativePath));
    const allPaths = [...new Set([...stateByPath.keys(), ...snapshotFiles])].sort();
    const paths = allPaths.map((relativePath) => {
      const previous = stateByPath.get(relativePath);
      const upstream = entryInfo(expectedRoot, relativePath);
      const local = entryInfo(targetRoot, relativePath);
      const U0 = previous?.acceptedUpstreamHash ?? null;
      const U1 = upstream.hash;
      const L0 = previous?.acceptedProjectHash ?? null;
      const L1 = local.hash;
      const upstreamChanged = U1 !== U0 || upstream.kind !== previous?.upstreamKind || upstream.mode !== previous?.upstreamMode;
      const localChanged = L1 !== L0 || local.kind !== previous?.acceptedProjectKind || local.mode !== previous?.acceptedProjectMode;
      const pathState = previous ? classify(upstreamChanged, localChanged) : "NEW_UPSTREAM_PATH";
      return {
        path: relativePath,
        ownership: previous?.ownership ?? "kit-managed",
        U0, U1, L0, L1,
        state: pathState,
        baselineObject: previous?.baselineObject ?? null,
        previous: previous ?? null,
        upstream,
        local,
        decision: pathState === "CURRENT" ? "none" : "unresolved",
        reason: "",
        confirmUpdate: false,
        confirmAdd: false,
        decisionAcceptedAt: null,
        acceptedProjectHash: null,
        threeWayEvidence: null,
      };
    });
    const catalog = readJson(path.join(rootDir, "upgrades", "catalog.json"));
    const features = Object.fromEntries(catalog.features.map((feature) => {
      const applicable = (feature.supportedProjectModels ?? ["development"]).includes(state.project.model.id);
      if (!applicable) return [feature.name, {
        state: "not-applicable",
        acceptedKitVersion: null,
        acceptedHandlerVersion: feature.contractVersion,
        evidence: [`project-model:${state.project.model.id}`],
        reason: null,
      }];
      const previous = state.features[feature.name];
      if (!previous) return [feature.name, { state: "pending-review", acceptedKitVersion: null, acceptedHandlerVersion: feature.contractVersion, evidence: ["new-feature-contract"], reason: null }];
      if (previous.acceptedHandlerVersion !== feature.contractVersion) return [feature.name, { ...previous, state: "pending-review", acceptedHandlerVersion: feature.contractVersion, evidence: [...new Set([...(previous.evidence ?? []), "handler-contract-changed"])] }];
      return [feature.name, previous];
    }));
    const plan = {
      schemaVersion: contract.upgradePlanSchemaVersion,
      operation: "state-upgrade",
      generatedAt: new Date().toISOString(),
      kit: { name: "project-bootstrap-kit", version: kitVersion, commit: kitGit.commit, clean: kitGit.clean },
      previousKit: state.kit,
      previousStateDigest: state.integrity.digest,
      target: path.resolve(targetRoot),
      bundlePath: bundlePath(outputPath),
      options: state.project,
      managedFingerprint: "",
      paths,
      features,
      humanRecordCorrection: legacyHumanRecordCorrection(targetRoot, state),
      warnings: kitGit.clean ? [] : ["Plan uses a dirty kit checkout; apply requires a clean matching HEAD."],
    };
    for (const item of plan.paths) item.threeWayEvidence = writeThreeWayEvidence(targetRoot, expectedRoot, outputPath, item);
    plan.managedFingerprint = fingerprint(plan, targetRoot);
    fs.writeFileSync(outputPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
    const counts = new Map();
    for (const item of plan.paths) counts.set(item.state, (counts.get(item.state) ?? 0) + 1);
    console.log("\n========================================\n Bootstrap State Upgrade Scan\n========================================");
    console.log(`Target:       ${targetRoot}\nFrom Kit:     ${state.kit.version}\nTo Kit:       ${kitVersion}\nKit Commit:   ${kitGit.commit}${kitGit.clean ? "" : " (dirty)"}`);
    for (const key of ["CURRENT", "UPSTREAM_CHANGED", "LOCAL_CHANGED", "DIVERGED", "NEW_UPSTREAM_PATH"]) console.log(`${key}: ${counts.get(key) ?? 0}`);
    for (const item of plan.paths.filter((entry) => entry.state !== "CURRENT")) console.log(`[${item.state}] [${item.ownership}] ${item.path}`);
    if (plan.humanRecordCorrection) console.log("[CORRECTION] Replace the v0.8.2 synthetic timestamp in human-readable adoption records.");
    console.log(`Plan file: ${outputPath}`);
    return { plan, outputPath };
  } finally { fs.rmSync(tempParent, { recursive: true, force: true }); }
}

function validatePlan(plan, planPath, rootDir, allowChangedPath = null) {
  const contract = loadDistributionContract(rootDir);
  if (plan.schemaVersion !== contract.upgradePlanSchemaVersion || plan.operation !== "state-upgrade") throw new Error(`Unsupported state upgrade plan schema: ${plan.schemaVersion}`);
  const targetRoot = path.resolve(plan.target);
  const { state } = readAndValidateBootstrapState(targetRoot, rootDir);
  if (path.resolve(plan.bundlePath) !== path.resolve(bundlePath(planPath))) throw new Error("Upgrade plan bundle path mismatch.");
  if (!entryExists(snapshotPath(planPath))) throw new Error("Upgrade snapshot is missing.");
  if (state.integrity.digest !== plan.previousStateDigest) throw new Error("Bootstrap state changed after scan.");
  const snapshotFiles = walkDistributionFiles(snapshotPath(planPath)).filter((relativePath) => !contract.engineManagedPaths.includes(relativePath));
  const planPaths = plan.paths.map((item) => item.path).sort();
  const expectedPaths = [...new Set([...snapshotFiles, ...state.paths.map((item) => item.path)])].sort();
  if (JSON.stringify(expectedPaths) !== JSON.stringify(planPaths)) throw new Error("Upgrade plan does not cover state and current snapshot paths exactly once.");
  const recordedEvidence = plan.paths.map((item) => ({ path: item.path, current: item.local })).sort((left, right) => left.path.localeCompare(right.path));
  if (plan.managedFingerprint !== managedFingerprintFromEvidence(recordedEvidence, immutableMetadata(plan))) throw new Error("Upgrade plan immutable evidence or recorded fingerprint changed.");
  if (!allowChangedPath && plan.managedFingerprint !== fingerprint(plan, targetRoot)) throw new Error("Managed path changed after upgrade scan.");
  if (plan.humanRecordCorrection) {
    if (JSON.stringify(entryInfo(targetRoot, "docs/BOOTSTRAP_ADOPTION.md")) !== JSON.stringify(plan.humanRecordCorrection.adoptionEvidence)) throw new Error("Human-readable adoption record changed after upgrade scan.");
    if (JSON.stringify(entryInfo(targetRoot, "docs/TECHNOLOGY/ADOPTION.md")) !== JSON.stringify(plan.humanRecordCorrection.technologyEvidence)) throw new Error("Technology adoption record changed after upgrade scan.");
  }
  for (const item of plan.paths) {
    const upstream = entryInfo(snapshotPath(planPath), item.path);
    if (upstream.hash !== item.U1 || (item.path !== allowChangedPath && entryInfo(targetRoot, item.path).hash !== item.L1)) {
      const manual = item.decision === "manual-merged" && item.acceptedProjectHash === entryInfo(targetRoot, item.path).hash;
      if (!manual) throw new Error(`Upgrade evidence changed: ${item.path}`);
    }
  }
  return { targetRoot, state, contract };
}

export function acceptUpgradeDecision({ rootDir, planPath, relativePath, decision, reason, confirm = false }) {
  const resolved = path.resolve(planPath);
  const plan = readJson(resolved);
  const { targetRoot, contract } = validatePlan(plan, resolved, rootDir, decision === "manual-merged" ? relativePath : null);
  if (!["manual-merged", "accepted-deviation", "deferred", "safe-update", "add", "skip"].includes(decision)) throw new Error(`Unsupported decision: ${decision}`);
  const item = plan.paths.find((entry) => entry.path === relativePath);
  if (!item || item.state === "CURRENT") throw new Error(`Path is not reviewable: ${relativePath}`);
  item.reason = validateSingleLineReason(reason, relativePath);
  item.decision = decision;
  item.decisionAcceptedAt = new Date().toISOString();
  if (decision === "manual-merged") {
    item.acceptedProjectHash = entryInfo(targetRoot, relativePath).hash;
    item.L1 = item.acceptedProjectHash;
    item.local = entryInfo(targetRoot, relativePath);
    item.ownership = "managed-merge";
  }
  if (decision === "safe-update") item.confirmUpdate = confirm;
  if (decision === "add") item.confirmAdd = confirm;
  if (decision === "skip") item.ownership = "intentionally-absent";
  if (!contract.pathDecisionValues.includes(decision)) throw new Error(`Decision is not in distribution contract: ${decision}`);
  plan.managedFingerprint = fingerprint(plan, targetRoot);
  fs.writeFileSync(resolved, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

function validateDecisions(plan) {
  const warnings = [];
  for (const item of plan.paths.filter((entry) => entry.state !== "CURRENT")) {
    if (item.decision === "unresolved") throw new Error(`${item.path}: upgrade decision is unresolved`);
    if (item.decision === "safe-update" && item.confirmUpdate !== true) throw new Error(`${item.path}: safe-update requires confirmation`);
    if (item.decision === "add" && item.confirmAdd !== true) throw new Error(`${item.path}: add requires confirmation`);
    if (["manual-merged", "accepted-deviation", "deferred", "safe-update", "add", "skip"].includes(item.decision)) {
      item.reason = validateSingleLineReason(item.reason, item.path);
      warnings.push(...reasonWarnings(item.reason, item.path));
    }
    if (item.decision === "safe-update" && (item.ownership !== "kit-managed" || item.state !== "UPSTREAM_CHANGED")) throw new Error(`${item.path}: safe-update is only valid for unchanged local kit-managed paths`);
    if ((item.decision === "safe-update" || item.decision === "add") && !item.U1) throw new Error(`${item.path}: ${item.decision} requires current upstream content`);
    if (item.decision === "accepted-deviation" && item.ownership === "kit-managed") throw new Error(`${item.path}: kit-managed paths must transition ownership or use manual-merged before accepting a deviation`);
    if (item.decision === "manual-merged" && (!item.decisionAcceptedAt || item.acceptedProjectHash !== entryInfo(plan.target, item.path).hash)) throw new Error(`${item.path}: manual merge was not accepted against current local content`);
    const allowedByState = {
      UPSTREAM_CHANGED: ["safe-update", "manual-merged", "accepted-deviation", "deferred"],
      LOCAL_CHANGED: ["manual-merged", "deferred"],
      DIVERGED: ["manual-merged", "accepted-deviation", "deferred"],
      NEW_UPSTREAM_PATH: ["add", "skip", "deferred"],
    };
    if (!allowedByState[item.state]?.includes(item.decision)) throw new Error(`${item.path}: ${item.decision} is not valid for ${item.state}`);
  }
  return warnings;
}

function correctLegacyHumanRecords({ targetRoot, correctedSnapshot, plan, state, contract, counter, now }) {
  const correction = plan.humanRecordCorrection;
  if (!correction) return;
  const displayedAt = humanTimestamp(correction.correctedAppliedAt);
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  if (correction.adoptionRecord && entryExists(adoptionPath)) {
    let content = fs.readFileSync(adoptionPath, "utf8");
    content = content
      .replace(`- Version: ${correction.establishedKitVersion}`, `- State Established With Kit Version: ${correction.establishedKitVersion}`)
      .replace(`- Applied At: ${correction.snapshotAppliedAt}`, `- State Migration Completed At: ${displayedAt}`)
      .replace(`  - ${correction.snapshotAppliedAt}: Initial bootstrap from v${correction.establishedKitVersion}`, `  - ${displayedAt}: Migrated legacy adopter state to v${correction.establishedKitVersion}`)
      .replaceAll(`  - ${correction.snapshotAppliedAt}\n`, `  - ${displayedAt}\n`);
    if (!content.includes("- Original Bootstrap History:")) {
      content = `${content.trimEnd()}\n- Original Bootstrap History: 復元せず、必要な場合はmigration前のGit履歴を参照\n`;
    }
    fs.writeFileSync(adoptionPath, content, "utf8");
  }
  const technologyPath = "docs/TECHNOLOGY/ADOPTION.md";
  const technologyTarget = path.join(targetRoot, technologyPath);
  if (correction.technologyAdoption && entryExists(technologyTarget)) {
    const content = fs.readFileSync(technologyTarget, "utf8");
    fs.writeFileSync(technologyTarget, content.replaceAll(`- Added At: ${correction.snapshotAppliedAt}`, `- Added At: ${displayedAt}`), "utf8");
  }
  state.project.snapshotAppliedAt = displayedAt;
  const item = state.paths.find((entry) => entry.path === technologyPath);
  const source = path.join(correctedSnapshot, technologyPath);
  if (item && entryExists(source)) {
    const baseline = storeBaselineObject(targetRoot, contract, readEntryBytes(source), counter);
    const local = entryInfo(targetRoot, technologyPath);
    Object.assign(item, {
      acceptedKitVersion: plan.kit.version,
      acceptedKitCommit: plan.kit.commit,
      acceptedUpstreamHash: baseline.hash,
      acceptedProjectHash: local.hash,
      acceptedProjectKind: local.kind,
      acceptedProjectMode: local.mode,
      baselineObject: baseline.baselineObject,
      upstreamKind: entryInfo(correctedSnapshot, technologyPath).kind,
      upstreamMode: entryInfo(correctedSnapshot, technologyPath).mode,
      lastEvaluatedAt: now,
    });
  }
  state.history.push({ at: now, operation: "legacy-human-record-correction", correctedAppliedAt: correction.correctedAppliedAt, kitVersion: plan.kit.version, kitCommit: plan.kit.commit });
}

function applyStateDecisions({ targetRoot, snapshot, correctedSnapshot, plan, state, contract, preflight }) {
  const counter = { bytes: 0 };
  const byPath = new Map(state.paths.map((entry) => [entry.path, structuredClone(entry)]));
  const now = new Date().toISOString();
  for (const item of plan.paths) {
    if (item.state === "CURRENT" || item.decision === "deferred") continue;
    const target = path.join(targetRoot, item.path);
    const source = path.join(snapshot, item.path);
    if (item.decision === "safe-update" || item.decision === "add") copyEntry(source, target);
    const local = entryInfo(targetRoot, item.path);
    if (item.decision === "skip" && local.exists) throw new Error(`${item.path}: skipped new path exists`);
    if (item.decision === "manual-merged" && local.hash !== item.acceptedProjectHash) throw new Error(`${item.path}: manual merge content changed`);
    if (["safe-update", "add", "manual-merged", "accepted-deviation", "skip"].includes(item.decision)) {
      const baseline = item.U1 ? storeBaselineObject(targetRoot, contract, readEntryBytes(source), counter) : { hash: null, baselineObject: null };
      const previous = byPath.get(item.path) ?? {};
      byPath.set(item.path, {
        ...previous,
        path: item.path,
        ownership: item.decision === "manual-merged" ? "managed-merge" : item.decision === "skip" ? "intentionally-absent" : item.ownership,
        acceptedKitVersion: plan.kit.version,
        acceptedKitCommit: plan.kit.commit,
        acceptedUpstreamHash: baseline.hash,
        acceptedProjectHash: local.hash,
        acceptedProjectKind: local.kind,
        acceptedProjectMode: local.mode,
        baselineObject: baseline.baselineObject,
        resolution: item.decision,
        reason: item.reason,
        upstreamKind: item.upstream.kind,
        upstreamMode: item.upstream.mode,
        lastEvaluatedAt: now,
      });
    }
  }
  state.paths = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
  correctLegacyHumanRecords({ targetRoot, correctedSnapshot, plan, state, contract, counter, now });
  if (preflight) return;
  state.kit = { name: "project-bootstrap-kit", version: plan.kit.version, commit: plan.kit.commit };
  state.features = structuredClone(plan.features);
  state.history.push({ at: now, operation: "state-upgrade", kitVersion: plan.kit.version, kitCommit: plan.kit.commit, decisions: plan.paths.filter((item) => item.state !== "CURRENT").map((item) => ({ path: item.path, decision: item.decision, reason: item.reason })) });
  const hasDeferred = plan.paths.some((item) => item.state !== "CURRENT" && item.decision === "deferred");
  for (const feature of Object.values(state.features)) {
    if (hasDeferred) feature.state = "pending-review";
    else feature.acceptedKitVersion = plan.kit.version;
  }
  writeBootstrapState(targetRoot, state);
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  if (entryExists(adoptionPath)) {
    const decisions = plan.paths.filter((item) => item.state !== "CURRENT").map((item) => `  - ${item.path}: ${item.decision}${item.reason ? ` - ${item.reason}` : ""}`).join("\n");
    fs.appendFileSync(adoptionPath, `\n## State Upgrade ${now}\n\n- Kit Version: ${plan.kit.version}\n- Kit Commit: ${plan.kit.commit}\n- Decisions:\n${decisions || "  - none"}\n`, "utf8");
  }
}

function copyTarget(sourceRoot, targetRoot) {
  ensureDir(targetRoot);
  const result = spawnSync("git", ["init", "-q", targetRoot], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr.trim());
  copyDistributionTree(sourceRoot, targetRoot);
}

function validateSnapshotAgainstCurrentKit(plan, planPath, rootDir) {
  const { tempParent, expectedRoot } = createExpectedBootstrap({
    initScript: path.join(rootDir, "scripts", "init-project.mjs"),
    projectModel: plan.options.model,
    projectName: plan.options.name,
    projectSlug: plan.options.slug,
    productName: plan.options.productName,
    aiSurface: plan.options.aiSurface,
    technologyProfiles: plan.options.technologyProfiles,
    snapshotAppliedAt: plan.options.snapshotAppliedAt,
  });
  try {
    const contract = loadDistributionContract(rootDir);
    const expectedFiles = walkDistributionFiles(expectedRoot).filter((relativePath) => !contract.engineManagedPaths.includes(relativePath));
    const snapshotFiles = walkDistributionFiles(snapshotPath(planPath)).filter((relativePath) => !contract.engineManagedPaths.includes(relativePath));
    if (JSON.stringify(expectedFiles) !== JSON.stringify(snapshotFiles)) throw new Error("Upgrade snapshot file set differs from current clean kit HEAD.");
    for (const relativePath of expectedFiles) if (JSON.stringify(entryInfo(expectedRoot, relativePath)) !== JSON.stringify(entryInfo(snapshotPath(planPath), relativePath))) throw new Error(`Upgrade snapshot differs from current clean kit HEAD: ${relativePath}`);
  } finally { fs.rmSync(tempParent, { recursive: true, force: true }); }
}

export function applyStateUpgrade({ rootDir, planPath }) {
  const resolved = path.resolve(planPath);
  const plan = readJson(resolved);
  const { targetRoot, state, contract } = validatePlan(plan, resolved, rootDir);
  for (const warning of validateDecisions(plan)) console.warn(`[WARN] ${warning}`);
  const kitGit = getKitGitMetadata(rootDir);
  if (!kitGit.clean || kitGit.commit !== plan.kit.commit) throw new Error("State upgrade apply requires the clean kit HEAD used to create the plan.");
  validateSnapshotAgainstCurrentKit(plan, resolved, rootDir);
  const corrected = plan.humanRecordCorrection ? createExpectedBootstrap({
    initScript: path.join(rootDir, "scripts", "init-project.mjs"),
    projectModel: plan.options.model,
    projectName: plan.options.name,
    projectSlug: plan.options.slug,
    productName: plan.options.productName,
    aiSurface: plan.options.aiSurface,
    technologyProfiles: plan.options.technologyProfiles,
    snapshotAppliedAt: humanTimestamp(plan.humanRecordCorrection.correctedAppliedAt),
  }) : null;
  const correctedSnapshot = corrected?.expectedRoot ?? snapshotPath(resolved);
  try {
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "project-bootstrap-state-upgrade-"));
    try {
      const tempTarget = path.join(tempParent, "target");
      copyTarget(targetRoot, tempTarget);
      applyStateDecisions({ targetRoot: tempTarget, snapshot: snapshotPath(resolved), correctedSnapshot, plan, state: structuredClone(state), contract, preflight: true });
    } finally { fs.rmSync(tempParent, { recursive: true, force: true }); }
    applyStateDecisions({ targetRoot, snapshot: snapshotPath(resolved), correctedSnapshot, plan, state, contract, preflight: false });
    console.log("Bootstrap state upgrade decisions were applied.");
  } finally {
    if (corrected) fs.rmSync(corrected.tempParent, { recursive: true, force: true });
  }
}

const ALLOWED_TRANSITIONS = new Set([
  "intentionally-absent->project-owned", "intentionally-absent->managed-merge", "mapped->mapped",
  "project-owned->managed-merge", "kit-managed->managed-merge", "managed-merge->project-owned",
]);

export function updatePathOwnership({ rootDir, targetRoot, relativePath, ownership, reason, satisfiedBy, supersededBy }) {
  const { state, contract } = readAndValidateBootstrapState(targetRoot, rootDir);
  const item = state.paths.find((entry) => entry.path === relativePath);
  if (!item) throw new Error(`Path is not in bootstrap state: ${relativePath}`);
  const transition = `${item.ownership}->${ownership}`;
  if (!ALLOWED_TRANSITIONS.has(transition)) throw new Error(`Unsupported ownership transition: ${transition}`);
  const nextReason = validateSingleLineReason(reason, relativePath);
  const current = entryInfo(targetRoot, relativePath);
  if (["project-owned", "managed-merge"].includes(ownership) && !current.exists) throw new Error(`${relativePath}: target path must exist for ${ownership}`);
  const mappedReference = satisfiedBy || supersededBy;
  if (ownership === "mapped") {
    if (!mappedReference || path.isAbsolute(mappedReference) || mappedReference.split(path.sep).includes("..") || !entryExists(path.join(targetRoot, mappedReference))) throw new Error(`${relativePath}: mapped ownership requires an existing relative reference`);
  }
  const previous = item.ownership;
  item.ownership = ownership;
  item.reason = nextReason;
  for (const warning of reasonWarnings(nextReason, relativePath)) console.warn(`[WARN] ${warning}`);
  item.satisfiedBy = satisfiedBy || null;
  item.supersededBy = supersededBy || null;
  item.acceptedProjectHash = current.hash;
  item.acceptedProjectKind = current.kind;
  item.acceptedProjectMode = current.mode;
  item.lastEvaluatedAt = new Date().toISOString();
  state.history.push({ at: item.lastEvaluatedAt, operation: "ownership-transition", path: relativePath, from: previous, to: ownership, reason: nextReason, projectHash: current.hash, upstreamHash: item.acceptedUpstreamHash });
  writeBootstrapState(targetRoot, state);
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  if (entryExists(adoptionPath)) fs.appendFileSync(adoptionPath, `\n## Ownership Transition ${item.lastEvaluatedAt}\n\n- Path: ${relativePath}\n- From: ${previous}\n- To: ${ownership}\n- Reason: ${nextReason}\n`, "utf8");
  return { state, contract };
}

export function updateFeatureState({ rootDir, targetRoot, featureName, featureState, reason, evidence = [] }) {
  const { state, contract } = readAndValidateBootstrapState(targetRoot, rootDir);
  if (!contract.featureStateValues.includes(featureState)) throw new Error(`Unsupported feature state: ${featureState}`);
  if (!state.features[featureName]) throw new Error(`Feature is not in bootstrap state: ${featureName}`);
  const nextReason = validateSingleLineReason(reason, featureName);
  for (const warning of reasonWarnings(nextReason, featureName)) console.warn(`[WARN] ${warning}`);
  const catalog = readJson(path.join(rootDir, "upgrades", "catalog.json"));
  const catalogFeature = catalog.features.find((item) => item.name === featureName);
  const at = new Date().toISOString();
  const previous = state.features[featureName].state;
  state.features[featureName] = {
    state: featureState,
    acceptedKitVersion: ["applied", "accepted-deviation"].includes(featureState) ? state.kit.version : state.features[featureName].acceptedKitVersion,
    acceptedHandlerVersion: catalogFeature?.contractVersion ?? state.features[featureName].acceptedHandlerVersion,
    evidence: [...new Set(evidence.filter(Boolean))],
    reason: nextReason,
    lastEvaluatedAt: at,
  };
  state.history.push({ at, operation: "feature-state-transition", feature: featureName, from: previous, to: featureState, reason: nextReason, evidence: state.features[featureName].evidence });
  writeBootstrapState(targetRoot, state);
  return state.features[featureName];
}
