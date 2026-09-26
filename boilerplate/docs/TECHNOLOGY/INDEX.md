# Technology Profiles Index

- Status: Active
- Scope: Global
- Source of Truth: Yes
- Owner: Engineering
- Owner WBS: 0.1
- Promotion Target: Retain-in-Work
- Supersedes: N/A

本書は、このプロジェクトで選択したTechnology Profileと参照先の索引である。

## 1. 選択済みprofile

<!-- technology-profiles:start -->

選択済みprofileはない。

<!-- technology-profiles:end -->

## 2. 参照方法

1. 設計・実装・レビュー対象に関係するprofileを本書で確認する
2. `docs/TECHNOLOGY/ADOPTION.md` でプロジェクト固有の採否と差異を確認する
3. 対象profileの `GUIDELINE.md` を読む
4. 必要な場合だけ `REFERENCE.md` を読む
5. limits、pricing、API、設定仕様など変動する事実は公式一次情報で再確認する

## 3. 優先順位

- 変動するplatform仕様と利用可否は、利用時点の公式一次情報を優先する
- プロジェクト固有の採否と許容リスクは `ADOPTION.md`、`SPEC`、`ADR` を正本とする
- profileの `GUIDELINE.md` は、選択した技術に関する共通の実装原則として扱う
- `REFERENCE.md` は経験知と判断材料であり、全項目を機械的に採用しない

## 4. profile追加

技術がWORK/0.1の途中または完了時に確定した場合は、project-bootstrap-kit側で次をdry-runする。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --technology-profile <profile-id> \
  --ai-surface <codex|rovo|claude|both> \
  --diff
```
