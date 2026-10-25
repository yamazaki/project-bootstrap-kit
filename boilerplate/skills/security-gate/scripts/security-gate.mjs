#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { acceptFindings, createPlan, evaluate, fail, inside, json, reuseResult, WorkflowError, writeExclusive } from "./security-lib.mjs";
import { installProvider } from "./install.mjs";
import { importCloudflare, importOsv, noDependencies, runOsv } from "./providers.mjs";

export async function main(argv) {
  if (!argv.length || ["help", "--help"].includes(argv[0])) {
    console.log("Commands: plan, install, run-osv, import-osv, import-cloudflare, no-dependencies, accept-findings, reuse, gate. Read references/commands.md; all writes require real authorization and the exact plan digest. Mantis is explicit-request-only.");
    return;
  }
  const command = argv.shift(); const args = {}; const repeated = new Set(["scope", "input", "finding"]);
  const options = {
    plan: ["target", "ai-surface", "trigger", "output-root", "network", "scope", "input", "capabilities", "database-root", "database-at"],
    install: ["plan", "approve-plan", "provider"],
    "run-osv": ["plan", "approve-plan", "database-root", "database-at"],
    "import-osv": ["plan", "approve-plan", "report"],
    "import-cloudflare": ["plan", "approve-plan", "report"],
    "no-dependencies": ["plan", "approve-plan", "reason"],
    "accept-findings": ["plan", "approve-plan", "provider", "result", "finding", "reason", "expires", "mitigation"],
    reuse: ["plan", "approve-plan", "previous-plan", "result"],
    gate: ["plan", "cloudflare-result", "osv-result", "decisions"],
  };
  if (!options[command]) fail("Unknown security command; use --help.");
  const allowed = new Set([...options[command], "save"]);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/u, "");
    if (!argv[i]?.startsWith("--") || !allowed.has(key) || argv[i + 1] === undefined || argv[i + 1].startsWith("--") || (args[key] !== undefined && !repeated.has(key))) fail("Unknown, duplicate, or missing option.");
    if (repeated.has(key)) (args[key] ??= []).push(argv[i + 1]); else args[key] = argv[i + 1];
  }
  let value;
  if (command === "plan") value = createPlan({ target: args.target, surface: args["ai-surface"], trigger: args.trigger, scopes: args.scope, outputRoot: args["output-root"], network: args.network, inputs: args.input, capabilities: args.capabilities ? json(path.resolve(args.capabilities)) : {}, databaseRoot: args["database-root"], databaseAt: args["database-at"] });
  else {
    const plan = json(path.resolve(args.plan ?? "")); const approval = args["approve-plan"];
    if (command === "install") value = await installProvider(plan, args.provider, approval);
    else if (command === "run-osv") value = runOsv(plan, approval, { databaseRoot: args["database-root"], databaseAt: args["database-at"] });
    else if (command === "import-osv") value = importOsv(plan, args.report, approval);
    else if (command === "import-cloudflare") value = importCloudflare(plan, args.report, approval);
    else if (command === "no-dependencies") value = noDependencies(plan, args.reason, approval);
    else if (command === "accept-findings") value = acceptFindings(plan, args.provider, json(path.resolve(args.result)), args.finding, args.reason, args.expires, approval, args.mitigation);
    else if (command === "reuse") value = reuseResult(plan, json(path.resolve(args["previous-plan"])), json(path.resolve(args.result)), approval);
    else if (command === "gate") value = evaluate(plan, { cloudflare: args["cloudflare-result"] ? json(path.resolve(args["cloudflare-result"])) : undefined, osv: args["osv-result"] ? json(path.resolve(args["osv-result"])) : undefined }, new Date(), args.decisions ? json(path.resolve(args.decisions)) : []);
    else fail("Commands: plan, install, run-osv, import-osv, import-cloudflare, gate. Read the security-gate skill before execution.");
  }
  if (args.save) {
    const destination = path.resolve(args.save); const parent = fs.realpathSync(path.dirname(destination));
    const projectPlan = command === "plan" ? value : json(path.resolve(args.plan));
    const actualDestination = path.join(parent, path.basename(destination));
    if (inside(projectPlan.target, actualDestination) || !inside(projectPlan.outputRoot, actualDestination)) fail("Save plans/results inside the selected private external output root.");
    writeExclusive(parent, path.basename(destination), value);
  }
  console.log(JSON.stringify(value, null, 2));
  if (command === "gate" && value.state !== "READY") process.exitCode = 2;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch((error) => { console.error(error instanceof WorkflowError ? error.message : "Security workflow stopped. Review paths, plan freshness, authorization, tool integrity, capabilities and private evidence; no publish action was performed."); process.exitCode = 1; });
