import fs from "node:fs";
import path from "node:path";
import {
  copyRecursive,
  ensureDir,
  getSkillTargets,
  hashDirectory,
  nowTimestamp,
} from "./upgrade-lib.mjs";

const INDEX_START = "<!-- technology-profiles:start -->";
const INDEX_END = "<!-- technology-profiles:end -->";
const ADOPTION_START = "<!-- technology-adoption:start -->";
const ADOPTION_END = "<!-- technology-adoption:end -->";

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? readText(filePath) : "";
}

function replaceManagedBlock(content, startMarker, endMarker, body) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker);
  if (start < 0 || end < start) {
    return `${content.trimEnd()}\n\n${startMarker}\n\n${body.trim()}\n\n${endMarker}\n`;
  }
  return `${content.slice(0, start + startMarker.length)}\n\n${body.trim()}\n\n${content.slice(end)}`;
}

function profileSourceDir(profilesDir, profileId) {
  return path.join(profilesDir, profileId);
}

function profileTargetDir(targetRoot, profileId) {
  return path.join(targetRoot, "docs", "TECHNOLOGY", profileId);
}

function validateProfile(profile, profileId) {
  if (profile.id !== profileId) {
    throw new Error(`Technology profile id mismatch: directory=${profileId}, metadata=${profile.id}`);
  }
  for (const field of ["name", "version", "category", "guideline"]) {
    if (!profile[field]) throw new Error(`Technology profile ${profileId} is missing ${field}`);
  }
  for (const fileName of [profile.guideline, profile.reference].filter(Boolean)) {
    if (path.basename(fileName) !== fileName) {
      throw new Error(`Technology profile ${profileId} has an invalid document path: ${fileName}`);
    }
  }
  for (const skillName of profile.skills ?? []) {
    if (!/^[a-z0-9][a-z0-9-]*$/u.test(skillName)) {
      throw new Error(`Technology profile ${profileId} has an invalid skill id: ${skillName}`);
    }
  }
  if (profile.supportedProjectModels !== undefined) {
    if (!Array.isArray(profile.supportedProjectModels) || profile.supportedProjectModels.length === 0) {
      throw new Error(`Technology profile ${profileId} has invalid supportedProjectModels`);
    }
    if (new Set(profile.supportedProjectModels).size !== profile.supportedProjectModels.length) {
      throw new Error(`Technology profile ${profileId} has duplicate supportedProjectModels`);
    }
    for (const modelId of profile.supportedProjectModels) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(modelId)) {
        throw new Error(`Technology profile ${profileId} has invalid Project Model id: ${modelId}`);
      }
    }
  }
  return profile;
}

export function assertTechnologyProfilesApplicable(profilesDir, profileIds, projectModelId) {
  for (const profileId of [...new Set(profileIds)]) {
    const profile = loadTechnologyProfile(profilesDir, profileId);
    const supported = profile.supportedProjectModels ?? ["development"];
    if (!supported.includes(projectModelId)) {
      throw new Error(`Technology profile ${profileId} is not applicable to Project Model ${projectModelId}`);
    }
  }
}

export function listTechnologyProfileIds(profilesDir) {
  if (!fs.existsSync(profilesDir)) return [];
  return fs.readdirSync(profilesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((profileId) => fs.existsSync(path.join(profilesDir, profileId, "profile.json")))
    .sort();
}

export function loadTechnologyProfile(profilesDir, profileId) {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(profileId)) {
    throw new Error(`Invalid technology profile id: ${profileId}`);
  }
  const metadataPath = path.join(profileSourceDir(profilesDir, profileId), "profile.json");
  if (!fs.existsSync(metadataPath)) {
    throw new Error(`Technology profile not found: ${profileId}`);
  }
  return validateProfile(JSON.parse(readText(metadataPath)), profileId);
}

