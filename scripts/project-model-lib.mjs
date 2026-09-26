import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const MODEL_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/u;
const ALLOWED_STATUSES = new Set(["stable", "preview", "deprecated"]);
const ALLOWED_AI_SURFACES = new Set(["codex", "claude", "both", "rovo"]);
const ALLOWED_KINDS = new Set(["direct", "rename", "conditional", "skill"]);
const ALLOWED_OWNERSHIP = new Set(["kit-managed", "managed-merge", "project-owned"]);
const ALLOWED_PROFILE_POLICIES = new Set(["supported", "none"]);

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error.message}`);
  }
}

function validateRelativePath(value, label) {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\")) {
    throw new Error(`${label} must be a relative POSIX path`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${label} contains an invalid path segment: ${value}`);
  }
  return value;
}

function walkFiles(rootDir) {
  if (!fs.existsSync(rootDir)) return [];
  const result = [];
  function walk(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(filePath, relativePath);
      else if (entry.isFile()) result.push(relativePath);
      else throw new Error(`Project Model source contains unsupported asset: ${filePath}`);
    }
  }
  walk(rootDir, "");
  return result;
}

function validateStringArray(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  const result = values.map((value, index) => validateRelativePath(value, `${label}[${index}]`));
  if (new Set(result).size !== result.length) throw new Error(`${label} contains duplicate paths`);
  return result;
}

function validateModelMetadata(model, expectedId) {
  if (model.schemaVersion !== 1) throw new Error(`Project Model ${expectedId} has unsupported schemaVersion`);
  if (model.id !== expectedId) throw new Error(`Project Model id mismatch: expected=${expectedId}, actual=${model.id}`);
  if (!MODEL_ID_PATTERN.test(model.id)) throw new Error(`Project Model has invalid id: ${model.id}`);
  if (typeof model.name !== "string" || !model.name.trim()) throw new Error(`Project Model ${model.id} is missing name`);
  if (!SEMVER_PATTERN.test(model.version ?? "")) throw new Error(`Project Model ${model.id} has invalid version`);
  if (!ALLOWED_STATUSES.has(model.status)) throw new Error(`Project Model ${model.id} has invalid status`);
  if (!ALLOWED_PROFILE_POLICIES.has(model.technologyProfilePolicy)) throw new Error(`Project Model ${model.id} has invalid technologyProfilePolicy`);
  if (!ALLOWED_OWNERSHIP.has(model.defaultOwnership)) throw new Error(`Project Model ${model.id} has invalid defaultOwnership`);
  if (!Array.isArray(model.aiSurfaces) || model.aiSurfaces.length === 0) throw new Error(`Project Model ${model.id} must declare aiSurfaces`);
  for (const aiSurface of model.aiSurfaces) {
    if (!ALLOWED_AI_SURFACES.has(aiSurface)) throw new Error(`Project Model ${model.id} has invalid AI surface: ${aiSurface}`);
  }
  if (new Set(model.aiSurfaces).size !== model.aiSurfaces.length) throw new Error(`Project Model ${model.id} has duplicate AI surfaces`);
}

function resolvedAsset(model, sourceRelativePath) {
  const mapping = model.mappings?.[sourceRelativePath] ?? {};
  if (typeof mapping !== "object" || Array.isArray(mapping)) {
    throw new Error(`Project Model ${model.id} has invalid mapping for ${sourceRelativePath}`);
  }
  const underSkillRoot = model.skillRoot && (sourceRelativePath === model.skillRoot || sourceRelativePath.startsWith(`${model.skillRoot}/`));
  const kind = mapping.kind ?? (underSkillRoot ? "skill" : "direct");
  const target = mapping.target ?? sourceRelativePath;
  if (!ALLOWED_KINDS.has(kind)) throw new Error(`Project Model ${model.id} has invalid asset kind for ${sourceRelativePath}: ${kind}`);
  validateRelativePath(target, `Project Model ${model.id} target`);
  if (kind === "conditional" && !mapping.condition) throw new Error(`Project Model ${model.id} conditional asset is missing condition: ${sourceRelativePath}`);
  return {
    source: path.posix.join(model.sourceRoot, sourceRelativePath),
    sourceRelativePath,
    target,
    kind,
    condition: mapping.condition ?? null,
    ownership: model.defaultOwnership,
  };
}

