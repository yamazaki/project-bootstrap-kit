import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const ROLES = Object.freeze({
  cloudflare: { role: "code-audit", profile: "security-audit-cloudflare", adapter: "cloudflare-audit-adapter" },
  osv: { role: "dependency-scan", profile: "security-dependencies-osv", adapter: "osv-dependency-adapter" },
});
export const TRIGGERS = ["start", "change", "dependencies", "milestone", "release", "incident"];
const OMIT = new Set([".git", "node_modules", ".security-tools", ".bootstrap-upgrade-diff", ".DS_Store"]);
const INPUTS = new Set(["package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml", "yarn.lock", "go.mod", "go.sum", "Cargo.lock", "poetry.lock", "uv.lock", "Pipfile.lock", "requirements.txt", "composer.lock", "Gemfile.lock", "packages.lock.json"]);
export class WorkflowError extends Error {}
export function fail(message) { throw new WorkflowError(message); }
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
export function digest(value) { return crypto.createHash("sha256").update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))).digest("hex"); }
export function seal(value) { const { integrity: _ignored, ...body } = value; return { ...body, integrity: digest(body) }; }
export function checkSeal(value) { if (!value || value.integrity !== seal(value).integrity) fail("Invalid plan/result integrity; regenerate it."); }
export function inside(root, file) { const rel = path.relative(root, file); return rel === "" || (!rel.startsWith(`..${path.sep}`) && rel !== ".." && !path.isAbsolute(rel)); }
export function relative(value) {
  if (typeof value !== "string" || !value || /[\\<>:"|?*\u0000-\u001f]/u.test(value) || path.isAbsolute(value) || value.split("/").some((part) => !part || part === "." || part === ".." || /[. ]$/u.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(part))) fail("Expected a safe relative path.");
  return value;
}
// All paths below a selected root are no-follow; never open report/device/link entries.
export function safePath(root, rel, { missing = false } = {}) {
  relative(rel);
  let current = root;
  for (const part of rel.split("/")) {
    current = path.join(current, part);
    let st;
    try { st = fs.lstatSync(current); } catch (error) { if (error.code === "ENOENT" && missing) continue; throw error; }
    if (st.isSymbolicLink()) fail("Symlink path is not allowed.");
    if (current !== path.join(root, rel) && !st.isDirectory()) fail("Non-directory path component.");
  }
  return current;
}
export function readFile(file, limit = 16 * 1024 * 1024) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || st.nlink !== 1 || st.size > limit) fail("Expected a bounded regular file with one link.");
    const bytes = fs.readFileSync(fd);
    const after = fs.fstatSync(fd);
    if (bytes.length > limit || after.size !== st.size || after.mtimeMs !== st.mtimeMs) fail("File changed while reading.");
    return bytes;
  } finally { fs.closeSync(fd); }
}
export function json(file) { return JSON.parse(readFile(file).toString("utf8")); }
export function mkdirSafe(root, rel) {
  relative(rel);
  let current = root;
  for (const part of rel.split("/")) {
    current = path.join(current, part);
    try { fs.mkdirSync(current, { mode: 0o700 }); } catch (error) { if (error.code !== "EEXIST") throw error; }
    if (!fs.lstatSync(current).isDirectory() || fs.lstatSync(current).isSymbolicLink()) fail("Unsafe output directory.");
  }
  return current;
}
export function writeExclusive(root, rel, value, mode = 0o600) {
  relative(rel);
  if (rel.includes("/")) mkdirSafe(root, rel.slice(0, rel.lastIndexOf("/")));
  const file = safePath(root, rel, { missing: true });
  const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, mode);
  try { fs.writeFileSync(fd, typeof value === "string" || Buffer.isBuffer(value) ? value : `${JSON.stringify(value, null, 2)}\n`); } finally { fs.closeSync(fd); }
  return file;
}
export function skillRoots(target, surface) {
  if (!["codex", "claude", "both", "rovo"].includes(surface)) fail("Specify --ai-surface codex|claude|both|rovo.");
  return (surface === "both" ? [".agents/skills", ".claude/skills"] : [surface === "claude" ? ".claude/skills" : ".agents/skills"]).map((dir) => path.join(target, dir));
}
export function loadPolicy(target) {
  const policy = json(safePath(target, "docs/SECURITY_ASSURANCE.json"));
  if (policy.schemaVersion !== 1 || policy.providers?.codeAudit !== "cloudflare" || policy.providers?.dependencies !== "osv" || policy.mantis !== "explicit-request-only") fail("Unsupported security policy/providers.");
  for (const key of ["baselineMaxAgeHours", "dependencyMaxAgeHours", "maxSeconds", "maxAgentInvocations"]) if (!Number.isSafeInteger(policy[key]) || policy[key] < 1 || policy[key] > 100000) fail(`Invalid policy ${key}.`);
  return policy;
}
export function snapshot(target, scopes) {
  const entries = [];
  let total = 0;
  function visit(rel) {
    if (rel.split("/").some((part) => OMIT.has(part)) || /^(?:\.agents|\.claude)\/skills\/security-audit(?:\/|$)/u.test(rel)) return;
    const file = path.join(target, rel);
    const st = fs.lstatSync(file);
    if (st.isSymbolicLink()) fail("Source scope contains a symlink; specify a reviewed narrower scope.");
    if (st.isDirectory()) {
      for (const name of fs.readdirSync(file).sort()) visit(rel ? `${rel}/${name}` : name);
    } else {
      if (!st.isFile() || st.size > 64 * 1024 * 1024 || entries.length >= 100000 || (total += st.size) > 512 * 1024 * 1024) fail("Source exceeds snapshot bounds or contains a special file; narrow the scope.");
      entries.push({ path: rel, mode: st.mode & 0o777, hash: digest(readFile(file, 64 * 1024 * 1024)) });
    }
  }
  for (const scope of scopes) { if (scope !== ".") relative(scope); visit(scope === "." ? "" : scope); }
  const unique = [...new Map(entries.map((entry) => [entry.path, entry])).values()].sort((a, b) => a.path < b.path ? -1 : 1);
  if (!unique.length) fail("Empty source scope is not an audit.");
  return { entries: unique, fingerprint: digest(unique) };
}
export function providerLock(target, surface, provider) {
  const role = ROLES[provider];
  if (!role) fail("Only Cloudflare and OSV are standard providers. Mantis requires an explicit separate request.");
  const locks = skillRoots(target, surface).map((root) => path.join(root, role.adapter, "provider-lock.json"));
  if (locks.some((file) => !fs.existsSync(file))) return null;
  const values = locks.map((file) => json(safePath(target, path.relative(target, file).split(path.sep).join("/"))));
  if (values.some((value) => digest(value) !== digest(values[0])) || values[0].provider !== provider || values[0].schemaVersion !== 1) fail("Conflicting provider adapters; review profile files.");
  const lock = values[0];
  const files = provider === "cloudflare" ? lock.files : [...(lock.assets ?? []), ...(lock.provenance ?? [])];
  if (typeof lock.version !== "string" || !lock.version || !Array.isArray(files) || !files.length) fail("Empty or invalid provider pin.");
  for (const entry of files) {
    relative(entry.path);
    if (!Number.isSafeInteger(entry.size) || entry.size < 1 || entry.size > 128 * 1024 * 1024 || !(typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/u.test(entry.sha256)) && !(typeof entry.gitBlob === "string" && /^[a-f0-9]{40}$/u.test(entry.gitBlob))) fail("Invalid provider file pin.");
  }
  return values[0];
}
export function installGroups(target, surface, lock) {
  if (lock.provider === "cloudflare") return skillRoots(target, surface).map((root) => ({ destination: path.join(root, "security-audit"), files: lock.files }));
  const asset = lock.assets.find((item) => item.platform === process.platform && item.arch === process.arch);
  if (!asset) fail("No pinned OSV binary for this OS/CPU; use a reviewed supported environment.");
  return [{ destination: path.join(target, ".security-tools", "osv", lock.version), files: [asset, ...lock.provenance] }];
}
export function verifyBytes(bytes, entry) {
  if (bytes.length !== entry.size) fail("Provider size mismatch.");
  if (entry.sha256) { if (digest(bytes) !== entry.sha256) fail("Provider SHA-256 mismatch."); }
  else if (entry.gitBlob) {
    const hash = crypto.createHash("sha1").update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest("hex");
    if (hash !== entry.gitBlob) fail("Provider git blob digest mismatch.");
  } else fail("Provider has no pinned digest.");
}
export function installed(target, surface, lock) {
  if (!lock) return "missing-profile";
  try {
    for (const group of installGroups(target, surface, lock)) {
      const allowed = new Set(group.files.map((entry) => entry.path));
      function checkDirectory(dir, prefix = "") {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const rel = prefix ? `${prefix}/${item.name}` : item.name;
          if (item.isDirectory()) checkDirectory(safePath(group.destination, rel), rel);
          else if (!allowed.has(rel) || !item.isFile()) fail("Unexpected provider file.");
        }
      }
      safePath(target, path.relative(target, group.destination).split(path.sep).join("/"));
      checkDirectory(group.destination);
      for (const entry of group.files) {
        const rel = path.relative(target, path.join(group.destination, relative(entry.path))).split(path.sep).join("/");
        verifyBytes(readFile(safePath(target, rel), 128 * 1024 * 1024), entry);
      }
    }
    return "ready";
  } catch (error) { return error.code === "ENOENT" ? "missing" : "invalid"; }
}
export function databaseSnapshot(root) {
  root = fs.realpathSync(root);
  const entries = []; let total = 0;
  function visit(rel) {
    const file = safePath(root, rel); const st = fs.lstatSync(file);
    if (st.isDirectory()) { for (const name of fs.readdirSync(file).sort()) visit(`${rel}/${name}`); return; }
    if (!st.isFile() || st.nlink !== 1 || st.size > 512 * 1024 * 1024 || (total += st.size) > 1024 * 1024 * 1024 || entries.length > 1000) fail("Offline database exceeds bounds or contains an unsafe file.");
    const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); const hash = crypto.createHash("sha256"); const buffer = Buffer.alloc(65536);
    try { let bytes; while ((bytes = fs.readSync(fd, buffer, 0, buffer.length, null)) > 0) hash.update(buffer.subarray(0, bytes)); if (fs.fstatSync(fd).mtimeMs !== st.mtimeMs || fs.fstatSync(fd).size !== st.size) fail("Database changed during hashing."); } finally { fs.closeSync(fd); }
    entries.push({ path: rel, size: st.size, hash: hash.digest("hex") });
  }
  visit("osv-scalibr");
  if (!entries.some((entry) => entry.path.endsWith("/all.zip"))) fail("Offline database has no ecosystem/all.zip files.");
  return { root, fingerprint: digest(entries) };
}
export function createPlan({ target, surface, trigger, scopes = ["."], outputRoot, network = "offline", inputs, capabilities = {}, databaseRoot, databaseAt }, now = new Date()) {
  target = fs.realpathSync(target);
  outputRoot = fs.realpathSync(outputRoot);
  if (inside(target, outputRoot) || inside(outputRoot, target)) fail("Choose a separate existing private output directory outside the target (not its ancestor).");
  if (process.platform !== "win32" && (fs.statSync(outputRoot).mode & 0o077)) fail("Output root must be private (mode 0700).");
  if (!TRIGGERS.includes(trigger) || !["offline", "online"].includes(network)) fail("Invalid trigger or network mode.");
  skillRoots(target, surface);
  const policy = loadPolicy(target);
  const source = snapshot(target, scopes);
  const locks = Object.fromEntries(Object.keys(ROLES).map((id) => [id, providerLock(target, surface, id)]));
  const dependencies = inputs ?? source.entries.filter((entry) => INPUTS.has(path.basename(entry.path))).map((entry) => entry.path);
  for (const input of dependencies) if (!source.entries.some((entry) => entry.path === relative(input))) fail("Dependency input must be inside the reviewed snapshot.");
  const plan = {
    schemaVersion: 1, kind: "security-plan", id: crypto.randomUUID(), createdAt: now.toISOString(),
    target, surface, trigger, scopes, outputRoot, network, policy, policyDigest: digest(policy), sourceFingerprint: source.fingerprint,
    inputs: [...new Set(dependencies)].sort(), inputHashes: Object.fromEntries(dependencies.map((file) => [file, digest(readFile(safePath(target, file)))])),
    providers: Object.fromEntries(Object.keys(ROLES).map((id) => [id, { lock: locks[id], state: installed(target, surface, locks[id]), profile: ROLES[id].profile }])),
    capabilities, database: databaseRoot ? { ...databaseSnapshot(databaseRoot), acquiredAt: databaseAt } : null, required: ["cloudflare", "osv"], optional: [],
    next: "Review profiles, source/scope, install destinations, network, budget and output. Ask for install-and-audit approval if not already authorized. Mantis is explicit-request-only.",
  };
  return seal(plan);
}
export function validatePlan(plan, approval, now = new Date(), verifyDatabase = true) {
  checkSeal(plan);
  if (plan.schemaVersion !== 1 || plan.kind !== "security-plan" || !Object.keys(ROLES).every((key) => plan.required.includes(key)) || plan.required.length !== 2 || plan.optional.length) fail("Unsupported plan.");
  if (approval !== undefined && approval !== plan.integrity) fail("Pass the exact reviewed plan digest with --approve-plan after authorization.");
  const age = now.getTime() - Date.parse(plan.createdAt);
  if (!Number.isFinite(age) || age < -60000 || (approval !== undefined && age > 24 * 3600000)) fail("Expired plan; regenerate and review.");
  if (digest(loadPolicy(plan.target)) !== plan.policyDigest || snapshot(plan.target, plan.scopes).fingerprint !== plan.sourceFingerprint) fail("Stale source/policy; regenerate the plan.");
  if (verifyDatabase && plan.database && databaseSnapshot(plan.database.root).fingerprint !== plan.database.fingerprint) fail("Stale offline database; regenerate the plan.");
  for (const id of Object.keys(ROLES)) if (digest(providerLock(plan.target, plan.surface, id)) !== digest(plan.providers[id].lock)) fail("Stale provider adapter.");
  return plan;
}
export function requireApproval(plan, approval) { if (!approval) fail("Human authorization is required; preview the plan first."); return validatePlan(plan, approval); }
export function elapsedHours(date, now) { const age = (now.getTime() - Date.parse(date)) / 3600000; if (!Number.isFinite(age) || age < -1 / 60) return Infinity; return Math.max(0, age); }
export function evaluate(plan, runs, now = new Date(), decisions = []) {
  validatePlan(plan, undefined, now);
  const blocked = [], review = [];
  if (plan.trigger === "release" && (plan.scopes.length !== 1 || plan.scopes[0] !== ".")) blocked.push("Release requires a full-target baseline; a scoped audit alone cannot pass this gate.");
  for (const id of Object.keys(ROLES)) {
    const result = runs[id];
    if (!result) { blocked.push(`${id}: not_run`); continue; }
    try { checkSeal(result); } catch { blocked.push(`${id}: invalid result`); continue; }
    if (result.kind !== "security-result" || result.schemaVersion !== 1 || result.provider !== id || result.planDigest !== plan.integrity || result.sourceFingerprint !== plan.sourceFingerprint || result.state !== "complete") { blocked.push(`${id}: incomplete or mismatched result`); continue; }
    const maxAge = id === "osv" ? plan.policy.dependencyMaxAgeHours : plan.policy.baselineMaxAgeHours;
    if (elapsedHours(result.completedAt, now) > maxAge || (id === "osv" && elapsedHours(result.databaseAt, now) > maxAge)) blocked.push(`${id}: stale evidence`);
    if (!Array.isArray(result.findings) || !result.evidence?.length) { blocked.push(`${id}: missing evidence`); continue; }
    for (const evidence of result.evidence) {
      try { if (!inside(plan.outputRoot, evidence.path) || digest(readFile(safePath(plan.outputRoot, path.relative(plan.outputRoot, evidence.path).split(path.sep).join("/")))) !== evidence.digest) blocked.push(`${id}: changed evidence`); }
      catch { blocked.push(`${id}: unavailable evidence`); }
    }
    for (const finding of result.findings) {
      if (finding.verdict === "rejected") continue;
      if (["high", "critical"].includes(finding.severity) || finding.verdict === "needs_validation") blocked.push(`${id}: ${finding.id}`);
      else {
        const accepted = decisions.some((decision) => decision.provider === id && decision.finding === finding.id && decision.resultDigest === result.integrity && decision.planDigest === plan.integrity && typeof decision.owner === "string" && decision.owner.trim() && typeof decision.reason === "string" && decision.reason.trim() && typeof decision.mitigation === "string" && decision.mitigation.trim() && Date.parse(decision.expiresAt) > now.getTime());
        if (!accepted) review.push(`${id}: ${finding.id}`);
      }
    }
    if (result.coverageGaps?.length) blocked.push(`${id}: incomplete coverage`);
  }
  if (!plan.policy.owner?.trim()) review.push("Configure and review the project security owner.");
  return { schemaVersion: 1, state: blocked.length ? "BLOCKED" : review.length ? "REVIEW_REQUIRED" : "READY", blocked, review, planDigest: plan.integrity, note: "Evidence validation is not proof of the reviewer identity, absence of vulnerabilities, or approval to publish." };
}
export function acceptFindings(plan, provider, result, ids, reason, expiresAt, approval, mitigation) {
  requireApproval(plan, approval); checkSeal(result);
  if (!ROLES[provider] || result.provider !== provider || result.planDigest !== plan.integrity || result.state !== "complete" || !plan.policy.owner?.trim() || !reason?.trim() || !mitigation?.trim() || !Array.isArray(ids) || !ids.length || !(Date.parse(expiresAt) > Date.now()) || Date.parse(expiresAt) - Date.now() > plan.policy.baselineMaxAgeHours * 3600000) fail("Acceptance needs current results, owner, reason, mitigation, finding IDs and a bounded future expiry.");
  return ids.map((id) => {
    const finding = result.findings.find((item) => item.id === id);
    if (!finding || finding.verdict === "needs_validation" || ["high", "critical"].includes(finding.severity)) fail("High/critical or unresolved boundary findings cannot be waived by this command.");
    return { provider, finding: id, resultDigest: result.integrity, planDigest: plan.integrity, owner: plan.policy.owner, reason, mitigation, expiresAt };
  });
}
export function reuseResult(plan, previousPlan, result, approval) {
  requireApproval(plan, approval); validatePlan(previousPlan, undefined, new Date(), result.provider !== "cloudflare"); checkSeal(result);
  if (result.planDigest !== previousPlan.integrity || plan.sourceFingerprint !== previousPlan.sourceFingerprint || plan.policyDigest !== previousPlan.policyDigest || digest(plan.scopes) !== digest(previousPlan.scopes) || digest(plan.providers[result.provider]?.lock) !== digest(previousPlan.providers[result.provider]?.lock) || plan.outputRoot !== previousPlan.outputRoot) fail("Prior evidence is not compatible with this plan.");
  return seal({ ...result, planDigest: plan.integrity, reusedFromPlan: previousPlan.integrity });
}
