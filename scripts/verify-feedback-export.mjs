#!/usr/bin/env node

import {
  printFeedbackExportVerification,
  verifyFeedbackExport,
} from "../boilerplate/skills/knowledge-feedback/scripts/feedback-export-verifier.mjs";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const mode = modeIndex === -1 ? "final" : args[modeIndex + 1];
if (modeIndex !== -1) args.splice(modeIndex, 2);

if (!args[0] || !mode) {
  console.error("Usage: node scripts/verify-feedback-export.mjs [--mode pre-review|final] <kit_feedback_export_*.md>");
  process.exit(1);
}

const kitRoot = fileURLToPath(new URL("..", import.meta.url));
const success = printFeedbackExportVerification(verifyFeedbackExport(args[0], { mode, targetRoot: kitRoot }));
process.exit(success ? 0 : 1);