function installedProfiles(targetRoot) {
  const technologyDir = path.join(targetRoot, "docs", "TECHNOLOGY");
  if (!fs.existsSync(technologyDir)) return [];
  const profiles = [];
  for (const entry of fs.readdirSync(technologyDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const metadataPath = path.join(technologyDir, entry.name, "profile.json");
    if (!fs.existsSync(metadataPath)) continue;
    try {
      profiles.push(validateProfile(JSON.parse(readText(metadataPath)), entry.name));
    } catch {
      // Invalid local metadata is preserved and reported by the caller's file status.
    }
  }
  return profiles.sort((left, right) => left.id.localeCompare(right.id));
}

function mergedProfiles(profilesDir, targetRoot, selectedIds) {
  const profiles = new Map(installedProfiles(targetRoot).map((profile) => [profile.id, profile]));
  for (const profileId of selectedIds) {
    if (!profiles.has(profileId)) {
      profiles.set(profileId, loadTechnologyProfile(profilesDir, profileId));
    }
  }
  return [...profiles.values()].sort((left, right) => left.id.localeCompare(right.id));
}

function renderIndexRows(profiles) {
  if (profiles.length === 0) return "選択済みprofileはない。";
  const rows = [
    "| Profile | Name | Category | Version | Guideline | Reference |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const profile of profiles) {
    const reference = profile.reference
      ? `[REFERENCE.md](./${profile.id}/REFERENCE.md)`
      : "N/A";
    rows.push(
      `| \`${profile.id}\` | ${profile.name} | ${profile.category} | ${profile.version} | [GUIDELINE.md](./${profile.id}/GUIDELINE.md) | ${reference} |`
    );
  }
  return rows.join("\n");
}

function buildIndexContent(baseContent, profiles) {
  return replaceManagedBlock(baseContent, INDEX_START, INDEX_END, renderIndexRows(profiles));
}

function adoptionSection(profile, timestamp) {
  return `### ${profile.id}

- Profile Name: ${profile.name}
- Profile Version: ${profile.version}
- Category: ${profile.category}
- Status: selected
- Added At: ${timestamp}

#### 判断の前提

- 未記入

#### 採用

- 未記入

#### 不採用 / 意図的な差異

- 未記入

#### 後続検討

- 未記入

#### 一次検証

- 未記入

#### 変動制約の確認

| 制約 | 確認日 | 一次情報 | 確認結果 | 設計への影響 | 再確認条件 |
| --- | --- | --- | --- | --- | --- |
| 未記入 | - | - | - | - | - |`;
}

function buildAdoptionContent(baseContent, profiles, timestamp) {
  const start = baseContent.indexOf(ADOPTION_START);
  const end = baseContent.indexOf(ADOPTION_END);
  if (start < 0 || end < start) {
    const initialBody = profiles.map((profile) => adoptionSection(profile, timestamp)).join("\n\n");
    return replaceManagedBlock(
      baseContent,
      ADOPTION_START,
      ADOPTION_END,
      initialBody || "選択済みprofileはない。"
    );
  }
  const currentBody = baseContent.slice(start + ADOPTION_START.length, end).trim();
  const existingSections = currentBody === "選択済みprofileはない。" ? "" : currentBody;
  const additions = profiles
    .filter((profile) => !baseContent.includes(`### ${profile.id}\n`))
    .map((profile) => adoptionSection(profile, timestamp));
  const body = [existingSections, ...additions].filter(Boolean).join("\n\n");
  return replaceManagedBlock(
    baseContent,
    ADOPTION_START,
    ADOPTION_END,
    body || "選択済みprofileはない。"
  );
}

function baseTechnologyFile(rootDir, name) {
  return path.join(rootDir, "boilerplate", "docs", "TECHNOLOGY", name);
}

function targetTechnologyFile(targetRoot, name) {
  return path.join(targetRoot, "docs", "TECHNOLOGY", name);
}

function profileDocumentEntries(profilesDir, profile) {
  const sourceDir = profileSourceDir(profilesDir, profile.id);
  const entries = [
    ["profile.json", path.join(sourceDir, "profile.json")],
    ["GUIDELINE.md", path.join(sourceDir, profile.guideline)],
  ];
  if (profile.reference) entries.push(["REFERENCE.md", path.join(sourceDir, profile.reference)]);
  return entries;
}

function documentStatus(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) return "ADD";
  return readText(sourcePath) === readText(targetPath) ? "SKIP(SAME)" : "SKIP(KEEP)";
}