function resolvedSharedAsset(model, entry, index) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error(`Project Model ${model.id} sharedAssets[${index}] must be an object`);
  const source = validateRelativePath(entry.source, `Project Model ${model.id} sharedAssets[${index}].source`);
  const target = validateRelativePath(entry.target, `Project Model ${model.id} sharedAssets[${index}].target`);
  const kind = entry.kind ?? "direct";
  if (!ALLOWED_KINDS.has(kind)) throw new Error(`Project Model ${model.id} has invalid shared asset kind: ${kind}`);
  if (kind === "conditional" && !entry.condition) throw new Error(`Project Model ${model.id} conditional shared asset is missing condition: ${source}`);
  return { source, sourceRelativePath: null, target, kind, condition: entry.condition ?? null, ownership: model.defaultOwnership };
}

export function loadProjectModelCatalog(rootDir) {
  const modelsDir = path.join(rootDir, "models");
  const catalogPath = path.join(modelsDir, "catalog.json");
  if (!fs.existsSync(catalogPath)) throw new Error("Project Model catalog is missing: models/catalog.json");
  const catalog = readJson(catalogPath, "Project Model catalog");
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.models) || catalog.models.length === 0) {
    throw new Error("Project Model catalog has invalid schema");
  }
  const ids = catalog.models.map((entry) => entry.id);
  if (new Set(ids).size !== ids.length) throw new Error("Project Model catalog contains duplicate ids");
  const defaults = catalog.models.filter((entry) => entry.default === true);
  if (defaults.length !== 1) throw new Error("Project Model catalog must contain exactly one default model");

  const models = catalog.models.map((entry) => {
    if (!MODEL_ID_PATTERN.test(entry.id ?? "")) throw new Error(`Project Model catalog has invalid id: ${entry.id}`);
    if (!SEMVER_PATTERN.test(entry.version ?? "")) throw new Error(`Project Model catalog has invalid version for ${entry.id}`);
    if (!ALLOWED_STATUSES.has(entry.status)) throw new Error(`Project Model catalog has invalid status for ${entry.id}`);
    const manifest = validateRelativePath(entry.manifest, `Project Model ${entry.id} manifest`);
    const manifestPath = path.join(modelsDir, manifest);
    if (!fs.existsSync(manifestPath)) throw new Error(`Project Model manifest is missing: ${manifest}`);
    const model = readJson(manifestPath, `Project Model ${entry.id}`);
    validateModelMetadata(model, entry.id);
    if (model.version !== entry.version || model.status !== entry.status || model.name !== entry.name) {
      throw new Error(`Project Model catalog metadata does not match manifest: ${entry.id}`);
    }
    return validateProjectModel(rootDir, model);
  });

  return { schemaVersion: catalog.schemaVersion, defaultModelId: defaults[0].id, models };
}

export function validateProjectModel(rootDir, model) {
  validateModelMetadata(model, model.id);
  const sourceRoot = validateRelativePath(model.sourceRoot, `Project Model ${model.id} sourceRoot`);
  const assets = validateStringArray(model.assets, `Project Model ${model.id} assets`);
  const sharedAssets = (model.sharedAssets ?? []).map((entry, index) => resolvedSharedAsset(model, entry, index));
  const requiredPaths = validateStringArray(model.requiredPaths ?? [], `Project Model ${model.id} requiredPaths`);
  const optionalPaths = validateStringArray(model.optionalPaths ?? [], `Project Model ${model.id} optionalPaths`);
  const overlap = requiredPaths.filter((item) => optionalPaths.includes(item));
  if (overlap.length > 0) throw new Error(`Project Model ${model.id} path is both required and optional: ${overlap[0]}`);

  const mappings = model.mappings ?? {};
  for (const mappingSource of Object.keys(mappings)) {
    validateRelativePath(mappingSource, `Project Model ${model.id} mapping source`);
    if (!assets.includes(mappingSource)) throw new Error(`Project Model ${model.id} mapping source is not an asset: ${mappingSource}`);
  }

  const resolvedAssets = [...assets.map((asset) => resolvedAsset({ ...model, sourceRoot }, asset)), ...sharedAssets];
  const targets = resolvedAssets.map((asset) => asset.target.normalize("NFC").toLowerCase());
  if (new Set(targets).size !== targets.length) throw new Error(`Project Model ${model.id} contains duplicate target paths`);
  const resolvedTargetSet = new Set(resolvedAssets.map((asset) => asset.target));
  for (const requiredPath of requiredPaths) {
    if (!resolvedTargetSet.has(requiredPath)) throw new Error(`Project Model ${model.id} required path is not generated: ${requiredPath}`);
  }
  for (const optionalPath of optionalPaths) {
    if (!resolvedTargetSet.has(optionalPath)) throw new Error(`Project Model ${model.id} optional path is not generated: ${optionalPath}`);
  }

  for (const asset of resolvedAssets) {
    const sourcePath = path.join(rootDir, asset.source);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`Project Model ${model.id} source file is missing: ${asset.source}`);
    }
  }

  if (model.requireExactCoverage) {
    const actualFiles = walkFiles(path.join(rootDir, sourceRoot));
    const unlisted = actualFiles.filter((item) => !assets.includes(item));
    const missing = assets.filter((item) => !actualFiles.includes(item));
    if (unlisted.length > 0 || missing.length > 0) {
      throw new Error(`Project Model ${model.id} source coverage mismatch: unlisted=${unlisted.join(",") || "none"}; missing=${missing.join(",") || "none"}`);
    }
  }

  return { ...model, sourceRoot, assets: resolvedAssets, requiredPaths, optionalPaths };
}

