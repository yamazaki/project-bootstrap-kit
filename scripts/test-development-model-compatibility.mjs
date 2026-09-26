#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadProjectModelCatalog, materializeProjectModel, resolveProjectModel } from "./project-model-lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const boilerplateDir = path.join(rootDir, "boilerplate");

function copyRecursive(sourceDir, targetDir) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(targetPath, { recursive: true });
      copyRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.copyFileSync(sourcePath, targetPath);
      fs.chmodSync(targetPath, fs.statSync(sourcePath).mode & 0o777);
    }
  }
}

function skillRoots(aiSurface, targetRoot) {
  if (aiSurface === "codex" || aiSurface === "rovo") return [path.join(targetRoot, ".agents", "skills")];
  if (aiSurface === "claude") return [path.join(targetRoot, ".claude", "skills")];
  return [path.join(targetRoot, ".agents", "skills"), path.join(targetRoot, ".claude", "skills")];
}

function legacyMaterialize(targetRoot, aiSurface) {
  copyRecursive(boilerplateDir, targetRoot);
  fs.renameSync(path.join(targetRoot, "_AGENTS.md"), path.join(targetRoot, "AGENTS.md"));
  const stagedClaude = path.join(targetRoot, "_CLAUDE.md");
  if (aiSurface === "claude" || aiSurface === "both") fs.renameSync(stagedClaude, path.join(targetRoot, "CLAUDE.md"));
  else fs.rmSync(stagedClaude);
  for (const skillRoot of skillRoots(aiSurface, targetRoot)) copyRecursive(path.join(targetRoot, "skills"), skillRoot);
  fs.rmSync(path.join(targetRoot, "skills"), { recursive: true, force: true });
}

function snapshot(root) {
  const result = [];
  function walk(current, prefix) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) walk(filePath, relativePath);
      else if (entry.isFile()) {
        result.push({
          path: relativePath,
          mode: fs.statSync(filePath).mode & 0o777,
          hash: crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
        });
      }
    }
  }
  walk(root, "");
  return result;
}

const catalog = loadProjectModelCatalog(rootDir);
const development = resolveProjectModel(catalog, "development");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "development-model-compat-"));

try {
  for (const aiSurface of ["codex", "claude", "both", "rovo"]) {
    const legacyRoot = path.join(tempRoot, `${aiSurface}-legacy`);
    const modelRoot = path.join(tempRoot, `${aiSurface}-model`);
    fs.mkdirSync(legacyRoot, { recursive: true });
    fs.mkdirSync(modelRoot, { recursive: true });
    legacyMaterialize(legacyRoot, aiSurface);
    materializeProjectModel({ rootDir, targetRoot: modelRoot, model: development, aiSurface });
    const legacy = snapshot(legacyRoot);
    const model = snapshot(modelRoot);
    if (JSON.stringify(legacy) !== JSON.stringify(model)) {
      throw new Error(`Development Model output differs from legacy output for ${aiSurface}`);
    }
    console.log(`[OK] development Model matches legacy output for ${aiSurface} (${model.length} files)`);
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Development Model compatibility tests completed.");
