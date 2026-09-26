import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

export const STATE_RELATIVE_PATH = "docs/BOOTSTRAP_STATE.json";
export const ADOPTION_RELATIVE_PATH = "docs/BOOTSTRAP_ADOPTION.md";
const INTERNAL_IGNORED_NAMES = new Set([".git", "node_modules", ".bootstrap-upgrade-diff"]);

export function loadDistributionContract(rootDir) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "upgrades", "distribution-contract.json"), "utf8"));
}

export function entryExists(filePath) {
  try {
    fs.lstatSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function shouldIgnore(relativePath) {
  const parts = relativePath.split(path.sep);
  if (parts.some((part) => INTERNAL_IGNORED_NAMES.has(part))) return true;
  return parts[0] === ".project-bootstrap" && parts[1] === "baselines";
}

export function walkDistributionFiles(rootDir, relativePath = "") {
  const result = [];
  for (const entry of fs.readdirSync(path.join(rootDir, relativePath), { withFileTypes: true })) {
    const childRelativePath = path.join(relativePath, entry.name);
    if (shouldIgnore(childRelativePath) || childRelativePath === STATE_RELATIVE_PATH) continue;
    const childPath = path.join(rootDir, childRelativePath);
    if (entry.isDirectory()) {
      result.push(...walkDistributionFiles(rootDir, childRelativePath));
    } else if (entry.isFile() || entry.isSymbolicLink()) {
      result.push(childRelativePath);
    }
  }
  return result.sort();
}

export function sha256Buffer(buffer) {
  return `sha256:${crypto.createHash("sha256").update(buffer).digest("hex")}`;
}

export function readEntryBytes(filePath) {
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) return Buffer.from(`symlink:${fs.readlinkSync(filePath)}`, "utf8");
  if (!stat.isFile()) throw new Error(`Managed path is not a file or symlink: ${filePath}`);
  return fs.readFileSync(filePath);
}

export function entryInfo(rootDir, relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  if (!entryExists(fullPath)) return { exists: false, kind: "absent", hash: null, mode: null, size: 0 };
  const stat = fs.lstatSync(fullPath);
  if (stat.isDirectory()) return { exists: true, kind: "directory", hash: null, mode: stat.mode & 0o777, size: 0 };
  const bytes = readEntryBytes(fullPath);
  return {
    exists: true,
    kind: stat.isSymbolicLink() ? "symlink" : "file",
    hash: sha256Buffer(bytes),
    mode: stat.mode & 0o777,
    size: bytes.length,
  };
}

export function copyEntry(sourcePath, targetPath) {
  ensureDir(path.dirname(targetPath));
  const stat = fs.lstatSync(sourcePath);
  if (entryExists(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true });
  if (stat.isSymbolicLink()) {
    fs.symlinkSync(fs.readlinkSync(sourcePath), targetPath);
  } else {
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, stat.mode & 0o777);
  }
}

export function copyDistributionTree(sourceRoot, targetRoot) {
  for (const relativePath of walkDistributionFiles(sourceRoot)) {
    copyEntry(path.join(sourceRoot, relativePath), path.join(targetRoot, relativePath));
  }
}

export function timestampForFile() {
  return new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").replace(/\.\d{3}Z$/u, "Z");
}

function initArgs({ initScript, targetRoot, projectModel, projectName, projectSlug, productName, aiSurface, technologyProfiles, snapshotAppliedAt }) {
  const args = [
    initScript,
    "--target", targetRoot,
    "--project-model", projectModel.id,
    "--project-name", projectName,
    "--project-slug", projectSlug,
    "--ai-surface", aiSurface,
    "--internal-snapshot",
    "--internal-applied-at", snapshotAppliedAt || "2000-01-01 00:00:00Z",
  ];
  if (productName) args.push("--product-name", productName);
  for (const profile of technologyProfiles) args.push("--technology-profile", profile);
  return args;
}

