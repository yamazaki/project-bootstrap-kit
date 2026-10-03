#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { listProjectModelIds, loadProjectModelCatalog, resolveProjectModel } from "./project-model-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`[OK] ${message}`);
}

function assertThrows(fn, pattern, message) {
  try {
    fn();
  } catch (error) {
    assert(pattern.test(error.message), message);
    return;
  }
  throw new Error(`${message}: expected error`);
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const catalog = loadProjectModelCatalog(rootDir);
assert(catalog.defaultModelId === "development", "development is the default Project Model");
assert(JSON.stringify(listProjectModelIds(catalog)) === JSON.stringify(["development", "task-workspace"]), "catalog lists both Project Models");
assert(resolveProjectModel(catalog).id === "development", "empty selection resolves to development");
assert(resolveProjectModel(catalog, "task-workspace").status === "preview", "task-workspace resolves as preview");
assertThrows(() => resolveProjectModel(catalog, "unknown"), /Unknown project model/u, "unknown Project Model is rejected");

const development = resolveProjectModel(catalog, "development");
assert(development.assets.length === 57, "development manifest covers 57 boilerplate files");
assert(development.assets.find((entry) => entry.sourceRelativePath === "_AGENTS.md")?.target === "AGENTS.md", "AGENTS mapping is explicit");
assert(development.assets.find((entry) => entry.sourceRelativePath === "_CLAUDE.md")?.condition === "claude", "CLAUDE mapping is conditional");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "project-model-lib-"));
try {
  fs.mkdirSync(path.join(tempRoot, "models", "development"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "boilerplate"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "boilerplate", "one.md"), "one\n", "utf8");

  const baseModel = {
    schemaVersion: 1,
    id: "development",
    name: "Development",
    version: "1.0.0",
    status: "stable",
    sourceRoot: "boilerplate",
    requireExactCoverage: true,
    defaultOwnership: "kit-managed",
    technologyProfilePolicy: "supported",
    aiSurfaces: ["codex"],
    skillRoot: "skills",
    assets: ["one.md"],
    mappings: {},
    requiredPaths: [],
    optionalPaths: []
  };
  writeJson(path.join(tempRoot, "models", "development", "model.json"), baseModel);

  const baseCatalog = {
    schemaVersion: 1,
    models: [{ id: "development", name: "Development", version: "1.0.0", status: "stable", manifest: "development/model.json", default: true }]
  };
  writeJson(path.join(tempRoot, "models", "catalog.json"), baseCatalog);
  assert(loadProjectModelCatalog(tempRoot).models[0].assets.length === 1, "valid fixture catalog loads");

  fs.writeFileSync(path.join(tempRoot, "boilerplate", "unlisted.md"), "unlisted\n", "utf8");
  assertThrows(() => loadProjectModelCatalog(tempRoot), /source coverage mismatch/u, "unlisted source file is rejected");
  fs.rmSync(path.join(tempRoot, "boilerplate", "unlisted.md"));

  writeJson(path.join(tempRoot, "models", "development", "model.json"), { ...baseModel, assets: ["one.md", "one.md"] });
  assertThrows(() => loadProjectModelCatalog(tempRoot), /duplicate paths/u, "duplicate source path is rejected");

  writeJson(path.join(tempRoot, "models", "development", "model.json"), { ...baseModel, mappings: { "one.md": { target: "../escape.md", kind: "rename" } } });
  assertThrows(() => loadProjectModelCatalog(tempRoot), /invalid path segment/u, "target path traversal is rejected");

  writeJson(path.join(tempRoot, "models", "development", "model.json"), { ...baseModel, requiredPaths: ["missing.md"] });
  assertThrows(() => loadProjectModelCatalog(tempRoot), /required path is not generated/u, "missing required target is rejected");

  fs.writeFileSync(path.join(tempRoot, "boilerplate", "two.md"), "two\n", "utf8");
  writeJson(path.join(tempRoot, "models", "development", "model.json"), {
    ...baseModel,
    assets: ["one.md", "two.md"],
    mappings: {
      "one.md": { target: "Docs/Index.md", kind: "rename" },
      "two.md": { target: "docs/index.md", kind: "rename" }
    }
  });
  assertThrows(() => loadProjectModelCatalog(tempRoot), /duplicate target paths/u, "case-insensitive target collision is rejected");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Project Model library tests completed.");
