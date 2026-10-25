import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { scanUpgradeTarget, applyUpgradePlan } from "./upgrade-plan-lib.mjs";
import { acceptUpgradeDecision } from "./bootstrap-upgrade-state-lib.mjs";

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "security-upgrade-"));
const kit = path.join(temp, "kit");
function run(program, args) { const result = spawnSync(program, args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); assert.equal(result.status, 0, result.stderr || result.stdout); return result.stdout; }
const git = (args) => run("git", ["-C", kit, ...args]);
const cli = (args) => run(process.execPath, [path.join(kit, "scripts/upgrade-project.mjs"), ...args]);
const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
function commit() { git(["add", "."]); git(["-c", "user.name=Kit Fixture", "-c", "user.email=fixture@example.invalid", "commit", "-qm", "fixture"]); }
function accept(target, name) {
  const planPath = path.join(temp, name);
  const { plan } = scanUpgradeTarget({ rootDir: kit, targetRoot: target, planOutput: planPath });
  for (const item of plan.paths.filter((entry) => entry.state !== "CURRENT")) {
    const decision = item.state === "NEW_UPSTREAM_PATH" ? item.local.exists ? "manual-merged" : "add" : item.state === "UPSTREAM_CHANGED" ? "safe-update" : "manual-merged";
    acceptUpgradeDecision({ rootDir: kit, planPath, relativePath: item.path, decision, reason: "reviewed fixture security migration", confirm: true });
  }
  applyUpgradePlan({ rootDir: kit, planPath });
  const next = scanUpgradeTarget({ rootDir: kit, targetRoot: target, planOutput: planPath + ".rerun" });
  assert(next.plan.paths.every((item) => item.state === "CURRENT"));
  return plan;
}
try {
  fs.mkdirSync(kit);
  const inventory = run("git", ["-C", source, "ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  for (const rel of new Set(inventory.split("\0").filter(Boolean))) {
    const file = path.join(source, rel); if (!fs.existsSync(file)) continue;
    fs.mkdirSync(path.dirname(path.join(kit, rel)), { recursive: true }); fs.copyFileSync(file, path.join(kit, rel));
  }
  // Simulate an older kit without the common security assets, keeping a real state baseline.
  fs.rmSync(path.join(kit, "boilerplate/skills/security-gate"), { recursive: true });
  for (const file of ["SECURITY_ASSURANCE.md", "SECURITY_ASSURANCE.json"]) fs.unlinkSync(path.join(kit, "boilerplate/docs", file));
  const manifest = path.join(kit, "models/development/model.json");
  const model = read(manifest); model.assets = model.assets.filter((value) => !value.startsWith("skills/security-gate/") && !value.startsWith("docs/SECURITY_ASSURANCE.")); write(manifest, model);
  run("git", ["init", "-q", kit]); commit();
  const target = path.join(temp, "project"); run("git", ["init", "-q", target]);
  run(process.execPath, [path.join(kit, "scripts/init-project.mjs"), "--target", target, "--project-name", "Existing Project", "--project-slug", "existing-project", "--ai-surface", "both"]);
  fs.writeFileSync(path.join(target, "docs/SECURITY_ASSURANCE.md"), "Project-owned security policy\n");
  fs.mkdirSync(path.join(target, ".agents/skills/security-gate"), { recursive: true });
  const custom = "---\nname: security-gate\ndescription: Project security workflow.\n---\nProject-owned instruction\n";
  fs.writeFileSync(path.join(target, ".agents/skills/security-gate/SKILL.md"), custom);
  fs.cpSync(path.join(source, "boilerplate/skills/security-gate"), path.join(kit, "boilerplate/skills/security-gate"), { recursive: true });
  for (const file of ["SECURITY_ASSURANCE.md", "SECURITY_ASSURANCE.json"]) fs.copyFileSync(path.join(source, "boilerplate/docs", file), path.join(kit, "boilerplate/docs", file));
  fs.copyFileSync(path.join(source, "models/development/model.json"), manifest); commit();
  const plan = accept(target, "security.json");
  assert(plan.paths.some((item) => item.path.endsWith("security-gate/scripts/security-gate.mjs") && item.state === "NEW_UPSTREAM_PATH"));
  assert.equal(fs.readFileSync(path.join(target, "docs/SECURITY_ASSURANCE.md"), "utf8"), "Project-owned security policy\n");
  assert.equal(fs.readFileSync(path.join(target, ".agents/skills/security-gate/SKILL.md"), "utf8"), custom);
  for (const surface of [".agents", ".claude"]) {
    const rel = `${surface}/skills/security-gate/references/execution-environments.md`;
    assert(plan.paths.some((item) => item.path === rel && item.state === "NEW_UPSTREAM_PATH"));
    assert.deepEqual(fs.readFileSync(path.join(target, rel)), fs.readFileSync(path.join(source, "boilerplate/skills/security-gate/references/execution-environments.md")));
  }
  console.log("[OK] stateful common security upgrade preserves local files, delivers environment guidance to both surfaces and reruns CURRENT");
  cli(["--target", target, "--update-technology-profiles", "--add", "security-audit-cloudflare", "--add", "security-dependencies-osv", "--reason", "adopt standard security tools", "--apply"]);
  accept(target, "profiles.json");
  const state = read(path.join(target, "docs/BOOTSTRAP_STATE.json"));
  for (const surface of [".agents", ".claude"]) for (const adapter of ["cloudflare-audit-adapter", "osv-dependency-adapter"]) {
    assert(state.paths.some((item) => item.path === `${surface}/skills/${adapter}/provider-lock.json`));
  }
  assert(!fs.existsSync(path.join(target, ".security-tools")));
  assert(!fs.existsSync(path.join(target, ".agents/skills/security-audit")));
  console.log("[OK] both security profiles are tracked via normal state addition without external installation");
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
