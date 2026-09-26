#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadProjectModelCatalog, projectModelManifestDigest, resolveProjectModel } from "./project-model-lib.mjs";
import { writeBootstrapState } from "./bootstrap-state-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "upgrade-model-applicability-"));
assert.equal(spawnSync("git", ["init", "-q", targetRoot]).status, 0);
const taskModel = resolveProjectModel(loadProjectModelCatalog(rootDir), "task-workspace");

try {
  writeBootstrapState(targetRoot, {
    schemaVersion: 2,
    kit: { name: "project-bootstrap-kit", version: "0.9.0", commit: "fixture" },
    project: {
      name: "Task Workspace",
      slug: "task-workspace",
      productName: null,
      model: {
        id: taskModel.id,
        version: taskModel.version,
        status: taskModel.status,
        contractVersion: taskModel.schemaVersion,
        manifestDigest: projectModelManifestDigest(taskModel),
      },
      aiSurface: "codex",
      technologyProfiles: [],
      snapshotAppliedAt: "2026-09-24 00:00:00Z",
    },
    paths: [],
    features: {},
    history: [],
  });
  const result = spawnSync(process.execPath, [
    path.join(rootDir, "scripts", "upgrade-project.mjs"),
    "--target", targetRoot,
    "--feature", "capture-inbox",
    "--dry-run",
  ], { encoding: "utf8" });
  assert.equal(result.status, 1, result.stderr || result.stdout);
  assert.match(`${result.stdout}\n${result.stderr}`, /not applicable to Project Model task-workspace/u);
  console.log("[OK] development-only upgrade feature is blocked for task-workspace");
} finally {
  fs.rmSync(targetRoot, { recursive: true, force: true });
}

console.log("Upgrade Project Model applicability tests completed.");
