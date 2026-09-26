# project-bootstrap-kit ドキュメント運用ガイド

最終更新: 2026-09-22

本ドキュメントは、`project-bootstrap-kit` 自体のドキュメント構造、運用方針、配布対象との責務分離を定義する。

## 1. 目的

- `project-bootstrap-kit` 自体の docs を、配布対象プロジェクトと同じ思想で整理する
- `boilerplate/`、`profiles/`、`scripts/`、`docs/` の責務を明確にする
- kit 自体の改善と、配布対象の改善を混同しない

## 2. ディレクトリ構成

```text
project-bootstrap-kit/
├── AGENTS.md
├── README.md
├── GETTING_STARTED.md
├── boilerplate/
├── models/
├── profiles/
├── scripts/
└── docs/
    ├── INDEX.md
    ├── DEVELOPMENT_GUIDELINE.md
    ├── DOCUMENTATION.md
    ├── WORK_LINE_ROUTING.md
    ├── SPEC/
    ├── ADR/
    ├── REF/
    ├── WORK/
    ├── history/
    └── agent_sessions/
```

## 3. 責務分離

- `docs/`
  - kit 自体の仕様、判断、運用資料
- `boilerplate/`
  - 新規プロジェクトへ展開する配布本体
  - 配布用 `AGENTS.md` と `CLAUDE.md` は、自動解釈を避けるため `_AGENTS.md` と `_CLAUDE.md` の退避名で保持する
- `profiles/`
  - Technology Profileのmetadata、guideline、実証reference、profile固有skill
- `models/`
  - Project Model catalog、manifest、Model固有asset
  - `boilerplate/` assetの選択とtarget mappingを定義する
- `scripts/`
  - kit の適用処理
- `upgrades/`
  - 既存適用先へfeature単位で反映する定義

## 4. kit 自体の docs の意味

- `docs/SPEC/`
  - `init-project.mjs` や profile 展開契約など、kit 自体の仕様
- `docs/ADR/`
  - `_AGENTS.md` 採用やTechnology Profile構成など、kit の判断記録
- `docs/REF/`
  - 適用手順、upgrade 手順、運用補足
- `docs/WORK/`
  - kit 改善タスクのEpic / MNT / OPS / ADV / SELF別作業文書
  - `feedback_inbox/` は利用プロジェクトから一般化・匿名化されたknowledge feedbackを受け入れる入口
- `docs/history/`
  - 旧構造や旧テンプレート案
- `docs/agent_sessions/`
  - kit 保守作業のセッション記録

## 5. 配布対象 docs との関係

`boilerplate/docs/` は、新規プロジェクトへ展開される docs である。  
`project-bootstrap-kit/docs/` は、kit 自体を保守するための docs であり、配布対象ではない。

同じ概念を両方で扱う場合も、自動同期や単純コピーは行わない。`docs/REF/REF_reference_change_impact_matrix.md` に従い、kit管理者と適用先プロジェクトの読者・責務に合わせて個別に反映する。

## 5.1 kit自身の作業文書

kit自身は成熟済みで独立案件が中心のため、通常運用では常設の `ROADMAP.md` と `PLAN_PHASE_CURRENT.md` を必須にしない。

- `WORK/epics/`: 新しい配布能力・高度化
- `WORK/maintenance/`: リリース済みkitの修正
- `WORK/operations/`: 配布・検証・release等の運用確認
- `WORK/advisory/`: 他プロジェクトへの相談・提供
- `WORK/self/`: kit自身の管理運用
- `WORK/feedback_inbox/`: 適用先からのfeedback受付

複数フェーズにまたがる大規模なEpicが生じた場合は、そのEpicの作業領域に専用計画を置く。

## 6. skills の扱い

### 6.1 kit 内の skills

`boilerplate/skills/` は、適用先プロジェクトへ配布する skill テンプレートである。  
これらは置いただけではkit自身のskillとして扱わない。

