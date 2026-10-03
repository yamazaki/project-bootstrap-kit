#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acceptAdoptionManualMerge, setAdoptionDecisions } from "./adoption-plan-lib.mjs";
import { acceptUpgradeDecision, updatePathOwnership } from "./bootstrap-upgrade-state-lib.mjs";
import { scanUpgradeTarget, applyUpgradePlan } from "./upgrade-plan-lib.mjs";
import { entryInfo, walkDistributionFiles } from "./bootstrap-state-lib.mjs";

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "project-bootstrap-upgrade-test-"));
const kit = path.join(temp, "kit");
let checks = 0;
function check(label, fn) { fn(); checks += 1; console.log(`[OK] ${label}`); }
function command(program, args, expected = 0) {
  const result = spawnSync(program, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  assert.equal(result.status, expected, result.stderr || result.stdout);
  return `${result.stdout}\n${result.stderr}`;
}
function cli(args, expected = 0) { return command(process.execPath, [path.join(kit, "scripts/upgrade-project.mjs"), ...args], expected); }
function git(args) { return command("git", ["-C", kit, ...args]); }
function json(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function writeJson(file, value) { fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); }
function target(name) {
  const dir = path.join(temp, name);
  fs.mkdirSync(dir, { recursive: true });
  command("git", ["init", "-q", dir]);
  return dir;
}
function fresh(dir, surface = "codex") {
  command(process.execPath, [path.join(kit, "scripts/init-project.mjs"), "--target", dir, "--project-name", "Current Project", "--project-slug", "current-project", "--ai-surface", surface]);
}
function snapshot(dir) { return walkDistributionFiles(dir).map((p) => [p, entryInfo(dir, p)]); }
const decisions = path.join(temp, "decisions.json");
const options = (planPath, extra = {}) => ({ rootDir: kit, planPath, decisionsPath: decisions, ...extra });

try {
  // A local immutable fixture of the current worktree; never commit in the source repo.
  fs.mkdirSync(kit);
  const inventory = command("git", ["-C", sourceRoot, "ls-files", "--cached", "--others", "--exclude-standard", "-z"]).trimEnd();
  for (const relative of new Set(inventory.split("\0").filter(Boolean))) {
    const source = path.join(sourceRoot, relative);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(kit, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { dereference: false });
  }
  command("git", ["init", "-q", kit]);
  git(["add", "."]);
  git(["-c", "user.name=Kit Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture snapshot"]);

  const legacy = target("legacy");
  fresh(legacy);
  const originalRecord = fs.readFileSync(path.join(legacy, "docs/BOOTSTRAP_ADOPTION.md"), "utf8");
  fs.writeFileSync(path.join(legacy, "docs/BOOTSTRAP_ADOPTION.md"), originalRecord.replace("- Project Name: Current Project", "- Project Name: old-project"));
  fs.rmSync(path.join(legacy, "docs/BOOTSTRAP_STATE.json"));
  fs.rmSync(path.join(legacy, ".project-bootstrap/baselines"), { recursive: true });
  const mergePaths = ["AGENTS.md", "docs/DEVELOPMENT_GUIDELINE.md"];
  for (const p of mergePaths) fs.appendFileSync(path.join(legacy, p), "\nProject-specific rule\n");
  fs.appendFileSync(path.join(legacy, "docs/ROADMAP.md"), "\nProject roadmap\n");
  fs.appendFileSync(path.join(legacy, "docs/CODING_GUIDELINE.md"), "\nOld generic rule\n");
  const skillPath = ".agents/skills/project-bootstrap-kit-upgrade/SKILL.md";
  const skipPath = ".agents/skills/experience-advisory/SKILL.md";
  fs.rmSync(path.join(legacy, skillPath));
  fs.rmSync(path.join(legacy, skipPath));
  const beforeScan = snapshot(legacy);
  const planPath = path.join(temp, "migration.json");
  check("legacy slug override reaches plan; scan does not change project content", () => {
    cli(["--target", legacy, "--scan", "--project-name", "Renamed Project", "--project-slug", "renamed-project", "--plan-output", planPath]);
    assert.equal(json(planPath).options.projectSlug, "renamed-project");
    assert.deepEqual(snapshot(legacy), beforeScan);
  });
  check("omitted slug preserves legacy inference; repeated scans coexist", () => {
    const inferred = scanUpgradeTarget({ rootDir: kit, targetRoot: legacy, planOutput: path.join(temp, "inferred.json") });
    assert.equal(inferred.plan.options.projectSlug, "old-project");
    assert(fs.existsSync(`${planPath}.bundle`));
    assert(fs.existsSync(`${path.join(temp, "inferred.json")}.bundle`));
    assert.throws(() => scanUpgradeTarget({ rootDir: kit, targetRoot: legacy, planOutput: planPath }), /already exists/u);
  });
  check("invalid/empty slug rejected by library and CLI", () => {
    for (const projectSlug of ["Bad Slug", "", "../escape"]) assert.throws(() => scanUpgradeTarget({ rootDir: kit, targetRoot: legacy, projectSlug, planOutput: path.join(temp, "invalid.json") }), /Invalid project slug/u);
    cli(["--target", legacy, "--scan", "--project-slug", "Bad Slug"], 1);
  });

  const rows = [
    { path: "docs/ROADMAP.md", resolution: "keep", reason: "project roadmap remains authoritative" },
    { path: "docs/CODING_GUIDELINE.md", resolution: "replace", confirmReplace: true, reason: "reviewed replacement" },
    { path: skillPath, resolution: "add", confirmAdd: true, reason: "add update workflow" },
    { path: skipPath, resolution: "skip", reason: "local guidance covers advisory", satisfiedBy: "docs/ROADMAP.md" },
  ];
  const originalPlanBytes = fs.readFileSync(planPath, "utf8");
  function rejectRows(inputRows, pattern) {
    writeJson(decisions, { schemaVersion: 1, decisions: inputRows });
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), pattern);
    assert.equal(fs.readFileSync(planPath, "utf8"), originalPlanBytes);
    assert.deepEqual(snapshot(legacy), beforeScan);
  }
  check("preview returns unresolved paths and changes neither plan nor target", () => {
    writeJson(decisions, { schemaVersion: 1, decisions: rows });
    const result = setAdoptionDecisions(options(planPath));
    assert.equal(result.applied, false);
    assert.equal(result.changes.length, 4);
    assert(result.unresolved.includes("AGENTS.md"));
    assert.equal(fs.readFileSync(planPath, "utf8"), originalPlanBytes);
    assert.deepEqual(snapshot(legacy), beforeScan);
    assert.match(cli(["--set-adoption-decisions", planPath, "--decisions", decisions]), /PREVIEW/u);
  });
  check("bad/duplicate/unknown paths and late invalid row reject entire table", () => {
    for (const p of ["../escape", "/absolute", "docs\\escape", "docs//ROADMAP.md", "unknown.md"]) rejectRows([rows[0], { ...rows[1], path: p }], /path|reviewable/u);
    rejectRows([rows[0], rows[0]], /duplicate/u);
  });
  check("state-inappropriate decisions, missing confirms, reasons and forged acceptance reject", () => {
    rejectRows([{ ...rows[0], resolution: "add" }], /resolution/u);
    rejectRows([{ ...rows[2], confirmAdd: false }], /confirmAdd/u);
    rejectRows([{ ...rows[1], confirmReplace: "true" }], /confirmReplace/u);
    rejectRows([{ ...rows[0], reason: "" }], /reason/u);
    rejectRows([{ ...rows[0], reason: 42 }], /string/u);
    rejectRows([{ ...rows[0], reason: "two\nlines" }], /single line/u);
    rejectRows([{ ...rows[0], resolution: "manual-merged" }], /dedicated acceptance/u);
    rejectRows([{ ...rows[0], acceptedProjectHash: "forged" }], /unsupported fields/u);
    rejectRows([{ ...rows[0], ownership: "kit-managed" }], /unsupported fields/u);
    rejectRows([{ ...rows[0], confirmReplace: true }], /fields do not match/u);
    rejectRows([{ path: "docs/BOOTSTRAP_ADOPTION.md", resolution: "replace", reason: "confirmation missing" }], /confirmReplace/u);
  });
  check("mapping traversal, missing/dual reference and symlink escape reject atomically", () => {
    rejectRows([{ ...rows[3], satisfiedBy: "../outside" }], /invalid/u);
    rejectRows([{ ...rows[3], satisfiedBy: "missing" }], /does not exist/u);
    rejectRows([{ ...rows[3], supersededBy: "AGENTS.md" }], /only one/u);
    fs.symlinkSync(temp, path.join(legacy, "outside"));
    writeJson(decisions, { schemaVersion: 1, decisions: [{ ...rows[3], satisfiedBy: "outside/decisions.json" }] });
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /outside target/u);
    assert.equal(fs.readFileSync(planPath, "utf8"), originalPlanBytes);
    fs.rmSync(path.join(legacy, "outside"));
  });
  check("malformed/table-extra/oversized inputs and plan symlink reject without writes", () => {
    for (const table of [{ schemaVersion: 9, decisions: rows }, { schemaVersion: 1, decisions: [] }, { schemaVersion: 1, decisions: rows, target: "forged" }]) {
      writeJson(decisions, table);
      assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /Expected/u);
    }
    fs.writeFileSync(decisions, "{" );
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), SyntaxError);
    fs.writeFileSync(decisions, " ".repeat(1024 * 1024 + 1));
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /1 MiB/u);
    const link = path.join(temp, "plan-link.json");
    fs.symlinkSync(planPath, link);
    assert.throws(() => setAdoptionDecisions(options(link, { apply: true })), /regular plan/u);
    assert.equal(fs.readFileSync(planPath, "utf8"), originalPlanBytes);
  });
  check("stale target and immutable/snapshot tampering cannot be repaired by decision edits", () => {
    writeJson(decisions, { schemaVersion: 1, decisions: rows });
    const p = path.join(legacy, mergePaths[0]);
    const content = fs.readFileSync(p, "utf8");
    fs.appendFileSync(p, "stale\n");
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /Managed target evidence changed/u);
    fs.writeFileSync(p, content);
    const tampered = json(planPath); tampered.files[0].status = "CONFLICT";
    writeJson(planPath, tampered);
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /fingerprint/u);
    fs.writeFileSync(planPath, originalPlanBytes);
    const snapshotFile = path.join(`${planPath}.bundle`, "snapshot", "AGENTS.md");
    const bytes = fs.readFileSync(snapshotFile);
    fs.appendFileSync(snapshotFile, "tampered\n");
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /Snapshot evidence/u);
    fs.writeFileSync(snapshotFile, bytes);
    assert.equal(fs.readFileSync(planPath, "utf8"), originalPlanBytes);
  });
  check("valid CLI table saves only decisions and preserves immutable fingerprint", () => {
    const remaining = json(planPath).files.filter((entry) => entry.resolution === "unresolved" && !mergePaths.includes(entry.path) && !rows.some((row) => row.path === entry.path));
    writeJson(decisions, { schemaVersion: 1, decisions: [...rows, ...remaining.map((entry) => ({ path: entry.path, resolution: entry.status === "ADD" ? "add" : "replace", ...(entry.status === "ADD" ? { confirmAdd: true } : { confirmReplace: true }), reason: "reviewed fixture metadata update" }))] });
    assert.match(cli(["--set-adoption-decisions", planPath, "--decisions", decisions, "--apply"]), /SAVED/u);
    assert.equal(json(planPath).managedFingerprint, JSON.parse(originalPlanBytes).managedFingerprint);
    assert.equal(json(planPath).files.find((item) => item.path === skipPath).ownership, "mapped");
    assert.deepEqual(snapshot(legacy), beforeScan);
  });
  check("safe-only adds workflow but keeps conflict content and state pending", () => {
    cli(["--apply-plan", planPath, "--apply-safe-only"]);
    assert(fs.existsSync(path.join(legacy, skillPath)));
    assert.equal(fs.existsSync(path.join(legacy, "docs/BOOTSTRAP_STATE.json")), false);
    assert.equal(json(planPath).adoptionStatus, "pending");
    assert(fs.readFileSync(path.join(legacy, mergePaths[0]), "utf8").includes("Project-specific rule"));
  });
  const beforeMerge = mergePaths.map((p) => fs.readFileSync(path.join(legacy, p), "utf8"));
  check("two pre-edited adoption paths stop FIRST acceptance with sequential guidance", () => {
    for (const p of mergePaths) fs.appendFileSync(path.join(legacy, p), "\nMerged\n");
    const bytes = fs.readFileSync(planPath, "utf8");
    assert.throws(() => acceptAdoptionManualMerge({ rootDir: kit, planPath, relativePath: mergePaths[0], reason: "merged" }), /one file at a time/u);
    assert.equal(fs.readFileSync(planPath, "utf8"), bytes);
    for (let i = 0; i < mergePaths.length; i += 1) fs.writeFileSync(path.join(legacy, mergePaths[i]), beforeMerge[i]);
  });
  check("sequential adoption merges succeed; accepted-path re-edit is rejected", () => {
    for (const p of mergePaths) {
      fs.appendFileSync(path.join(legacy, p), "\nMerged\n");
      acceptAdoptionManualMerge({ rootDir: kit, planPath, relativePath: p, reason: "merged project rules" });
    }
    const bytes = fs.readFileSync(path.join(legacy, mergePaths[0]));
    fs.appendFileSync(path.join(legacy, mergePaths[0]), "re-edit\n");
    assert.throws(() => applyUpgradePlan({ rootDir: kit, planPath }), /Managed target evidence changed/u);
    fs.writeFileSync(path.join(legacy, mergePaths[0]), bytes);
    writeJson(decisions, { schemaVersion: 1, decisions: [{ path: mergePaths[0], resolution: "keep", reason: "downgrade" }] });
    assert.throws(() => setAdoptionDecisions(options(planPath, { apply: true })), /accepted manual merge/u);
  });
  check("complete migration records chosen slug, keeps project content and creates replacement backup", () => {
    cli(["--apply-plan", planPath]);
    const state = json(path.join(legacy, "docs/BOOTSTRAP_STATE.json"));
    assert.equal(state.project.slug, "renamed-project");
    assert.equal(state.project.name, "Renamed Project");
    assert(fs.readFileSync(path.join(legacy, "docs/ROADMAP.md"), "utf8").includes("Project roadmap"));
    assert(fs.existsSync(path.join(legacy, ".bootstrap-upgrade-diff/adoption-backup/migration.json/docs/CODING_GUIDELINE.md")));
    assert.equal(json(planPath).adoptionStatus, "complete");
    assert.throws(() => setAdoptionDecisions(options(planPath)), /not pending/u);
  });
  const statePlanPath = path.join(temp, "state.json");
  check("post-migration scan generates CURRENT-only state plan and rejects slug override", () => {
    const result = scanUpgradeTarget({ rootDir: kit, targetRoot: legacy, planOutput: statePlanPath });
    assert.equal(result.plan.operation, "state-upgrade");
    assert(result.plan.paths.every((item) => item.state === "CURRENT"));
    assert(fs.existsSync(`${statePlanPath}.bundle`));
    assert.throws(() => scanUpgradeTarget({ rootDir: kit, targetRoot: legacy, projectSlug: "new-slug" }), /only supported/u);
    assert.match(cli(["--target", legacy, "--scan", "--project-slug", "new-slug"], 1), /only supported/u);
  });
  check("wrong operation aliases provide actionable routing and refuse table/schema misuse", () => {
    assert.throws(() => setAdoptionDecisions(options(statePlanPath)), /state-upgrade use --accept-path-decision/u);
    assert.throws(() => acceptAdoptionManualMerge({ rootDir: kit, planPath: statePlanPath, relativePath: "AGENTS.md", reason: "wrong" }), /requires operation adopt-existing/u);
    assert.throws(() => acceptUpgradeDecision({ rootDir: kit, planPath, relativePath: "AGENTS.md", decision: "manual-merged", reason: "wrong" }), /requires operation state-upgrade/u);
    const schemaPlan = path.join(temp, "schema.json"); writeJson(schemaPlan, { operation: "bootstrap-state-schema-migration" });
    assert.throws(() => setAdoptionDecisions(options(schemaPlan)), /schema migration has no path decisions/u);
    assert.throws(() => applyUpgradePlan({ rootDir: kit, planPath: statePlanPath, safeOnly: true }), /only valid/u);
  });

  // Simulate the previously accepted release by removing only the new workflow skill.
  fs.rmSync(path.join(kit, "boilerplate/skills/project-bootstrap-kit-upgrade"), { recursive: true });
  const manifestPath = path.join(kit, "models/development/model.json");
  const model = json(manifestPath);
  model.assets = model.assets.filter((p) => p !== "skills/project-bootstrap-kit-upgrade/SKILL.md");
  writeJson(manifestPath, model);
  git(["add", "."]); git(["-c", "user.name=Kit Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "old model fixture"]);
  const mature = target("mature"); fresh(mature, "both");
  const independentSkill = path.join(mature, ".agents/skills/experience-advisory/SKILL.md");
  fs.appendFileSync(independentSkill, "\nLocally maintained advisory\n");
  const independentBefore = fs.readFileSync(independentSkill);
  for (const ownership of ["managed-merge", "project-owned"]) updatePathOwnership({ rootDir: kit, targetRoot: mature, relativePath: ".agents/skills/experience-advisory/SKILL.md", ownership, reason: "local advisory" });
  const fullModel = json(path.join(sourceRoot, "models/development/model.json"));
  fs.cpSync(path.join(sourceRoot, "boilerplate/skills/project-bootstrap-kit-upgrade"), path.join(kit, "boilerplate/skills/project-bootstrap-kit-upgrade"), { recursive: true });
  writeJson(manifestPath, fullModel);
  git(["add", "."]); git(["-c", "user.name=Kit Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "new workflow fixture"]);
  const maturePlan = path.join(temp, "mature.json");
  check("state scan offers new skill on both AI surfaces without overwriting local skills", () => {
    const { plan } = scanUpgradeTarget({ rootDir: kit, targetRoot: mature, planOutput: maturePlan });
    assert.equal(plan.paths.filter((item) => item.path.endsWith("project-bootstrap-kit-upgrade/SKILL.md") && item.state === "NEW_UPSTREAM_PATH").length, 2);
    assert.deepEqual(fs.readFileSync(independentSkill), independentBefore);
    for (const item of plan.paths.filter((p) => p.state === "NEW_UPSTREAM_PATH")) acceptUpgradeDecision({ rootDir: kit, planPath: maturePlan, relativePath: item.path, decision: "add", reason: "add update workflow", confirm: true });
    applyUpgradePlan({ rootDir: kit, planPath: maturePlan });
    assert.deepEqual(fs.readFileSync(independentSkill), independentBefore);
    for (const surface of [".agents", ".claude"]) assert(fs.existsSync(path.join(mature, surface, "skills/project-bootstrap-kit-upgrade/SKILL.md")));
    const rerun = scanUpgradeTarget({ rootDir: kit, targetRoot: mature, planOutput: path.join(temp, "rerun.json") });
    assert(rerun.plan.paths.every((item) => item.state === "CURRENT"));
  });
  for (const p of mergePaths) fs.appendFileSync(path.join(mature, p), "\nLocal merge needed\n");
  const sequentialState = path.join(temp, "state-merge.json");
  scanUpgradeTarget({ rootDir: kit, targetRoot: mature, planOutput: sequentialState });
  const stateContents = mergePaths.map((p) => fs.readFileSync(path.join(mature, p), "utf8"));
  check("two pre-edited state paths stop FIRST acceptance; sequential state merges succeed", () => {
    for (const p of mergePaths) fs.appendFileSync(path.join(mature, p), "\nIntegrated\n");
    assert.throws(() => acceptUpgradeDecision({ rootDir: kit, planPath: sequentialState, relativePath: mergePaths[0], decision: "manual-merged", reason: "merged" }), /one file at a time/u);
    for (let i = 0; i < mergePaths.length; i += 1) fs.writeFileSync(path.join(mature, mergePaths[i]), stateContents[i]);
    for (const p of mergePaths) {
      fs.appendFileSync(path.join(mature, p), "\nIntegrated\n");
      acceptUpgradeDecision({ rootDir: kit, planPath: sequentialState, relativePath: p, decision: "manual-merged", reason: "merged" });
    }
    applyUpgradePlan({ rootDir: kit, planPath: sequentialState });
  });
  check("fresh bootstrap includes workflow for all four AI surfaces", () => {
    for (const surface of ["codex", "claude", "both", "rovo"]) {
      const dir = target(`fresh-${surface}`); fresh(dir, surface);
      const roots = surface === "both" ? [".agents", ".claude"] : surface === "claude" ? [".claude"] : [".agents"];
      for (const root of roots) assert(fs.existsSync(path.join(dir, root, "skills/project-bootstrap-kit-upgrade/SKILL.md")));
    }
  });
  console.log(`Project-bootstrap-kit upgrade tests completed: ${checks} checks.`);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
