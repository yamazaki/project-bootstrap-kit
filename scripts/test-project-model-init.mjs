#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { entryInfo, walkDistributionFiles } from "./bootstrap-state-lib.mjs";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const initScript = path.join(rootDir, "scripts", "init-project.mjs");

function run(args, expectedStatus = 0) {
  const result = spawnSync(process.execPath, [initScript, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  return `${result.stdout}\n${result.stderr}`;
}

function target() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "project-model-init-"));
  const result = spawnSync("git", ["init", "-q", dir], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return dir;
}

function snapshotArgs(targetRoot, extra = []) {
  return [
    "--target", targetRoot,
    "--project-name", "Example Project",
    "--project-slug", "example-project",
    "--ai-surface", "both",
    "--internal-snapshot",
    "--internal-applied-at", "2000-01-01 00:00:00Z",
    ...extra,
  ];
}

const roots = [];
try {
  const defaultRoot = target(); roots.push(defaultRoot);
  const explicitRoot = target(); roots.push(explicitRoot);
  run(snapshotArgs(defaultRoot));
  run(snapshotArgs(explicitRoot, ["--project-model", "development"]));
  const defaultFiles = walkDistributionFiles(defaultRoot);
  const explicitFiles = walkDistributionFiles(explicitRoot);
  assert.deepEqual(defaultFiles, explicitFiles);
  for (const relativePath of defaultFiles) assert.deepEqual(entryInfo(defaultRoot, relativePath), entryInfo(explicitRoot, relativePath), relativePath);
  console.log("[OK] default and explicit development fresh output are identical");

  for (const aiSurface of ["codex", "claude", "both", "rovo"]) {
    const taskRoot = target(); roots.push(taskRoot);
    run([
      "--target", taskRoot,
      "--project-model", "task-workspace",
      "--project-name", "調査ワークスペース",
      "--project-slug", "research-workspace",
      "--ai-surface", aiSurface,
      "--internal-snapshot",
      "--internal-applied-at", "2000-01-01 00:00:00Z",
    ]);
    assert.equal(fs.existsSync(path.join(taskRoot, "docs", "ROADMAP.md")), false);
    assert.equal(fs.existsSync(path.join(taskRoot, "docs", "TECHNOLOGY", "INDEX.md")), false);
    assert.equal(fs.existsSync(path.join(taskRoot, ".project-bootstrap", "licenses", "project-bootstrap-kit-MIT.txt")), true);
    console.log(`[OK] task-workspace fresh init for ${aiSurface}`);
  }

  const legacyRoot = target(); roots.push(legacyRoot);
  const legacy = run(["--target", legacyRoot, "--project-name", "old-slug", "--product-name", "Old Display", "--ai-surface", "codex", "--internal-snapshot"], 1);
  assert.match(legacy, /Legacy naming arguments/u);
  console.log("[OK] ambiguous legacy naming is rejected with guidance");

  const invalidRoot = target(); roots.push(invalidRoot);
  assert.match(run(snapshotArgs(invalidRoot, ["--project-slug", "Bad_Slug"]), 1), /Invalid project slug/u);
  console.log("[OK] invalid slug is rejected");

  const profileRoot = target(); roots.push(profileRoot);
  const profile = run([
    "--target", profileRoot,
    "--project-model", "task-workspace",
    "--project-name", "Task",
    "--project-slug", "task",
    "--ai-surface", "codex",
    "--technology-profile", "gas",
    "--internal-snapshot",
  ], 1);
  assert.match(profile, /does not accept Technology Profiles/u);
  console.log("[OK] non-applicable Technology Profile is rejected");

  const adoptionRoot = target(); roots.push(adoptionRoot);
  fs.writeFileSync(path.join(adoptionRoot, "LICENSE"), "Project-owned license\n", "utf8");
  const planPath = path.join(os.tmpdir(), `project-model-adoption-${process.pid}-${Date.now()}.json`);
  run([
    "--target", adoptionRoot,
    "--project-name", "Existing Project",
    "--project-slug", "existing-project",
    "--ai-surface", "codex",
    "--adopt-existing",
    "--plan-output", planPath,
  ]);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(plan.extras.includes("LICENSE"), true);
  assert.equal(plan.files.some((entry) => entry.path === "LICENSE"), false);
  assert.equal(plan.files.find((entry) => entry.path === ".project-bootstrap/licenses/project-bootstrap-kit-MIT.txt")?.status, "ADD");
  fs.rmSync(planPath, { force: true });
  fs.rmSync(`${planPath}.bundle`, { recursive: true, force: true });
  console.log("[OK] generated MIT attribution is added without changing the project root license");
} finally {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
}

console.log("Project Model init tests completed.");