同じworkflowをkit自身でも使うと判断したskillは、`.agents/skills/<skill-name>/SKILL.md` に薄いrepo-local adapterを置いて個別に公開できる。adapterは対応する `boilerplate/skills/<skill-name>/SKILL.md` を実行時に読み、その手順を正本として使う。workflow本文を `.agents/skills/` へコピーせず、内容を二重管理しない。kit固有の保存先や棚卸し規則だけをadapter、root `AGENTS.md`、kit自身の `docs/` で補足する。

Git symlinkはrepositoryで管理でき、Codexもsymlinked skill directoryを探索できるが、`core.symlinks=false` のWindows checkoutでは通常ファイルとして展開される。kit自身のrepo-local skill entryはnative Windowsを含むportable checkoutを優先し、通常directoryとadapter fileを使う。

現在kit自身へ公開しているskill:

- `capture-inbox`
  - source: `boilerplate/skills/capture-inbox/`
  - repo-local entry: `.agents/skills/capture-inbox/SKILL.md`
  - kit側の保存先: `docs/WORK/inbox/`

### 6.2 SKILL.md の書式

`SKILL.md` は、少なくとも以下の YAML frontmatter を持たなければならない。

```yaml
---
name: skill-name
description: What the skill is for and when it should be used.
---
```

frontmatter がない場合、Codex は skill として解釈できない。

### 6.3 自動認識について

この kit に含まれる `boilerplate/skills/` は、あくまで配布用テンプレートであり、その場所自体はrepo-local skillの探索場所ではない。

Codexはrepository内の `.agents/skills/` を探索する。kit自身で使うskillは、明示したadapterだけを認識対象にする。skill追加後に現在のsessionへ現れない場合は、Codexを再起動して再読込する。

### 6.4 実用上の位置づけ

- `AGENTS.md`
  - どの skill を使うべきかを示す
- `docs/DOCUMENTATION.md`
  - skill の役割と正本との関係を示す
- 実際の自動認識
  - Codexでは `.agents/skills/` に公開したrepo-local skillを使用する
  - 他のAI surfaceへ自己利用を拡張する場合は、そのsurfaceの探索仕様を別途確認する

## 7. version 管理と更新運用

### 7.1 正本

- 現在 version の正本は `VERSION`
- 変更履歴の正本は `CHANGELOG.md`
- 既存プロジェクトへの update / upgrade 方針の正本は `UPGRADE_GUIDE.md`

### 7.2 更新時のルール

`project-bootstrap-kit` 自体を更新した場合は、変更内容を `CHANGELOG.md` の `Unreleased` に記録する。リリースを確定する場合は、以下を同時に更新する。

1. `VERSION`
   - 版番号を更新する
2. `CHANGELOG.md`
   - その版で何を変更したかを追記する
3. `UPGRADE_GUIDE.md`
   - 既存プロジェクトへ反映が必要な場合、その手順と注意点を追記する

versionの上げ幅とリリース手順は `docs/VERSIONING.md` を正本とする。

### 7.3 更新判断の目安

- 新しい雛形や profile を追加した
- `AGENTS.md` / `DEVELOPMENT_GUIDELINE.md` / `DOCUMENTATION.md` の挙動や意味が変わった
- `init-project.mjs` / `verify-project-init.mjs` の仕様が変わった
- 配布されるファイル構成が変わった

### 7.4 適用先での記録

新規プロジェクトへ適用した際は、適用先に `docs/BOOTSTRAP_ADOPTION.md` を生成し、少なくとも以下を記録する。

- Bootstrap Kit 名
- 適用 version
- 適用日時
- Technology Profiles
- AI surface
- `CLAUDE.md` を含む条件付き生成ファイル
- upgrade 履歴

v0.8.0以降は、機械可読な比較正本を`docs/BOOTSTRAP_STATE.json`、直前に受け入れたupstream contentを`.project-bootstrap/baselines/sha256/`へ保存する。人向け履歴、機械可読state、content baselineの責務を混同しない。