export function resolveProjectModel(catalog, requestedId = "") {
  const modelId = requestedId || catalog.defaultModelId;
  const model = catalog.models.find((entry) => entry.id === modelId);
  if (!model) throw new Error(`Unknown project model: ${modelId}`);
  if (model.status === "deprecated") throw new Error(`Project Model is deprecated: ${modelId}`);
  return model;
}

export function projectModelManifestDigest(model) {
  const payload = {
    schemaVersion: model.schemaVersion,
    id: model.id,
    version: model.version,
    status: model.status,
    technologyProfilePolicy: model.technologyProfilePolicy,
    aiSurfaces: model.aiSurfaces,
    assets: model.assets.map(({ source, target, kind, condition, ownership }) => ({
      source, target, kind, condition, ownership,
    })),
    requiredPaths: model.requiredPaths,
    optionalPaths: model.optionalPaths,
  };
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

export function listProjectModelIds(catalog) {
  return catalog.models.map((model) => model.id).sort();
}

function skillTargetRoots(aiSurface) {
  if (aiSurface === "codex" || aiSurface === "rovo") return [".agents/skills"];
  if (aiSurface === "claude") return [".claude/skills"];
  if (aiSurface === "both") return [".agents/skills", ".claude/skills"];
  throw new Error(`Unsupported AI surface: ${aiSurface}`);
}

function conditionMatches(condition, aiSurface) {
  if (!condition) return true;
  if (condition === "claude") return aiSurface === "claude" || aiSurface === "both";
  throw new Error(`Unsupported Project Model asset condition: ${condition}`);
}

export function resolveProjectModelOutput(model, aiSurface) {
  if (!model.aiSurfaces.includes(aiSurface)) throw new Error(`Project Model ${model.id} does not support AI surface: ${aiSurface}`);
  const result = [];
  for (const asset of model.assets) {
    if (!conditionMatches(asset.condition, aiSurface)) continue;
    if (asset.kind === "skill") {
      const skillPrefix = `${model.skillRoot}/`;
      if (!asset.target.startsWith(skillPrefix)) throw new Error(`Project Model ${model.id} skill target is outside skillRoot: ${asset.target}`);
      const skillRelativePath = asset.target.slice(skillPrefix.length);
      for (const skillRoot of skillTargetRoots(aiSurface)) {
        result.push({ ...asset, target: path.posix.join(skillRoot, skillRelativePath) });
      }
    } else {
      result.push(asset);
    }
  }
  const targets = result.map((asset) => asset.target.normalize("NFC").toLowerCase());
  if (new Set(targets).size !== targets.length) throw new Error(`Project Model ${model.id} output contains duplicate targets for ${aiSurface}`);
  return result.sort((left, right) => left.target.localeCompare(right.target));
}

export function materializeProjectModel({ rootDir, targetRoot, model, aiSurface }) {
  const output = resolveProjectModelOutput(model, aiSurface);
  for (const asset of output) {
    const sourcePath = path.join(rootDir, asset.source);
    const targetPath = path.join(targetRoot, asset.target);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, fs.statSync(sourcePath).mode & 0o777);
  }
  return output;
}