function profileEntryStatuses(profilesDir, profile, targetDir) {
  const entries = profileDocumentEntries(profilesDir, profile);
  const targetMetadataPath = path.join(targetDir, "profile.json");
  let targetVersion = "";
  if (fs.existsSync(targetMetadataPath)) {
    try {
      targetVersion = JSON.parse(readText(targetMetadataPath)).version ?? "";
    } catch {
      targetVersion = "";
    }
  }

  const documentResults = entries
    .filter(([targetName]) => targetName !== "profile.json")
    .map(([targetName, sourcePath]) => {
      const targetPath = path.join(targetDir, targetName);
      let status = documentStatus(sourcePath, targetPath);
      if (status === "SKIP(KEEP)" && targetVersion && targetVersion !== profile.version) {
        const snapshotPath = path.join(
          profileSourceDir(profilesDir, profile.id),
          "history",
          targetVersion,
          targetName
        );
        if (fs.existsSync(snapshotPath) && readText(snapshotPath) === readText(targetPath)) {
          status = "UPDATE";
        }
      }
      return { targetName, sourcePath, targetPath, status };
    });

  const metadataSourcePath = path.join(profileSourceDir(profilesDir, profile.id), "profile.json");
  let metadataStatus = documentStatus(metadataSourcePath, targetMetadataPath);
  if (
    metadataStatus === "SKIP(KEEP)"
    && targetVersion
    && targetVersion !== profile.version
    && documentResults.every((item) => item.status !== "SKIP(KEEP)")
  ) {
    metadataStatus = "UPDATE";
  }
  return [
    {
      targetName: "profile.json",
      sourcePath: metadataSourcePath,
      targetPath: targetMetadataPath,
      status: metadataStatus,
    },
    ...documentResults,
  ];
}

export function getTechnologyProfileStatuses({
  rootDir,
  profilesDir,
  targetRoot,
  profileIds,
  aiSurface,
}) {
  const selectedIds = [...new Set(profileIds)];
  const profiles = selectedIds.map((profileId) => loadTechnologyProfile(profilesDir, profileId));
  const timestamp = "<apply-time>";
  const results = [];
  const profileStatuses = new Map();
  for (const profile of profiles) {
    profileStatuses.set(
      profile.id,
      profileEntryStatuses(profilesDir, profile, profileTargetDir(targetRoot, profile.id))
    );
  }

  const mergedMap = new Map(installedProfiles(targetRoot).map((profile) => [profile.id, profile]));
  for (const profile of profiles) {
    const metadataStatus = profileStatuses.get(profile.id)
      .find((item) => item.targetName === "profile.json")?.status;
    if (!mergedMap.has(profile.id) || metadataStatus === "ADD" || metadataStatus === "UPDATE") {
      mergedMap.set(profile.id, profile);
    }
  }
  const merged = [...mergedMap.values()].sort((left, right) => left.id.localeCompare(right.id));

  const indexPath = targetTechnologyFile(targetRoot, "INDEX.md");
  const indexBase = readIfExists(indexPath) || readText(baseTechnologyFile(rootDir, "INDEX.md"));
  const expectedIndex = buildIndexContent(indexBase, merged);
  results.push({
    label: "docs/TECHNOLOGY/INDEX.md",
    status: !fs.existsSync(indexPath) ? "ADD" : readText(indexPath) === expectedIndex ? "SKIP(SAME)" : "UPDATE",
  });

  const adoptionPath = targetTechnologyFile(targetRoot, "ADOPTION.md");
  const adoptionBase = readIfExists(adoptionPath) || readText(baseTechnologyFile(rootDir, "ADOPTION.md"));
  const expectedAdoption = buildAdoptionContent(adoptionBase, profiles, timestamp);
  results.push({
    label: "docs/TECHNOLOGY/ADOPTION.md",
    status: !fs.existsSync(adoptionPath) ? "ADD" : readText(adoptionPath) === expectedAdoption ? "SKIP(SAME)" : "UPDATE",
  });

  for (const profile of profiles) {
    for (const { targetName, status } of profileStatuses.get(profile.id)) {
      results.push({
        label: `docs/TECHNOLOGY/${profile.id}/${targetName}`,
        status,
      });
    }
  }

  if (selectedIds.length > 0 && !aiSurface) {
    results.push({ label: "technology profile skills", status: "WARN" });
  } else {
    for (const profile of profiles) {
      const sourceSkillsDir = path.join(profileSourceDir(profilesDir, profile.id), "skills");
      if (!fs.existsSync(sourceSkillsDir)) continue;
      for (const skillName of profile.skills ?? []) {
        const sourceSkill = path.join(sourceSkillsDir, skillName);
        for (const skillRoot of getSkillTargets(aiSurface, targetRoot)) {
          const targetSkill = path.join(skillRoot, skillName);
          results.push({
            label: `${path.relative(targetRoot, targetSkill)}/`,
            status: !fs.existsSync(targetSkill)
              ? "ADD"
              : hashDirectory(sourceSkill) === hashDirectory(targetSkill)
                ? "SKIP(SAME)"
                : "UPDATE",
          });
        }
      }
    }
  }
  return results;
}

