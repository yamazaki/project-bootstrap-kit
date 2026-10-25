import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acceptFindings, createPlan, digest, evaluate, installed, json, readFile, reuseResult, safePath, seal, validatePlan } from "../boilerplate/skills/security-gate/scripts/security-lib.mjs";
import { installProvider } from "../boilerplate/skills/security-gate/scripts/install.mjs";
import { importCloudflare, importOsv, noDependencies, normalizeOsv, runOsv } from "../boilerplate/skills/security-gate/scripts/providers.mjs";
import { dryRun, apply } from "../upgrades/security-assurance/handler.mjs";

const kit = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "security-assurance-"));
let count = 0;
function put(root, name, value) { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, typeof value === "string" || Buffer.isBuffer(value) ? value : `${JSON.stringify(value)}\n`); return file; }
function fixture() {
  const base = fs.mkdtempSync(path.join(temp, "case-"));
  let target = path.join(base, "project"); let outputRoot = path.join(base, "private");
  fs.mkdirSync(target); fs.mkdirSync(outputRoot, { mode: 0o700 });
  target = fs.realpathSync(target); outputRoot = fs.realpathSync(outputRoot);
  put(target, "docs/SECURITY_ASSURANCE.json", { ...json(path.join(kit, "boilerplate/docs/SECURITY_ASSURANCE.json")), owner: "Fixture Owner" });
  put(target, "src/api.js", "export const get = (user, record) => user.id === record.owner ? record : null;\n");
  const bytes = new Map();
  const entry = (name, content) => { const data = Buffer.from(content); bytes.set(name, data); return { path: name, url: `https://raw.githubusercontent.com/fixture/${name}`, sha256: digest(data), size: data.length }; };
  const validator = "const fs=require('node:fs'); const d=JSON.parse(fs.readFileSync(process.argv[2])); process.exit(Array.isArray(d)?0:1);\n";
  const cloudflare = { schemaVersion: 1, provider: "cloudflare", version: "fixture", files: [entry("SKILL.md", "fixture skill\n"), entry("validate-findings.cjs", validator), entry("validate-coverage-ledger.cjs", validator)] };
  const osv = { schemaVersion: 1, provider: "osv", version: "fixture", assets: [{ ...entry(process.platform === "win32" ? "osv-scanner.exe" : "osv-scanner", "fixture binary\n"), platform: process.platform, arch: process.arch }], provenance: [entry("provenance.json", "{}\n")] };
  for (const surface of [".agents", ".claude"]) {
    put(target, `${surface}/skills/cloudflare-audit-adapter/provider-lock.json`, cloudflare);
    put(target, `${surface}/skills/osv-dependency-adapter/provider-lock.json`, osv);
  }
  const make = (extra = {}) => createPlan({ target, surface: "codex", trigger: "release", outputRoot, network: "online", capabilities: { independentAgents: true, skillRecognized: true }, ...extra });
  return { target, outputRoot, make, bytes, fetch: async (value) => bytes.get(value.path), cloudflare, osv };
}
async function test(label, fn) { const f = fixture(); await fn(f); count += 1; console.log(`[OK] ${label}`); }
function rawOsv(target, advisories = []) { return { results: [{ source: { path: path.join(target, "package-lock.json"), type: "lockfile" }, packages: [{ package: { name: "fixture-dependency", version: "1.0.0", ecosystem: "npm" }, vulnerabilities: advisories }] }] }; }
function cfReport(f, plan, findings = [], ledger = [{ status: "covered", coverage_id: "fixture-unit" }]) {
  const dir = fs.mkdtempSync(path.join(f.outputRoot, "audit-"));
  put(dir, "run-metadata.json", { run_status: "complete", completed_at: new Date().toISOString(), source_ref: plan.sourceFingerprint, target: plan.target, profile: "standard", scope_paths: plan.scopes, execution_policy: "sandboxed-source-and-local-only", target_execution_performed: false, budget: 32, agent_invocations: 8, duration_seconds: 2 });
  put(dir, "coverage-ledger.json", ledger); put(dir, "findings.json", findings);
  for (const file of ["architecture.md", "REPORT.md", "FINDINGS-DETAIL.md", "NEEDS-VALIDATION.md"]) put(dir, file, "Fixture only; no real audit performed.\n");
  return dir;
}
function evidenceResult(f, plan, provider, findings = []) {
  const file = put(f.outputRoot, `evidence-${provider}-${Date.now()}-${Math.random()}.json`, "{}\n");
  return seal({ schemaVersion: 1, kind: "security-result", provider, planDigest: plan.integrity, sourceFingerprint: plan.sourceFingerprint, completedAt: new Date().toISOString(), databaseAt: new Date().toISOString(), state: "complete", findings, coverageGaps: [], evidence: [{ path: file, digest: digest(readFile(file)) }] });
}
try {
  await test("plan is read-only and never requests Mantis", (f) => { const plan = f.make(); assert.deepEqual(plan.required, ["cloudflare", "osv"]); assert.deepEqual(plan.optional, []); assert.equal(fs.readdirSync(f.outputRoot).length, 0); });
  await test("missing profiles are reported without installing", (f) => { fs.rmSync(path.join(f.target, ".agents"), { recursive: true }); const plan = f.make(); assert.equal(plan.providers.cloudflare.state, "missing-profile"); assert.equal(evaluate(plan, {}).state, "BLOCKED"); });
  await test("unauthorized install performs no downloads", async (f) => { const plan = f.make(); let calls = 0; await assert.rejects(installProvider(plan, "cloudflare", undefined, async () => { calls++; }), /authorization/u); assert.equal(calls, 0); });
  await test("explicit Mantis is not a standard installer option", async (f) => { const plan = f.make(); await assert.rejects(installProvider(plan, "mantis", plan.integrity, f.fetch), /Mantis/u); });
  await test("install read-back, rerun and both surfaces", async (f) => { const plan = f.make({ surface: "both" }); await installProvider(plan, "cloudflare", plan.integrity, f.fetch); assert.equal(installed(f.target, "both", f.cloudflare), "ready"); await installProvider(plan, "cloudflare", plan.integrity, async () => { throw new Error("rerun downloaded"); }); });
  await test("bad downloaded digest is rejected without a completed install", async (f) => { const plan = f.make(); await assert.rejects(installProvider(plan, "osv", plan.integrity, async (entry) => Buffer.alloc(entry.size)), /SHA-256/u); assert.equal(installed(f.target, "codex", f.osv), "missing"); });
  await test("conflicting existing skill is preserved", async (f) => { put(f.target, ".agents/skills/security-audit/SKILL.md", "project-owned\n"); const plan = f.make(); await assert.rejects(installProvider(plan, "cloudflare", plan.integrity, f.fetch)); assert.equal(fs.readFileSync(path.join(f.target, ".agents/skills/security-audit/SKILL.md"), "utf8"), "project-owned\n"); });
  await test("source edits and untracked files invalidate approval", (f) => { const plan = f.make(); put(f.target, "src/new.js", "new\n"); assert.throws(() => validatePlan(plan, plan.integrity), /Stale/u); });
  await test("policy edits invalidate approval", (f) => { const plan = f.make(); const p = json(path.join(f.target, "docs/SECURITY_ASSURANCE.json")); p.owner = "Other"; put(f.target, "docs/SECURITY_ASSURANCE.json", p); assert.throws(() => validatePlan(plan), /Stale/u); });
  await test("adapter updates invalidate approval", (f) => { const plan = f.make({ scopes: ["src"] }); put(f.target, ".agents/skills/osv-dependency-adapter/provider-lock.json", { ...f.osv, version: "changed" }); assert.throws(() => validatePlan(plan), /Stale/u); });
  await test("plan forgery is rejected", (f) => { const plan = f.make(); plan.policy.maxSeconds = 999; assert.throws(() => validatePlan(plan), /integrity/u); });
  await test("future/expired mutation plans are rejected", (f) => { const plan = seal({ ...f.make(), createdAt: "2000-01-01T00:00:00Z" }); assert.throws(() => validatePlan(plan, plan.integrity), /Expired/u); });
  await test("source symlinks and hardlinks cannot become evidence", (f) => { fs.symlinkSync(path.join(f.target, "src/api.js"), path.join(f.target, "src/link.js")); assert.throws(() => f.make(), /symlink/u); fs.unlinkSync(path.join(f.target, "src/link.js")); fs.linkSync(path.join(f.target, "src/api.js"), path.join(f.target, "src/hard.js")); assert.throws(() => f.make(), /one link/u); });
  await test("output must be external and private", (f) => { assert.throws(() => f.make({ outputRoot: f.target }), /outside/u); if (process.platform !== "win32") { fs.chmodSync(f.outputRoot, 0o755); assert.throws(() => f.make(), /0700/u); } });
  await test("safe paths reject traversal", (f) => { assert.throws(() => safePath(f.target, "../elsewhere"), /relative/u); });
  await test("OSV clean inventory and affected dependency are distinct", (f) => { assert.equal(normalizeOsv(rawOsv(f.target), 0).packages, 1); const raw = rawOsv(f.target, [{ id: "OSV-fixture", database_specific: { severity: "HIGH" }, aliases: ["CVE-fixture"] }]); assert.equal(normalizeOsv(raw, 1).findings[0].severity, "high"); assert.throws(() => normalizeOsv(raw, 0), /disagree/u); });
  await test("OSV clean packages may omit vulnerabilities", (f) => { const raw = rawOsv(f.target); delete raw.results[0].packages[0].vulnerabilities; assert.equal(normalizeOsv(raw, 0).findings.length, 0); });
  await test("OSV errors and empty inventory are never clean", () => { for (const code of [127, 128, 129, 130, null]) assert.throws(() => normalizeOsv({ results: [] }, code)); assert.throws(() => normalizeOsv({ results: [] }, 0), /inventory/u); assert.throws(() => normalizeOsv({}, 0)); });
  await test("OSV imports must cover every planned lockfile", async (f) => { put(f.target, "package-lock.json", "{}\n"); const plan = f.make(); await installProvider(plan, "osv", plan.integrity, f.fetch); const dir = fs.mkdtempSync(path.join(f.outputRoot, "osv-")); put(dir, "osv.json", rawOsv(f.target)); put(dir, "osv-context.json", { planDigest: plan.integrity, network: plan.network, databaseAt: new Date().toISOString(), exitCode: 0, inputs: plan.inputs, toolVersion: f.osv.version, toolDigest: f.osv.assets[0].sha256 }); assert.equal(importOsv(plan, dir, plan.integrity).state, "complete"); put(dir, "osv.json", rawOsv("/other")); assert.throws(() => importOsv(plan, dir, plan.integrity), /every planned/u); });
  await test("dependency N/A needs explicit owner review and no manifests", (f) => { const plan = f.make(); const result = noDependencies(plan, "Only built-in runtime modules; reviewed inventory", plan.integrity); assert.equal(result.applicability, "not_applicable"); put(f.target, "package.json", "{}\n"); const next = f.make(); assert.throws(() => noDependencies(next, "none", next.integrity), /manifest/u); });
  await test("Cloudflare import runs validators and checks source/scope", async (f) => { const plan = f.make(); await installProvider(plan, "cloudflare", plan.integrity, f.fetch); const dir = cfReport(f, plan); assert.equal(importCloudflare(plan, dir, plan.integrity).state, "complete"); const metadata = json(path.join(dir, "run-metadata.json")); metadata.source_ref = "other"; put(dir, "run-metadata.json", metadata); assert.throws(() => importCloudflare(plan, dir, plan.integrity), /match/u); });
  await test("Cloudflare quick/incomplete/missing capability are rejected", async (f) => { const plan = f.make({ capabilities: {} }); await installProvider(plan, "cloudflare", plan.integrity, f.fetch); const dir = cfReport(f, plan); assert.throws(() => importCloudflare(plan, dir, plan.integrity), /capability/u); const metadata = json(path.join(dir, "run-metadata.json")); metadata.run_status = "incomplete"; put(dir, "run-metadata.json", metadata); assert.throws(() => importCloudflare(plan, dir, plan.integrity), /incomplete/u); });
  await test("dangling/deferred coverage cannot pass", async (f) => { const plan = f.make(); await installProvider(plan, "cloudflare", plan.integrity, f.fetch); const dir = cfReport(f, plan, [], [{ status: "candidate", coverage_id: "one", result_fingerprints: ["missing"] }]); assert.equal(importCloudflare(plan, dir, plan.integrity).coverageGaps.length, 1); });
  await test("both current zero-finding results pass only with evidence", (f) => { const plan = f.make(); const runs = { cloudflare: evidenceResult(f, plan, "cloudflare"), osv: evidenceResult(f, plan, "osv") }; assert.equal(evaluate(plan, runs).state, "READY"); assert.equal(evaluate(plan, { osv: runs.osv }).state, "BLOCKED"); });
  await test("tampered or deleted evidence blocks readiness", (f) => { const plan = f.make(); const runs = { cloudflare: evidenceResult(f, plan, "cloudflare"), osv: evidenceResult(f, plan, "osv") }; fs.unlinkSync(runs.osv.evidence[0].path); assert.equal(evaluate(plan, runs).state, "BLOCKED"); });
  await test("high/critical and unvalidated boundaries block", (f) => { const plan = f.make(); for (const finding of [{ id: "one", verdict: "confirmed", severity: "high" }, { id: "two", verdict: "needs_validation", severity: null }]) assert.equal(evaluate(plan, { cloudflare: evidenceResult(f, plan, "cloudflare", [finding]), osv: evidenceResult(f, plan, "osv") }).state, "BLOCKED"); });
  await test("medium/unknown require explicit bounded acceptance", (f) => { const plan = f.make(); const runs = { cloudflare: evidenceResult(f, plan, "cloudflare", [{ id: "medium", verdict: "confirmed", severity: "medium" }]), osv: evidenceResult(f, plan, "osv") }; assert.equal(evaluate(plan, runs).state, "REVIEW_REQUIRED"); const decisions = acceptFindings(plan, "cloudflare", runs.cloudflare, ["medium"], "Mitigation applied; fix is scheduled", new Date(Date.now() + 3600000).toISOString(), plan.integrity, "Temporarily restrict the affected operation"); assert.equal(evaluate(plan, runs, new Date(), decisions).state, "READY"); decisions[0].expiresAt = "2000-01-01T00:00:00Z"; assert.equal(evaluate(plan, runs, new Date(), decisions).state, "REVIEW_REQUIRED"); });
  await test("stale DB and incomplete runs block", (f) => { const plan = f.make(); const runs = { cloudflare: evidenceResult(f, plan, "cloudflare"), osv: seal({ ...evidenceResult(f, plan, "osv"), databaseAt: "2000-01-01T00:00:00Z" }) }; assert.equal(evaluate(plan, runs).state, "BLOCKED"); runs.osv = seal({ ...runs.osv, state: "incomplete" }); assert.equal(evaluate(plan, runs).state, "BLOCKED"); });
  await test("scoped release cannot silently become a full baseline", (f) => { const plan = f.make({ scopes: ["src"] }); assert.equal(evaluate(plan, { cloudflare: evidenceResult(f, plan, "cloudflare"), osv: evidenceResult(f, plan, "osv") }).state, "BLOCKED"); });
  await test("prior same-source evidence can be reused without refreshing its date", (f) => { const previous = f.make(); const result = evidenceResult(f, previous, "cloudflare"); const current = f.make(); const reused = reuseResult(current, previous, result, current.integrity); assert.equal(reused.completedAt, result.completedAt); assert.equal(reused.planDigest, current.integrity); });
  await test("OSV group CVSS severity and local package coverage are preserved", (f) => { const raw = rawOsv(f.target, [{ id: "OSV-critical" }]); raw.results[0].packages[0].groups = [{ ids: ["OSV-critical"], max_severity: "9.8" }]; assert.equal(normalizeOsv(raw, 1).findings[0].severity, "critical"); const local = rawOsv(f.target); local.results[0].packages[0].package.purl = "pkg:npm/example@1.0.0?source=LOCAL"; assert.equal(normalizeOsv(local, 0).coverageGaps.length, 1); });
  await test("offline scan cannot use an unplanned database", async (f) => { put(f.target, "package-lock.json", "{}\n"); const plan = f.make({ network: "offline" }); await installProvider(plan, "osv", plan.integrity, f.fetch); assert.throws(() => runOsv(plan, plan.integrity), /database.*plan/u); });
  await test("database updates invalidate dependency evidence without discarding code evidence", (f) => { const db = fs.mkdtempSync(path.join(f.outputRoot, "db-")); put(db, "osv-scalibr/npm/all.zip", "fixture-db-1"); const previous = f.make({ databaseRoot: db, databaseAt: new Date().toISOString() }); const result = evidenceResult(f, previous, "cloudflare"); put(db, "osv-scalibr/npm/all.zip", "fixture-db-2"); assert.throws(() => validatePlan(previous), /database/u); const current = f.make({ databaseRoot: db, databaseAt: new Date().toISOString() }); assert.equal(reuseResult(current, previous, result, current.integrity).completedAt, result.completedAt); });
  await test("Cloudflare refuses unbounded or over-budget campaign evidence", async (f) => { const plan = f.make(); await installProvider(plan, "cloudflare", plan.integrity, f.fetch); const dir = cfReport(f, plan); const metadata = json(path.join(dir, "run-metadata.json")); metadata.budget = null; put(dir, "run-metadata.json", metadata); assert.throws(() => importCloudflare(plan, dir, plan.integrity), /budget/u); });
  await test("CLI save cannot traverse an external symlink into the target", (f) => { const shortcut = path.join(f.outputRoot, "into-target"); fs.symlinkSync(f.target, shortcut, "dir"); const result = spawnSync(process.execPath, [path.join(kit, "boilerplate/skills/security-gate/scripts/security-gate.mjs"), "plan", "--target", f.target, "--ai-surface", "codex", "--trigger", "release", "--output-root", f.outputRoot, "--save", path.join(shortcut, "leaked-plan.json")], { encoding: "utf8" }); assert.equal(result.status, 1); assert(!fs.existsSync(path.join(f.target, "leaked-plan.json"))); });
  await test("Cloudflare reimport preserves audit age and rejects missing/future dates", async (f) => { const plan = f.make(); await installProvider(plan, "cloudflare", plan.integrity, f.fetch); const dir = cfReport(f, plan); const file = path.join(dir, "run-metadata.json"); const metadata = json(file); metadata.completed_at = "2000-01-01T00:00:00Z"; put(dir, "run-metadata.json", metadata); const result = importCloudflare(plan, dir, plan.integrity); assert.equal(result.completedAt, metadata.completed_at); assert(evaluate(plan, { cloudflare: result, osv: evidenceResult(f, plan, "osv") }).blocked.some((reason) => reason.includes("stale evidence"))); delete metadata.completed_at; put(dir, "run-metadata.json", metadata); assert.throws(() => importCloudflare(plan, dir, plan.integrity), /completion time/u); metadata.completed_at = "2999-01-01T00:00:00Z"; put(dir, "run-metadata.json", metadata); assert.throws(() => importCloudflare(plan, dir, plan.integrity), /completion time/u); });
  await test("legacy feature preserves custom content and reruns idempotently", (f) => {
    put(f.target, "AGENTS.md", "Project rules\n");
    put(f.target, "docs/BOOTSTRAP_ADOPTION.md", "# Adoption\n");
    put(f.target, "docs/SECURITY_ASSURANCE.md", "Project security\n");
    const reference = "references/execution-environments.md";
    const custom = "Project-owned execution environment\n";
    put(f.target, `.claude/skills/security-gate/${reference}`, custom);
    const ctx = { rootDir: kit, targetRoot: f.target, aiSurface: "both" };
    const log = console.log;
    try {
      console.log = () => {};
      dryRun(ctx); apply(ctx);
      const before = fs.readFileSync(path.join(f.target, "AGENTS.md"), "utf8");
      apply(ctx);
      assert.equal(fs.readFileSync(path.join(f.target, "AGENTS.md"), "utf8"), before);
    } finally { console.log = log; }
    assert.equal(fs.readFileSync(path.join(f.target, "docs/SECURITY_ASSURANCE.md"), "utf8"), "Project security\n");
    assert(fs.existsSync(path.join(f.target, ".claude/skills/security-gate/scripts/security-gate.mjs")));
    assert.equal(fs.readFileSync(path.join(f.target, `.claude/skills/security-gate/${reference}`), "utf8"), custom);
    assert.deepEqual(fs.readFileSync(path.join(f.target, `.agents/skills/security-gate/${reference}`)), fs.readFileSync(path.join(kit, `boilerplate/skills/security-gate/${reference}`)));
  });
  await test("fresh distribution includes common gate and optional profiles on all surfaces", (f) => {
    for (const surface of ["codex", "claude", "both", "rovo"]) {
      const target = path.join(temp, `fresh-${surface}`);
      fs.mkdirSync(target);
      assert.equal(spawnSync("git", ["init", "-q", target]).status, 0);
      const init = spawnSync(process.execPath, [path.join(kit, "scripts/init-project.mjs"), "--target", target, "--project-name", "Security Fixture", "--project-slug", "security-fixture", "--ai-surface", surface, "--technology-profile", "security-audit-cloudflare", "--technology-profile", "security-dependencies-osv", "--internal-snapshot", "--internal-applied-at", "2000-01-01 00:00:00Z"], { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
      assert.equal(init.status, 0, init.stderr || init.stdout);
      assert(fs.existsSync(path.join(target, "docs/SECURITY_ASSURANCE.json")));
      const roots = surface === "both" ? [".agents", ".claude"] : [surface === "claude" ? ".claude" : ".agents"];
      for (const root of roots) {
        assert(fs.existsSync(path.join(target, root, "skills/cloudflare-audit-adapter/provider-lock.json")));
        for (const file of ["SKILL.md", "references/execution-environments.md"]) {
          assert.deepEqual(fs.readFileSync(path.join(target, root, "skills/security-gate", file)), fs.readFileSync(path.join(kit, "boilerplate/skills/security-gate", file)));
        }
      }
      if (surface === "claude") assert(!fs.existsSync(path.join(target, ".agents/skills/security-gate")));
      if (surface === "codex" || surface === "rovo") assert(!fs.existsSync(path.join(target, ".claude/skills/security-gate")));
      assert(!fs.existsSync(path.join(target, ".security-tools")));
    }
  });
  console.log(`Security assurance: ${count} checks passed. Provider fixtures are mocks, not live audit evidence.`);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
