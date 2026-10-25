import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { digest, fail, installed, installGroups, inside, json, mkdirSafe, readFile, relative, requireApproval, safePath, seal, snapshot, validatePlan, writeExclusive } from "./security-lib.mjs";

function resultBase(plan, provider, evidence, state = "complete") {
  return { schemaVersion: 1, kind: "security-result", provider, planDigest: plan.integrity, sourceFingerprint: plan.sourceFingerprint, completedAt: new Date().toISOString(), state, findings: [], coverageGaps: [], evidence };
}
function evidence(root, names) {
  return names.map((name) => { const file = safePath(root, name); return { path: file, digest: digest(readFile(file)) }; });
}
function privateDirectory(plan, dir) {
  const root = fs.realpathSync(dir);
  if (!inside(plan.outputRoot, root) || inside(plan.target, root)) fail("Reports must be inside the selected external output root.");
  return root;
}
export function normalizeOsv(raw, exitCode) {
  if (![0, 1].includes(exitCode) || !raw || !Array.isArray(raw.results)) fail("OSV failed or returned malformed JSON; this is not zero findings.");
  const findings = new Map(); const coverageGaps = []; let packages = 0;
  for (const group of raw.results) {
    if (!group.source?.path || !Array.isArray(group.packages)) fail("OSV inventory/source is missing.");
    for (const item of group.packages) {
      if (!item.package?.name || !item.package.version || !item.package.ecosystem || (item.vulnerabilities != null && !Array.isArray(item.vulnerabilities))) fail("OSV package inventory is incomplete.");
      packages += 1;
      if (/[?&]source=LOCAL(?:&|$)/u.test(item.package.purl ?? "")) coverageGaps.push(`${item.package.name}: OSV classifies this package as local and does not match it against advisories; review whether it is first-party.`);
      for (const advisory of item.vulnerabilities ?? []) {
        if (typeof advisory.id !== "string" || !advisory.id) fail("OSV advisory ID missing.");
        const named = String(advisory.database_specific?.severity ?? "unknown").toLowerCase();
        const rank = ["informational", "low", "medium", "high", "critical"];
        const declared = named === "moderate" ? "medium" : named;
        const scores = (item.groups ?? []).filter((group) => group.ids?.includes(advisory.id)).map((group) => Number(group.max_severity)).filter((score) => Number.isFinite(score) && score >= 0 && score <= 10);
        const score = scores.length ? Math.max(...scores) : null;
        const scored = score === null ? "unknown" : score === 0 ? "informational" : score < 4 ? "low" : score < 7 ? "medium" : score < 9 ? "high" : "critical";
        const severity = rank[Math.max(rank.indexOf(declared), rank.indexOf(scored))] ?? "unknown";
        const id = `${item.package.ecosystem}:${item.package.name}@${item.package.version}:${advisory.id}`;
        findings.set(id, { id, verdict: "affected_dependency", severity, reportedSeverity: declared, reportedGroupScore: score, advisory, package: item.package, source: group.source });
      }
    }
  }
  if (!packages) fail("No dependency inventory found. Review missing/unsupported lockfiles; do not claim a clean scan.");
  if ((findings.size > 0) !== (exitCode === 1)) fail("OSV exit code and advisory results disagree.");
  return { findings: [...findings.values()], packages, coverageGaps, sources: raw.results.map((group) => group.source.path) };
}
export function importOsv(plan, dir, approval) {
  requireApproval(plan, approval);
  const lock = plan.providers.osv.lock;
  if (!lock || installed(plan.target, plan.surface, lock) !== "ready") fail("OSV provider is not installed and verified.");
  const root = privateDirectory(plan, dir);
  const context = json(safePath(root, "osv-context.json"));
  if (context.failed || context.planDigest !== plan.integrity || context.network !== plan.network || !Number.isFinite(Date.parse(context.databaseAt)) || !Array.isArray(context.inputs) || digest(context.inputs) !== digest(plan.inputs)) fail("OSV context does not match the plan.");
  if (plan.network === "offline" && (!plan.database || context.databaseFingerprint !== plan.database.fingerprint || context.databaseAt !== plan.database.acquiredAt)) fail("Offline database identity/freshness does not match the plan.");
  const asset = lock.assets.find((entry) => entry.platform === process.platform && entry.arch === process.arch);
  if (context.toolVersion !== lock.version || context.toolDigest !== asset?.sha256) fail("OSV tool identity does not match the pinned binary.");
  const normalized = normalizeOsv(json(safePath(root, "osv.json")), context.exitCode);
  const covered = normalized.sources.map((file) => {
    try { return fs.realpathSync(path.resolve(plan.target, file)); } catch { return null; }
  });
  if (plan.inputs.some((input) => !covered.includes(path.join(plan.target, input)))) fail("OSV did not cover every planned dependency input.");
  return seal({ ...resultBase(plan, "osv", evidence(root, ["osv.json", "osv-context.json"])), ...normalized, databaseAt: context.databaseAt, toolVersion: plan.providers.osv.lock?.version });
}
export function noDependencies(plan, reason, approval) {
  requireApproval(plan, approval);
  const entries = snapshot(plan.target, plan.scopes).entries;
  if (plan.inputs.length || !plan.policy.owner?.trim() || !reason?.trim() || entries.some((entry) => /(?:package\.json|pyproject\.toml|pom\.xml|build\.gradle|Cargo\.toml|Gemfile|\.csproj)$/u.test(entry.path))) fail("Dependency applicability needs owner review and no unresolved package manifests/inputs.");
  const directory = mkdirSafe(plan.outputRoot, `dependency-applicability-${crypto.randomUUID()}`);
  writeExclusive(directory, "inventory.json", { sourceFingerprint: plan.sourceFingerprint, paths: entries.map((entry) => entry.path), owner: plan.policy.owner, reason });
  return seal({ ...resultBase(plan, "osv", evidence(directory, ["inventory.json"])), applicability: "not_applicable", databaseAt: new Date().toISOString() });
}
export function runOsv(plan, approval, { databaseRoot, databaseAt } = {}) {
  requireApproval(plan, approval);
  const lock = plan.providers.osv.lock;
  if (!lock || installed(plan.target, plan.surface, lock) !== "ready") fail("OSV is not installed and verified.");
  if (!plan.inputs.length) fail("No dependency inputs. Review applicability instead of running a zero-input scan.");
  const directory = mkdirSafe(plan.outputRoot, `osv-${crypto.randomUUID()}`);
  const binary = path.join(installGroups(plan.target, plan.surface, lock)[0].destination, process.platform === "win32" ? "osv-scanner.exe" : "osv-scanner");
  const args = ["scan", "source", "--format=json", "--all-packages", "--no-resolve", "--config", path.join(directory, "config.toml")];
  writeExclusive(directory, "config.toml", "# Empty global override: project ignores cannot silently suppress advisories.\n");
  const env = { PATH: path.dirname(binary), TMPDIR: directory, TMP: directory, TEMP: directory };
  if (process.platform === "win32") env.SystemRoot = process.env.SystemRoot;
  if (plan.network === "offline") {
    if (!plan.database || !Number.isFinite(Date.parse(plan.database.acquiredAt))) fail("Offline scan needs a reviewed database directory and acquisition time in the plan; no automatic online fallback.");
    if (databaseRoot && fs.realpathSync(databaseRoot) !== plan.database.root || databaseAt && databaseAt !== plan.database.acquiredAt) fail("Database arguments differ from the approved plan.");
    env.OSV_SCALIBR_LOCAL_DB_CACHE_DIRECTORY = plan.database.root;
    args.push("--offline");
  }
  for (const input of plan.inputs) args.push(/(?:\.spdx\.json|\.cdx\.json|bom\.json)$/u.test(input) ? "--sbom" : "--lockfile", safePath(plan.target, relative(input)));
  const execution = spawnSync(binary, args, { cwd: directory, env, encoding: "utf8", timeout: plan.policy.maxSeconds * 1000, maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  writeExclusive(directory, "osv.json", execution.stdout ?? "");
  writeExclusive(directory, "osv.stderr.log", execution.stderr ?? "");
  writeExclusive(directory, "osv-context.json", { planDigest: plan.integrity, inputs: plan.inputs, network: plan.network, databaseAt: plan.network === "online" ? new Date().toISOString() : plan.database.acquiredAt, databaseFingerprint: plan.database?.fingerprint ?? null, toolVersion: lock.version, toolDigest: digest(readFile(binary, 128 * 1024 * 1024)), exitCode: execution.status, failed: Boolean(execution.error || execution.signal) });
  validatePlan(plan);
  if (execution.error || execution.signal) fail("OSV was interrupted or failed. Private artifacts were retained; regenerate/retry safely.");
  return { directory, result: importOsv(plan, directory, approval) };
}
export function importCloudflare(plan, dir, approval) {
  requireApproval(plan, approval);
  const lock = plan.providers.cloudflare.lock;
  if (!lock || installed(plan.target, plan.surface, lock) !== "ready") fail("Cloudflare skill is not installed and verified.");
  const root = privateDirectory(plan, dir);
  const names = ["run-metadata.json", "architecture.md", "coverage-ledger.json", "findings.json", "REPORT.md", "FINDINGS-DETAIL.md", "NEEDS-VALIDATION.md"];
  const retained = evidence(root, names);
  const metadata = json(safePath(root, "run-metadata.json"));
  if (metadata.run_status !== "complete" || metadata.source_ref !== plan.sourceFingerprint || path.resolve(metadata.target ?? "") !== plan.target || !["standard", "deep"].includes(metadata.profile) || digest(metadata.scope_paths) !== digest(plan.scopes)) fail("Cloudflare run is incomplete, partial, or does not match target/source/scope.");
  const completion = typeof metadata.completed_at === "string" && /^\d{4}-\d{2}-\d{2}T/u.test(metadata.completed_at) ? Date.parse(metadata.completed_at) : NaN;
  if (!Number.isFinite(completion) || completion > Date.now() + 60000) fail("Cloudflare completed_at must record the actual audit completion time, not the import time.");
  if (!Number.isSafeInteger(metadata.budget) || metadata.budget < 1 || metadata.budget > plan.policy.maxAgentInvocations || !Number.isSafeInteger(metadata.agent_invocations) || metadata.agent_invocations < 1 || metadata.agent_invocations > metadata.budget || !Number.isFinite(metadata.duration_seconds) || metadata.duration_seconds < 0 || metadata.duration_seconds > plan.policy.maxSeconds) fail("Cloudflare budget/count/duration is missing or exceeds the approved plan.");
  if (!plan.capabilities.independentAgents || !plan.capabilities.skillRecognized) fail("Record verified skill recognition and independent-agent capability before a full audit.");
  if (metadata.execution_policy !== "sandboxed-source-and-local-only" || (metadata.target_execution_performed !== false && !plan.capabilities.sandbox)) fail("A source-only declaration or verified sandbox capability is required.");
  const skillRoot = installGroups(plan.target, plan.surface, lock)[0].destination;
  for (const [validator, input] of [["validate-findings.cjs", "findings.json"], ["validate-coverage-ledger.cjs", "coverage-ledger.json"]]) {
    const run = spawnSync(process.execPath, [safePath(skillRoot, validator), safePath(root, input)], { cwd: root, env: {}, encoding: "utf8", timeout: 30000, maxBuffer: 1024 * 1024 });
    if (run.status !== 0) fail(`Cloudflare ${validator} rejected the raw report.`);
  }
  const raw = json(safePath(root, "findings.json"));
  const ledger = json(safePath(root, "coverage-ledger.json"));
  if (!Array.isArray(raw) || !Array.isArray(ledger) || !ledger.some((unit) => ["covered", "candidate"].includes(unit.status))) fail("Empty coverage is not a completed audit.");
  const fingerprints = new Set(raw.map((item) => item.fingerprint));
  const gaps = ledger.filter((unit) => !["covered", "candidate", "not_applicable", "out_of_scope"].includes(unit.status) || (unit.status === "candidate" && unit.result_fingerprints?.some((id) => !fingerprints.has(id))));
  const findings = raw.map((item) => ({ id: item.fingerprint, verdict: item.verdict, severity: item.verdict === "confirmed" ? item.severity.overall_severity : null }));
  validatePlan(plan);
  return seal({ ...resultBase(plan, "cloudflare", retained), completedAt: metadata.completed_at, findings, coverageGaps: gaps.map((unit) => unit.coverage_id), profile: metadata.profile });
}
