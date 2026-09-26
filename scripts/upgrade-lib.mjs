#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function copyRecursive(sourceDir, targetDir) {
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      ensureDir(targetPath);
      copyRecursive(sourcePath, targetPath);
    } else if (entry.isFile()) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

export function listFilesRecursive(rootDir, prefix = "") {
  const result = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const relativePath = path.join(prefix, entry.name);
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursive(fullPath, relativePath));
    } else if (entry.isFile()) {
      result.push(relativePath);
    }
  }
  return result.sort();
}

export function hashDirectory(dirPath) {
  const hash = crypto.createHash("sha256");
  if (!fs.existsSync(dirPath)) {
    return "";
  }
  const files = listFilesRecursive(dirPath);
  for (const file of files) {
    hash.update(file);
    hash.update(fs.readFileSync(path.join(dirPath, file)));
  }
  return hash.digest("hex");
}

export function getSkillTargets(surface, targetRoot) {
  if (surface === "codex" || surface === "rovo") {
    return [path.join(targetRoot, ".agents", "skills")];
  }
  if (surface === "claude") {
    return [path.join(targetRoot, ".claude", "skills")];
  }
  if (surface === "both") {
    return [
      path.join(targetRoot, ".agents", "skills"),
      path.join(targetRoot, ".claude", "skills"),
    ];
  }
  return [];
}

export function replaceIfMissing(content, marker, insertion) {
  if (content.includes(insertion.trim())) {
    return content;
  }
  if (content.includes(marker)) {
    return content.replace(marker, `${marker}\n${insertion}`);
  }
  return `${content.trimEnd()}\n\n${insertion}\n`;
}

export function nowTimestamp() {
  return new Date().toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
}

export function printHeader(title, info) {
  console.log("========================================");
  console.log(` ${title}`);
  console.log("========================================");
  for (const [label, value] of info) {
    console.log(`${label.padEnd(20)} ${value}`);
  }
  console.log("");
}

export function printSection(title) {
  console.log("----------------------------------------");
  console.log(` ${title}`);
  console.log("----------------------------------------");
}

export function printPlannedChanges(manifest) {
  printSection("Planned Changes");
  for (const item of manifest.adds ?? []) {
    console.log(`ADD   ${item}`);
  }
  for (const item of manifest.patchTargets ?? []) {
    console.log(`PATCH ${item}`);
  }
}

export function printPatchDetails(planDetails) {
  if (!planDetails?.length) return;
  console.log("");
  printSection("Patch Details");
  for (const patch of planDetails) {
    console.log(`PATCH ${patch.file}`);
    console.log(`  Summary: ${patch.summary}`);
    for (const location of patch.locations ?? []) {
      console.log(`  - ${location}`);
    }
  }
}

export function printDryRunSummary(lines, footer = "<<< Upgrade planning completed. >>>") {
  console.log("");
  printSection("次にやること");
  for (const line of lines) {
    console.log(line);
  }
  console.log("");
  console.log(footer);
}

export function writeFileIfChanged(targetPath, content) {
  const original = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
  if (original === content) return false;
  ensureDir(path.dirname(targetPath));
  fs.writeFileSync(targetPath, content, "utf8");
  return true;
}

export function normalizeComparableText(value) {
  return value
    .replace(/`/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
}

export function containsComparableText(content, needle) {
  return normalizeComparableText(content).includes(normalizeComparableText(needle));
}
