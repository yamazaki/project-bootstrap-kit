# project-bootstrap-kit バージョニングガイド

最終更新: 2026-09-19

本ドキュメントは、`project-bootstrap-kit` 自体の version 管理と、配布先プロジェクトへ提供する versioning 方針の関係を定義する。

## 1. 目的

- kit 自体の version 管理を明確にする
- 配布先プロジェクトで扱う versioning ルールの正本を定義する
- `VERSION`, `CHANGELOG.md`, `UPGRADE_GUIDE.md` の更新手順を明文化する

## 2. kit 自体の version 管理

### 2.1 正本

- 現在 version: `VERSION`
- 変更履歴: `CHANGELOG.md`
- 既存プロジェクトへの反映方針: `UPGRADE_GUIDE.md`

### 2.2 更新時に必ず確認すること

以下のいずれかに該当する変更をリリースする場合は、version を更新する。

- `boilerplate/` の構成や内容を変更した
- `profiles/` の platform guideline を変更した
- `scripts/init-project.mjs` / `scripts/verify-project-init.mjs` の仕様を変更した
- `AGENTS.md`, `DEVELOPMENT_GUIDELINE.md`, `DOCUMENTATION.md`, `VERSIONING.md` の意味や運用を変えた

開発途中の意味のある変更は `CHANGELOG.md` の `Unreleased` に蓄積する。配布可能な状態としてリリースを確定する際は、`Unreleased` の内容をversion付きの節へ移し、`VERSION` と一致させる。

`CHANGELOG.md` はcommit一覧ではなく、配布先とkit管理者に意味のある変更の履歴とする。変更は次の2区分へ記録する。

- `Distribution`: `boilerplate/`、profile、skill、初期化・upgrade契約、配布先の運用ルールなど、適用先へ影響する変更
- `Self-management`: root `AGENTS.md`、kit自身の文書運用、自己検証など、配布能力を変えない管理運用上の変更

両方に影響する変更は、それぞれにとって観測可能な結果を分けて記録する。意味のある変更はversion更新を待たず同じ変更内で `Unreleased` の該当区分へ追記する。内部整理や誤記修正など、利用者にもkit管理者にも影響がない変更は省略してよい。

### 2.3 version の上げ幅

本kitは Semantic Versioningの `MAJOR.MINOR.PATCH` を使用する。

- `PATCH`
  - 配布契約を変えない不具合修正
  - 文書の誤記、説明補足、出力表示の軽微な修正
  - 既存利用者が新しい対応や移行を必要としない変更
  - 後方互換な自己管理・自己検証の改善だけをreleaseする変更
- `MINOR`
  - 新しいboilerplate文書、profile、skill、upgrade featureの追加
  - `init-project.mjs` や `verify-project-init.mjs` の後方互換な機能追加
  - 既存プロジェクト向けの移行手段を提供した配布構成・運用契約の変更
  - kit自身の管理契約を大きく追加・再編し、保守担当者の運用が変わる変更
- `MAJOR`
  - 安定版以降における、既存の初期化引数、配布構成、文書契約、upgrade契約の非互換変更
  - 自動移行または明確な移行手順を提供できない破壊的変更

`0.x` の開発期間中は、配布構成や契約の見直しを `MINOR` で表現できる。ただし、既存プロジェクトへの影響と移行方法を `UPGRADE_GUIDE.md` に必ず記録する。

### 2.4 更新時の手順

1. 変更内容を確認する
2. version の上げ幅を判断する
3. `VERSION` を更新する
4. `CHANGELOG.md` の `Unreleased` にある `Distribution` と `Self-management` を `vX.Y.Z - YYYY-MM-DD` の節へ移し、両区分を持つ空の `Unreleased` を先頭に残す
5. 既存プロジェクトに反映判断が必要な場合は `UPGRADE_GUIDE.md` に同じversionの節を作る
6. 初期化、検証、該当upgrade featureを確認する
7. `VERSION`、`CHANGELOG.md`、`UPGRADE_GUIDE.md` のversionが一致していることを確認する

自己管理だけのreleaseで既存プロジェクトへの反映事項がない場合も、`UPGRADE_GUIDE.md` に「配布先への対応なし」と記録してversionの対応関係を維持する。

リリース後の変更は、次のversionを先に決めず `Unreleased` へ追記する。同じ変更を複数の箇条書きへ重複記録せず、変更の結果と既存利用者への影響が分かる表現にする。

## 3. 配布先プロジェクトの versioning 方針

配布先プロジェクトでは、詳細な version 管理ルールの正本は `docs/VERSIONING.md` とする。

## 4. kit と配布先の関係

- kit の version は、配布先に生成される `docs/BOOTSTRAP_ADOPTION.md` に記録される
- `docs/BOOTSTRAP_ADOPTION.md` の `Version` は初回bootstrap時のkit versionであり、feature単位のupgradeでは書き換えない
- v0.8.0以降の現在受入kit version/commitは`docs/BOOTSTRAP_STATE.json`を機械可読な正本とする
- 将来upgradeはstateと`.project-bootstrap/baselines/`のU0/U1/L0/L1比較を使用する
- 適用済みfeatureは `Upgrade History` と `Upgrade Added Files` で追跡する
- feature単位のupgradeはkit全体の適用を意味しないため、既存プロジェクトを自動的に最新kit version扱いにしない
- 配布先プロジェクトの app version や package version は、kit の version とは別に管理する
