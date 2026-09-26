#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { listProjectModelIds, loadProjectModelCatalog } from "./project-model-lib.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

try {
  const catalog = loadProjectModelCatalog(rootDir);
  console.log(`[OK] Project Model catalog schema ${catalog.schemaVersion}`);
  console.log(`[OK] Project Model default ${catalog.defaultModelId}`);
  for (const modelId of listProjectModelIds(catalog)) {
    const model = catalog.models.find((entry) => entry.id === modelId);
    console.log(`[OK] Project Model ${model.id} ${model.version} ${model.status} assets=${model.assets.length}`);
  }
} catch (error) {
  console.error(`[FAIL] ${error.message}`);
  process.exit(1);
}
