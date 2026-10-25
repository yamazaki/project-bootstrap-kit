import fs from "node:fs";
import path from "node:path";
import { fail, installGroups, installed, mkdirSafe, readFile, relative, requireApproval, safePath, verifyBytes, writeExclusive } from "./security-lib.mjs";

async function download(entry) {
  let url = new URL(entry.url);
  const allowed = new Set(["raw.githubusercontent.com", "github.com", "release-assets.githubusercontent.com"]);
  for (let redirects = 0; redirects <= 3; redirects += 1) {
    if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed.has(url.hostname)) fail("Unapproved provider download origin.");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(60000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) { await response.body?.cancel(); url = new URL(response.headers.get("location"), url); continue; }
    if (!response.ok) { await response.body?.cancel(); fail(`Provider download failed (${response.status}).`); }
    if (!Number.isSafeInteger(entry.size) || entry.size < 1 || entry.size > 128 * 1024 * 1024) fail("Invalid pinned download size.");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > entry.size) { fail("Provider exceeds pinned size."); }
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  fail("Too many provider redirects.");
}

// The fetch seam is for hermetic tests; the CLI never accepts a replacement URL or loader.
export async function installProvider(plan, provider, approval, fetchBytes = download) {
  requireApproval(plan, approval);
  const lock = plan.providers[provider]?.lock;
  if (!lock || !["cloudflare", "osv"].includes(provider)) fail("Add the standard tooling profile first; Mantis is explicit-request-only.");
  const groups = installGroups(plan.target, plan.surface, lock);
  // Verify all existing destinations before any mutation. Never merge into an unrelated skill.
  const pending = [];
  for (const group of groups) {
    const rel = path.relative(plan.target, group.destination).split(path.sep).join("/");
    const dest = safePath(plan.target, rel, { missing: true });
    if (fs.existsSync(dest)) {
      for (const entry of group.files) verifyBytes(readFile(safePath(dest, relative(entry.path)), 128 * 1024 * 1024), entry);
    } else pending.push({ ...group, rel });
  }
  for (const group of pending) {
    const parent = path.dirname(group.destination);
    mkdirSafe(plan.target, path.relative(plan.target, parent).split(path.sep).join("/"));
    const stagingRoot = mkdirSafe(plan.target, ".security-tools/staging");
    const staging = fs.mkdtempSync(path.join(stagingRoot, "install-"));
    try {
      for (const entry of group.files) {
        relative(entry.path);
        const bytes = await fetchBytes(entry);
        verifyBytes(bytes, entry);
        writeExclusive(staging, entry.path, bytes, provider === "osv" && entry.path.startsWith("osv-scanner") && !entry.path.endsWith("SUMS") ? 0o700 : 0o600);
      }
      // Revalidate source/adapter and destination immediately before publication.
      requireApproval(plan, approval);
      safePath(plan.target, group.rel, { missing: true });
      if (fs.existsSync(group.destination)) fail("Install destination changed; review it before retrying.");
      fs.renameSync(staging, group.destination);
    } finally { if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true }); }
  }
  if (installed(plan.target, plan.surface, lock) !== "ready") fail("Installed provider failed read-back verification.");
  return { provider, state: "installed", note: provider === "cloudflare" ? "Reload/discover the skill, verify agent and sandbox capability, then run the full audit. Installation is not an audit." : "The pinned binary and provenance are present. Run the dependency scan separately." };
}
