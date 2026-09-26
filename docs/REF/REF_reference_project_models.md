# Project Models Reference

最終更新: 2026-09-24

本書はProject Modelのsource layout、content map、CLI、compositionを説明する。規範は`SPEC_008_project_model_contract.md`を正本とする。

## 1. Source layout

```text
boilerplate/                     existing asset library
models/
├── catalog.json
├── development/model.json
└── task-workspace/
    ├── model.json
    └── files/
```

既存boilerplate 54 pathsを一括移動せず、Model manifestがexact source / targetを選ぶ。

## 2. Common behavior

- purpose / non-goal
- source of truth
- work status / review / completion
- change / commit / external approval
- secret / private information
- session / handoff
- capture / feedback
- rollback

Behaviorが共通でも、Modelごとにfile表現を変えられる。

## 3. Content map

| Current asset | Development | task-workspace |
| --- | --- | --- |
| `.gitignore` | direct | direct候補 |
| `_CLAUDE.md` | conditional | conditional |
| `_AGENTS.md` | development版 | task固有版 |
| ChangeLog / Versioning | required | defaultなし |
| ADR / REF index | required | optional / common候補 |
| Development / Coding | required | defaultなし |
| Documentation / Index | development版 | task固有版 |
| ROADMAP / PLAN | required | defaultなし |
| Technology | required structure | defaultなし |
| WORK/0.1 | required | defaultなし |
| session docs | development版 | handoff / session index版 |
| capture-inbox | supported | supported |
| phase / maintenance / operations skills | supported | defaultなし |

## 4. CLI examples

Development:

```bash
node scripts/init-project.mjs \
  --target /path/to/repo \
  --project-name "Example Development" \
  --project-slug example \
  --product-name "Example Product" \
  --project-model development \
  --ai-surface codex
```

Task-workspace:

```bash
node scripts/init-project.mjs \
  --target /path/to/workspace \
  --project-name "調査ワークスペース" \
  --project-slug research-workspace \
  --project-model task-workspace \
  --ai-surface codex
```

Developmentのproduct-nameは任意。省略時project-nameを使用する。

## 5. Composition

```text
Model ownership
  -> Profile applicability / merge
  -> AI surface placement
  -> Engine metadata
  -> Final collision / required path verification
```

後勝ち上書きではない。同一targetは同一bytesまたは明示mergeがなければBLOCKED。

## 6. Profile applicability

- supportedProjectModels fieldあり: exact判定
- fieldなしlegacy: development-only
- task-workspace: no profileがdefault
- unsupported combination: error

## 7. Task-workspace structure

```text
AGENTS.md
README.md
SESSION_HANDOFF.md
context/CONTEXT.md
context/MASTER.md
outputs/README.md
sessions/SESSION_INDEX.md
sessions/session_template.md
docs/INDEX.md
docs/DOCUMENTATION.md
```

ADR / REF / inbox / historyはoptional候補。

## 8. Model status

- stable: compatibilityとmigrationをrelease contractとして扱う
- preview: 構造・生成・fixtureを提供するがstable同等保証はしない
- deprecated: new selectionを拒否しmigration guidanceを提示する
