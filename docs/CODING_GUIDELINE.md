# project-bootstrap-kit コーディングガイドライン

最終更新: 2026-04-26

本ドキュメントは、`project-bootstrap-kit` 自体の実装時に守るべきコーディング上の意味論的な規約を定義する。

## 1. 目的

- kit 自体のスクリプトやテンプレート実装を、保守しやすく壊れにくいものにする
- 新しい feature 実装時に、意味論的な品質基準を揃える

## 2. 基本原則

- 暗黙のフォールバックより、明示的な設定と検証を優先する
- 共通ランナーと feature ハンドラの責務を分離する
- dry-run と apply の責務を混ぜない
- ローカル固有資産を誤って消さない

## 3. 設定値とフォールバック

- 必須引数は未指定時に即座に失敗させる
- 危険なデフォルト値をコード内に埋め込まない
- 既存状態との差分判定では、Markdown 記法や軽微な空白差だけで誤判定しない

## 4. feature 実装

- 新しい feature は `manifest.json` と `handler.mjs` をセットで持つ
- `handler.mjs` は `dryRun(ctx)` と `apply(ctx)` を公開する
- 可能な限り dry-run で `ADD / UPDATE / SKIP(SAME) / WARN` を返せるようにする

## 5. 参照

- 配布先プロジェクト向けの一般規約は `boilerplate/docs/CODING_GUIDELINE.md`
- upgrade 契約は `docs/SPEC/SPEC_003_upgrade_feature_contract.md`
