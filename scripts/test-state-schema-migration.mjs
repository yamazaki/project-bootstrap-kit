#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { sha256Buffer, stateDigest } from "./bootstrap-state-lib.mjs";
import { applyStateSchemaMigration, scanStateSchemaMigration } from "./state-schema-migration-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "state-schema-migration-"));
const targetRoot = path.join(tempRoot, "target");
fs.mkdirSync(path.join(targetRoot, "docs"), { recursive: true });
assert.equal(spawnSync("git", ["init", "-q", targetRoot]).status, 0);
fs.writeFileSync(path.join(targetRoot, "README.md"), "# Existing project\n", "utf8");
const readmeBytes = fs.readFileSync(path.join(targetRoot, "README.md"));
const readmeHash = sha256Buffer(readmeBytes);
const baselineObject = path.join(".project-bootstrap", "baselines", "sha256", readmeHash.slice("sha256:".length));
fs.mkdirSync(path.dirname(path.join(targetRoot, baselineObject)), { recursive: true });
fs.writeFileSync(path.join(targetRoot, baselineObject), readmeBytes);
fs.writeFileSync(path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md"), `# Bootstrap Adoption

- Bootstrap Kit: project-bootstrap-kit
- Version: 0.8.3
- Applied At: 2026-09-01 00:00:00Z
- Project Name: legacy-project
- Product Name: Legacy Product
- Technology Profiles: none
- AI Surface: codex
`, "utf8");

const legacy = {
  schemaVersion: 1,
  kit: { name: "project-bootstrap-kit", version: "0.8.3", commit: "legacy-commit" },
  project: { name: "legacy-project", productName: "Legacy Product", aiSurface: "codex", technologyProfiles: [], snapshotAppliedAt: "2026-09-01 00:00:00Z" },
  paths: [{
    path: "README.md",
    ownership: "kit-managed",
    acceptedKitVersion: "0.8.3",
    acceptedKitCommit: "legacy-commit",
    acceptedUpstreamHash: readmeHash,
    acceptedProjectHash: readmeHash,
    baselineObject,
    acceptedProjectKind: "file",
    acceptedProjectMode: 420,
    resolution: "same",
    reason: null,
    satisfiedBy: null,
    supersededBy: null,
    upstreamKind: "file",
    upstreamMode: 420,
    lastEvaluatedAt: "2026-09-01T00:00:00.000Z",
  }],
  features: {},
  history: [{ at: "2026-09-01T00:00:00.000Z", operation: "fresh-init", kitVersion: "0.8.3", kitCommit: "legacy-commit" }],
};
legacy.integrity = { algorithm: "sha256", canonicalization: "sorted-json-v1", digest: "" };
legacy.integrity.digest = stateDigest(legacy);
fs.writeFileSync(path.join(targetRoot, "docs", "BOOTSTRAP_STATE.json"), `${JSON.stringify(legacy, null, 2)}\n`, "utf8");

try {
  const candidatePath = path.join(tempRoot, "candidate.json");
  const candidate = scanStateSchemaMigration({ rootDir, targetRoot, planOutput: candidatePath, projectName: "" });
  assert.equal(candidate.plan.migration.projectName, "Legacy Product");
  assert.equal(candidate.plan.migration.projectNameConfirmed, false);
  assert.throws(() => applyStateSchemaMigration({ rootDir, planPath: candidatePath }), /not owner-confirmed/u);
  console.log("[OK] unconfirmed human Project Name blocks apply");

  const integrityPath = path.join(tempRoot, "integrity.json");
  fs.writeFileSync(path.join(targetRoot, baselineObject), "tampered\n", "utf8");
  assert.throws(() => scanStateSchemaMigration({ rootDir, targetRoot, planOutput: integrityPath, projectName: "Legacy Project" }), /baseline object hash mismatch/u);
  fs.writeFileSync(path.join(targetRoot, baselineObject), readmeBytes);
  console.log("[OK] legacy baseline integrity mismatch blocks scan");

  const stalePath = path.join(tempRoot, "stale.json");
  scanStateSchemaMigration({ rootDir, targetRoot, planOutput: stalePath, projectName: "Legacy Project" });
  const adoptionPath = path.join(targetRoot, "docs", "BOOTSTRAP_ADOPTION.md");
  const adoptionBefore = fs.readFileSync(adoptionPath, "utf8");
  fs.writeFileSync(adoptionPath, `${adoptionBefore}\nchanged after scan\n`, "utf8");
  assert.throws(() => applyStateSchemaMigration({ rootDir, planPath: stalePath }), /adoption evidence changed/u);
  fs.writeFileSync(adoptionPath, adoptionBefore, "utf8");
  console.log("[OK] post-scan adoption change blocks apply as stale");

  const planPath = path.join(tempRoot, "confirmed.json");
  scanStateSchemaMigration({ rootDir, targetRoot, planOutput: planPath, projectName: "Legacy Project" });
  const readmeBefore = fs.readFileSync(path.join(targetRoot, "README.md"), "utf8");
  const result = applyStateSchemaMigration({ rootDir, planPath });
  assert.equal(result.status, "applied");
  const migrated = JSON.parse(fs.readFileSync(path.join(targetRoot, "docs", "BOOTSTRAP_STATE.json"), "utf8"));
  assert.equal(migrated.schemaVersion, 2);
  assert.equal(migrated.project.name, "Legacy Project");
  assert.equal(migrated.project.slug, "legacy-project");
  assert.equal(migrated.project.productName, "Legacy Product");
  assert.equal(migrated.project.model.id, "development");
  assert.equal(migrated.integrity.digest, stateDigest(migrated));
  assert.equal(fs.readFileSync(path.join(targetRoot, "README.md"), "utf8"), readmeBefore);
  console.log("[OK] schema 1 migrates to schema 2 without content-file changes");

  const rerun = applyStateSchemaMigration({ rootDir, planPath });
  assert.equal(rerun.status, "skipped");
  console.log("[OK] migration rerun is SKIP(SAME)");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("State schema migration tests completed.");
