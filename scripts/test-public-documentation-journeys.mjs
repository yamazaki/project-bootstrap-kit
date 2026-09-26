#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const initScript = path.join(rootDir, "scripts", "init-project.mjs");
const tempRoots = [];
const snapshotArgs = process.env.PUBLIC_DOC_TEST_REAL_INIT === "1"
  ? []
  : ["--internal-snapshot", "--internal-applied-at", "2000-01-01 00:00:00Z"];

function gitRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "public-doc-journey-"));
  tempRoots.push(root);
  assert.equal(spawnSync("git", ["init", "-q", root]).status, 0);
  return root;
}

function run(args) {
  const result = spawnSync(process.execPath, [initScript, ...args], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

try {
  const developmentGuide = fs.readFileSync(path.join(rootDir, "docs", "guides", "new-development-project.md"), "utf8");
  for (const option of ["--project-model development", "--project-name", "--project-slug", "--product-name", "--ai-surface"]) {
    assert.match(developmentGuide, new RegExp(option.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
  const development = gitRoot();
  run([
    "--target", development,
    "--project-model", "development",
    "--project-name", "Example Project",
    "--project-slug", "example-project",
    "--product-name", "Example Product",
    "--ai-surface", "codex",
    ...snapshotArgs,
  ]);
  assert.equal(fs.existsSync(path.join(development, "docs", "WORK", "0.1", "idea.md")), true);
  console.log("[OK] new development walkthrough command");

  const taskGuide = fs.readFileSync(path.join(rootDir, "docs", "guides", "task-workspace.md"), "utf8");
  assert.match(taskGuide, /--project-model task-workspace/u);
  const task = gitRoot();
  run([
    "--target", task,
    "--project-model", "task-workspace",
    "--project-name", "Research Workspace",
    "--project-slug", "research-workspace",
    "--ai-surface", "codex",
    ...snapshotArgs,
  ]);
  assert.equal(fs.existsSync(path.join(task, "context", "MASTER.md")), true);
  assert.equal(fs.existsSync(path.join(task, "docs", "ROADMAP.md")), false);
  console.log("[OK] task-workspace walkthrough command");

  const existing = gitRoot();
  fs.writeFileSync(path.join(existing, "README.md"), "# Existing Project\n", "utf8");
  const planPath = path.join(os.tmpdir(), `public-doc-adoption-${process.pid}-${Date.now()}.json`);
  run([
    "--target", existing,
    "--project-model", "development",
    "--project-name", "Existing Project",
    "--project-slug", "existing-project",
    "--ai-surface", "codex",
    "--adopt-existing",
    "--plan-output", planPath,
  ]);
  const plan = JSON.parse(fs.readFileSync(planPath, "utf8"));
  assert.equal(plan.operation, "adopt-existing");
  assert.equal(plan.extras.includes("README.md"), true);
  fs.rmSync(planPath, { force: true });
  fs.rmSync(`${planPath}.bundle`, { recursive: true, force: true });
  console.log("[OK] existing adoption walkthrough command is read-only for target content");
} finally {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
}

console.log("Public documentation journey tests completed.");