export function applyTechnologyProfiles({
  rootDir,
  profilesDir,
  targetRoot,
  profileIds,
  aiSurface,
  appliedAt,
}) {
  const selectedIds = [...new Set(profileIds)];
  const profiles = selectedIds.map((profileId) => loadTechnologyProfile(profilesDir, profileId));
  const timestamp = appliedAt || nowTimestamp();
  const results = [];
  const addedBaseFiles = new Set();

  for (const name of ["INDEX.md", "ADOPTION.md"]) {
    const sourcePath = baseTechnologyFile(rootDir, name);
    const targetPath = targetTechnologyFile(targetRoot, name);
    if (!fs.existsSync(targetPath)) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
      addedBaseFiles.add(name);
    }
  }

  for (const profile of profiles) {
    const targetDir = profileTargetDir(targetRoot, profile.id);
    ensureDir(targetDir);
    for (const { targetName, sourcePath, targetPath, status } of profileEntryStatuses(profilesDir, profile, targetDir)) {
      if (status === "ADD" || status === "UPDATE") fs.copyFileSync(sourcePath, targetPath);
      results.push({ label: `docs/TECHNOLOGY/${profile.id}/${targetName}`, status });
    }

    const sourceSkillsDir = path.join(profileSourceDir(profilesDir, profile.id), "skills");
    if (fs.existsSync(sourceSkillsDir) && aiSurface) {
      for (const skillName of profile.skills ?? []) {
        const sourceSkill = path.join(sourceSkillsDir, skillName);
        for (const skillRoot of getSkillTargets(aiSurface, targetRoot)) {
          const targetSkill = path.join(skillRoot, skillName);
          const status = !fs.existsSync(targetSkill)
            ? "ADD"
            : hashDirectory(sourceSkill) === hashDirectory(targetSkill)
              ? "SKIP(SAME)"
              : "UPDATE";
          if (status === "ADD" || status === "UPDATE") {
            if (fs.existsSync(targetSkill)) fs.rmSync(targetSkill, { recursive: true, force: true });
            ensureDir(targetSkill);
            copyRecursive(sourceSkill, targetSkill);
          }
          results.push({ label: `${path.relative(targetRoot, targetSkill)}/`, status });
        }
      }
    }
  }

  const merged = mergedProfiles(profilesDir, targetRoot, selectedIds);
  const indexPath = targetTechnologyFile(targetRoot, "INDEX.md");
  const currentIndex = readText(indexPath);
  const nextIndex = buildIndexContent(currentIndex, merged);
  if (nextIndex !== currentIndex) {
    fs.writeFileSync(indexPath, nextIndex, "utf8");
  }
  results.unshift({
    label: "docs/TECHNOLOGY/INDEX.md",
    status: addedBaseFiles.has("INDEX.md")
      ? "ADD"
      : nextIndex !== currentIndex ? "UPDATE" : "SKIP(SAME)",
  });

  const adoptionPath = targetTechnologyFile(targetRoot, "ADOPTION.md");
  const currentAdoption = readText(adoptionPath);
  const nextAdoption = buildAdoptionContent(currentAdoption, profiles, timestamp);
  if (nextAdoption !== currentAdoption) {
    fs.writeFileSync(adoptionPath, nextAdoption, "utf8");
  }
  results.splice(1, 0, {
    label: "docs/TECHNOLOGY/ADOPTION.md",
    status: addedBaseFiles.has("ADOPTION.md")
      ? "ADD"
      : nextAdoption !== currentAdoption ? "UPDATE" : "SKIP(SAME)",
  });

  return results;
}
