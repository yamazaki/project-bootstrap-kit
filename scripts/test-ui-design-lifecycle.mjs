#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scanUpgradeTarget, applyUpgradePlan } from "./upgrade-plan-lib.mjs";
import { acceptUpgradeDecision } from "./bootstrap-upgrade-state-lib.mjs";

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "ui-design-distribution-"));
const kit = path.join(temp, "kit");
const skills = ["project-bootstrap-kit-ui-design", "project-bootstrap-kit-ui-review", "project-bootstrap-kit-ui-guideline-maintenance"];
const baseline = "docs/UI_DESIGN_BASELINE.md";
const projectDoc = "docs/REF/REF_ui-guideline_project.md";
const customDoc = "Project-owned brand and UI decisions\n";
const customSkill = "---\nname: project-bootstrap-kit-ui-review\ndescription: Project-specific review.\n---\nKeep this project workflow.\n";
const json = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
function run(program, args) {
  const result = spawnSync(program, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}
const git = (args) => run("git", ["-C", kit, ...args]);
function commit() {
  git(["add", "."]);
  git(["-c", "user.name=Kit Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "UI distribution fixture"]);
}
function fresh(name, surface = "codex", model = "development") {
  const target = path.join(temp, name);
  run("git", ["init", "-q", target]);
  run(process.execPath, [path.join(kit, "scripts/init-project.mjs"), "--target", target, "--project-name", "UI Fixture", "--project-slug", "ui-fixture", "--ai-surface", surface, "--project-model", model]);
  return target;
}
function acceptState(target, name) {
  const planPath = path.join(temp, name + ".json");
  const { plan } = scanUpgradeTarget({ rootDir: kit, targetRoot: target, planOutput: planPath });
  for (const item of plan.paths.filter((entry) => entry.state !== "CURRENT")) {
    const decision = item.state === "NEW_UPSTREAM_PATH" ? item.local.exists ? "manual-merged" : "add" : item.state === "UPSTREAM_CHANGED" ? "safe-update" : "manual-merged";
    acceptUpgradeDecision({ rootDir: kit, planPath, relativePath: item.path, decision, reason: "reviewed fixture UI migration", confirm: true });
  }
  applyUpgradePlan({ rootDir: kit, planPath });
  const rerun = scanUpgradeTarget({ rootDir: kit, targetRoot: target, planOutput: planPath + ".rerun" });
  assert(rerun.plan.paths.every((item) => item.state === "CURRENT"));
  return plan;
}

try {
  fs.mkdirSync(kit);
  // Commit only in a disposable fixture: the user's source checkout is never staged or committed.
  for (const name of ["scripts", "boilerplate", "models", "profiles", "upgrades", "assets", "VERSION"]) fs.cpSync(path.join(source, name), path.join(kit, name), { recursive: true });
  const manifestPath = path.join(kit, "models/development/model.json");
  const currentModel = json(manifestPath);
  const uiAssets = currentModel.assets.filter((p) => p === baseline || skills.some((skill) => p.startsWith(`skills/${skill}/`)));
  assert(uiAssets.includes(baseline));
  for (const skill of skills) assert(uiAssets.includes(`skills/${skill}/SKILL.md`));
  for (const rel of uiAssets) fs.rmSync(path.join(kit, "boilerplate", rel));
  for (const skill of skills) fs.rmSync(path.join(kit, "boilerplate/skills", skill), { recursive: true });
  write(manifestPath, { ...currentModel, assets: currentModel.assets.filter((p) => !uiAssets.includes(p)) });
  run("git", ["init", "-q", kit]); commit();
  const old = fresh("old-project", "both");
  fs.writeFileSync(path.join(old, projectDoc), customDoc);
  fs.writeFileSync(path.join(old, "DESIGN.md"), "Existing UI authority\n");
  fs.mkdirSync(path.join(old, ".agents/skills", skills[1]), { recursive: true });
  fs.writeFileSync(path.join(old, ".agents/skills", skills[1], "SKILL.md"), customSkill);
  const legacy = path.join(temp, "legacy-project");
  fs.cpSync(old, legacy, { recursive: true });
  fs.rmSync(path.join(legacy, "docs/BOOTSTRAP_STATE.json"));

  for (const rel of uiAssets) {
    fs.mkdirSync(path.dirname(path.join(kit, "boilerplate", rel)), { recursive: true });
    fs.copyFileSync(path.join(source, "boilerplate", rel), path.join(kit, "boilerplate", rel));
  }
  write(manifestPath, currentModel); commit();
  for (const surface of ["codex", "claude", "both", "rovo"]) {
    const target = fresh(`fresh-${surface}`, surface);
    const roots = surface === "both" ? [".agents", ".claude"] : [surface === "claude" ? ".claude" : ".agents"];
    assert(fs.existsSync(path.join(target, baseline)));
    assert(!fs.existsSync(path.join(target, projectDoc)));
    for (const root of roots) {
      for (const skill of skills) assert(fs.existsSync(path.join(target, root, "skills", skill, "SKILL.md")));
      assert(fs.existsSync(path.join(target, root, "skills", skills[0], "assets/project-guideline.md")));
    }
    assert(!fs.existsSync(path.join(target, "skills")));
    console.log(`[OK] ${surface}: baseline and three skills placed; no project UI documents generated`);
  }
  const task = fresh("task-workspace", "both", "task-workspace");
  assert(!fs.existsSync(path.join(task, baseline)));
  assert(!fs.existsSync(path.join(task, ".agents/skills", skills[0])));
  console.log("[OK] task-workspace does not receive development UI assets");

  const first = acceptState(old, "ui-addition");
  assert(first.paths.some((p) => p.path === baseline && p.state === "NEW_UPSTREAM_PATH"));
  assert.equal(fs.readFileSync(path.join(old, projectDoc), "utf8"), customDoc);
  assert.equal(fs.readFileSync(path.join(old, ".agents/skills", skills[1], "SKILL.md"), "utf8"), customSkill);
  assert.equal(fs.readFileSync(path.join(old, "DESIGN.md"), "utf8"), "Existing UI authority\n");
  console.log("[OK] state add/apply/rerun preserves project UI documents, DESIGN.md and conflicting skill");

  const template = `skills/${skills[0]}/assets/project-guideline.md`;
  fs.appendFileSync(path.join(kit, "boilerplate", template), "\nTemplate clarification for future projects.\n");
  commit();
  acceptState(old, "template-update");
  assert.match(fs.readFileSync(path.join(old, ".agents", template), "utf8"), /Template clarification/u);
  assert.equal(fs.readFileSync(path.join(old, projectDoc), "utf8"), customDoc);
  console.log("[OK] template update does not regenerate project-owned guidance; rerun is CURRENT");

  const legacyPlanPath = path.join(temp, "legacy.json");
  const { plan: legacyPlan } = scanUpgradeTarget({ rootDir: kit, targetRoot: legacy, planOutput: legacyPlanPath, projectSlug: "ui-fixture" });
  assert.equal(legacyPlan.operation, "adopt-existing");
  assert.equal(legacyPlan.files.find((p) => p.path === baseline).status, "ADD");
  assert.equal(legacyPlan.files.find((p) => p.path === `.agents/skills/${skills[1]}/SKILL.md`).status, "CONFLICT");
  assert(legacyPlan.extras.includes(projectDoc));
  assert(!fs.existsSync(path.join(legacy, baseline)));
  for (const item of legacyPlan.files) {
    if (item.status === "ADD") Object.assign(item, { resolution: "add", confirmAdd: true });
    if (item.status === "CONFLICT") Object.assign(item, { resolution: "keep", reason: "preserve project content" });
  }
  write(legacyPlanPath, legacyPlan);
  applyUpgradePlan({ rootDir: kit, planPath: legacyPlanPath });
  assert.equal(fs.readFileSync(path.join(legacy, projectDoc), "utf8"), customDoc);
  assert.equal(fs.readFileSync(path.join(legacy, ".agents/skills", skills[1], "SKILL.md"), "utf8"), customSkill);
  assert(fs.existsSync(path.join(legacy, baseline)));
  acceptState(legacy, "legacy-rerun");
  console.log("[OK] legacy scan previews ADD/CONFLICT without writes; explicit apply keeps custom content and reruns CURRENT");
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