export function createExpectedBootstrap({ initScript, projectModel, projectName, projectSlug, productName, aiSurface, technologyProfiles, snapshotAppliedAt }) {
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "project-bootstrap-expected-"));
  const expectedRoot = path.join(tempParent, "expected");
  ensureDir(expectedRoot);
  const gitResult = spawnSync("git", ["init", "-q", expectedRoot], { encoding: "utf8" });
  if (gitResult.status !== 0) {
    fs.rmSync(tempParent, { recursive: true, force: true });
    throw new Error(`Could not initialize expected repository: ${(gitResult.stderr || gitResult.stdout).trim()}`);
  }
  const initResult = spawnSync(process.execPath, initArgs({
    initScript,
    targetRoot: expectedRoot,
    projectModel,
    projectName,
    projectSlug,
    productName,
    aiSurface,
    technologyProfiles,
    snapshotAppliedAt,
  }), { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  if (initResult.status !== 0) {
    fs.rmSync(tempParent, { recursive: true, force: true });
    throw new Error(`Could not generate expected bootstrap: ${(initResult.stderr || initResult.stdout).trim()}`);
  }
  return { tempParent, expectedRoot };
}

function git(rootDir, args) {
  const result = spawnSync("git", ["-C", rootDir, ...args], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Git metadata check failed: ${(result.stderr || result.stdout).trim()}`);
  return result.stdout.trim();
}

export function getKitGitMetadata(rootDir) {
  const commit = git(rootDir, ["rev-parse", "HEAD"]);
  const status = git(rootDir, ["status", "--porcelain", "--untracked-files=all"]);
  return { commit, clean: status.length === 0, status };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const result = {};
    for (const key of Object.keys(value).sort()) result[key] = canonicalize(value[key]);
    return result;
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function stateDigest(state) {
  const payload = structuredClone(state);
  delete payload.integrity;
  return sha256Buffer(Buffer.from(canonicalJson(payload), "utf8"));
}

export function writeBootstrapState(targetRoot, state) {
  const next = structuredClone(state);
  next.integrity = { algorithm: "sha256", canonicalization: "sorted-json-v1", digest: "" };
  next.integrity.digest = stateDigest(next);
  const statePath = path.join(targetRoot, STATE_RELATIVE_PATH);
  ensureDir(path.dirname(statePath));
  fs.writeFileSync(statePath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function safeBaselinePath(targetRoot, contract, hash) {
  if (!/^sha256:[a-f0-9]{64}$/u.test(hash)) throw new Error(`Invalid baseline hash: ${hash}`);
  const fileName = hash.slice("sha256:".length);
  const root = path.resolve(targetRoot, contract.baseline.root);
  const result = path.resolve(root, fileName);
  if (path.dirname(result) !== root) throw new Error(`Invalid baseline object path: ${result}`);
  return result;
}

export function storeBaselineObject(targetRoot, contract, bytes, operationCounter) {
  if (bytes.length > contract.baseline.objectMaxBytes) {
    throw new Error(`Baseline object exceeds ${contract.baseline.objectMaxBytes} bytes`);
  }
  const hash = sha256Buffer(bytes);
  const objectPath = safeBaselinePath(targetRoot, contract, hash);
  if (entryExists(objectPath)) {
    if (sha256Buffer(fs.readFileSync(objectPath)) !== hash) throw new Error(`Baseline object hash mismatch: ${objectPath}`);
  } else {
    operationCounter.bytes += bytes.length;
    if (operationCounter.bytes > contract.baseline.operationMaxBytes) {
      throw new Error(`Baseline operation exceeds ${contract.baseline.operationMaxBytes} bytes`);
    }
    ensureDir(path.dirname(objectPath));
    fs.writeFileSync(objectPath, bytes);
  }
  return { hash, baselineObject: path.relative(targetRoot, objectPath) };
}

export function readAndValidateBootstrapState(targetRoot, rootDir) {
  const contract = loadDistributionContract(rootDir);
  const statePath = path.join(targetRoot, STATE_RELATIVE_PATH);
  if (!entryExists(statePath)) throw new Error(`Bootstrap state is missing: ${statePath}`);
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (state.schemaVersion !== contract.bootstrapStateSchemaVersion) {
    throw new Error(`Unsupported bootstrap state schema ${state.schemaVersion}; expected ${contract.bootstrapStateSchemaVersion}`);
  }
  if (state.integrity?.digest !== stateDigest(state)) throw new Error("Bootstrap state integrity digest does not match.");
  if (typeof state.project?.name !== "string" || !state.project.name.trim()) throw new Error("Bootstrap state project.name is missing.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(state.project?.slug ?? "")) throw new Error("Bootstrap state project.slug is invalid.");
  const model = state.project?.model;
  if (!model || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(model.id ?? "")) throw new Error("Bootstrap state Project Model id is invalid.");
  if (!/^\d+\.\d+\.\d+$/u.test(model.version ?? "")) throw new Error("Bootstrap state Project Model version is invalid.");
  if (!["stable", "preview", "deprecated"].includes(model.status)) throw new Error("Bootstrap state Project Model status is invalid.");
  if (!Number.isInteger(model.contractVersion) || model.contractVersion < 1) throw new Error("Bootstrap state Project Model contractVersion is invalid.");
  if (!/^sha256:[a-f0-9]{64}$/u.test(model.manifestDigest ?? "")) throw new Error("Bootstrap state Project Model manifestDigest is invalid.");
  if (model.id === "development" && (typeof state.project.productName !== "string" || !state.project.productName.trim())) {
    throw new Error("Bootstrap state development productName is missing.");
  }
  if (model.id !== "development" && state.project.productName !== null) {
    throw new Error(`Bootstrap state ${model.id} productName must be null.`);
  }
  const seen = new Set();
  for (const item of state.paths ?? []) {
    if (!item.path || path.isAbsolute(item.path) || item.path.split(path.sep).includes("..") || seen.has(item.path)) {
      throw new Error(`Invalid or duplicate bootstrap state path: ${item.path}`);
    }
    seen.add(item.path);
    if (!contract.ownershipValues.includes(item.ownership)) throw new Error(`Invalid ownership for ${item.path}`);
    if (item.baselineObject) {
      const expectedPath = safeBaselinePath(targetRoot, contract, item.acceptedUpstreamHash);
      if (path.resolve(targetRoot, item.baselineObject) !== expectedPath) throw new Error(`Invalid baseline reference for ${item.path}`);
      if (!entryExists(expectedPath)) throw new Error(`Baseline object is missing for ${item.path}`);
      if (sha256Buffer(fs.readFileSync(expectedPath)) !== item.acceptedUpstreamHash) {
        throw new Error(`Baseline object hash mismatch for ${item.path}`);
      }
    }
  }
  for (const [featureName, feature] of Object.entries(state.features ?? {})) {
    if (!contract.featureStateValues.includes(feature.state)) throw new Error(`Invalid feature state for ${featureName}: ${feature.state}`);
    if (!Number.isInteger(feature.acceptedHandlerVersion) || feature.acceptedHandlerVersion < 1) throw new Error(`Invalid handler contract version for ${featureName}`);
  }
  return { state, contract };
}

export function managedEvidence(targetRoot, entries) {
  return entries
    .map((entry) => ({ path: entry.path, current: entryInfo(targetRoot, entry.path) }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function managedFingerprint(targetRoot, entries, immutableMetadata = {}) {
  return managedFingerprintFromEvidence(managedEvidence(targetRoot, entries), immutableMetadata);
}

export function managedFingerprintFromEvidence(evidence, immutableMetadata = {}) {
  return sha256Buffer(Buffer.from(canonicalJson({ paths: evidence, metadata: immutableMetadata }), "utf8"));
}

export function validateSingleLineReason(reason, label) {
  const value = String(reason ?? "").trim();
  if (!value) throw new Error(`${label} requires a non-empty reason`);
  if (/\r|\n/u.test(value)) throw new Error(`${label} reason must be a single line`);
  return value;
}

export function reasonWarnings(reason, label) {
  const value = String(reason ?? "");
  const patterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /(?:api[_-]?key|token|password|secret)\s*[:=]\s*[^\s]+/iu,
    /\bgh[pousr]_[A-Za-z0-9]{20,}\b/u,
    /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/u,
  ];
  return patterns.some((pattern) => pattern.test(value))
    ? [`${label} may contain a credential or Secret; review before apply`]
    : [];
}
