---
name: version-governance
description: Use when deciding whether versions should be updated, which deployable unit or package version should change, what semantic version level applies, and how to update version-related files consistently.
---

# version-governance

## 目的

version 更新判断、更新対象の切り分け、更新手順の確認を再現しやすくする。

## 参照先

- `docs/VERSIONING.md`
- `CHANGELOG.md`
- 必要に応じて `docs/ROADMAP.md`, `docs/PLAN_PHASE_CURRENT.md`, `docs/SPEC/`, `docs/ADR/`

## 判断手順

1. 変更対象がどの deployable unit / package かを特定する
2. 通常の開発変更か、配布・デプロイ可能なリリース境界かを判断する
3. semantic version を上げるべきか、build number だけでよいかを判断する
4. 上げる場合は `patch / minor / major` のいずれかを選ぶ
5. version正本、`CHANGELOG.md`、migration文書の更新対象を列挙する
6. `Unreleased` の内容と実際の変更が一致するか確認する
7. 更新後に build / test / E2E / 表示確認が必要かを整理する

## 判断基準

- `patch`
  - バグ修正、軽微改善、見た目調整
- `minor`
  - 新機能追加、新しい画面や操作の追加
- `major`
  - 互換性破壊、大規模変更、理解モデルの変更

通常のコミットやWBSタスク完了だけを理由にsemantic versionを上げない。リリース対象が確定し、受入確認を終えた時点で更新する。

## ChangeLog

- 利用者、運用者、開発者に意味のある変更は、version更新前でもルート `CHANGELOG.md` の `Unreleased` に記録する
- commit一覧ではなく、変更の結果と影響を簡潔に記載する
- リリース時は `Unreleased` を日付付きversion節へ移し、空の `Unreleased` を先頭に残す
- 互換性を壊す変更には、影響と移行方法またはmigration文書への参照を付ける

## モノレポ前提

- モノレポ全体で 1 つの version を強制しない
- デプロイ単位ごとに version を持つ
- 原則として変更された deployable unit / package だけを更新する
- 共有packageや共通契約の変更では、依存する各単位への影響を確認する
- build number と semantic version を混同しない

## 完了確認

- version正本が更新されている
- `CHANGELOG.md` の未リリース変更が日付付きversion節へ移されている
- 空の `Unreleased` が先頭に残っている
- 互換性影響がある場合はupgrade / migration手順が更新されている
- build、test、必要なE2E、version表示を確認している
- version確定についてユーザーの承認を得ている
