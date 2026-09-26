#!/usr/bin/env node

import {
  printFeedbackExportVerification,
  verifyFeedbackExport,
} from "./feedback-export-verifier.mjs";

const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const mode = modeIndex === -1 ? "final" : args[modeIndex + 1];
if (modeIndex !== -1) args.splice(modeIndex, 2);
const kitRootIndex = args.indexOf("--kit-root");
const targetRoot = kitRootIndex === -1 ? undefined : args[kitRootIndex + 1];
if (kitRootIndex !== -1) args.splice(kitRootIndex, 2);

if (!args[0] || !mode || (kitRootIndex !== -1 && !targetRoot)) {
  console.error("Usage: node verify-feedback-export.mjs [--mode pre-review|final] [--kit-root <path>] <kit_feedback_export_*.md>");
  process.exit(1);
}

const success = printFeedbackExportVerification(verifyFeedbackExport(args[0], { mode, targetRoot }));
process.exit(success ? 0 : 1);
