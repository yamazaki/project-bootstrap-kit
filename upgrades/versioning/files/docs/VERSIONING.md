# バージョニングガイド

最終更新: <DATE>

本ドキュメントは、このプロジェクトにおける version 管理の方針、更新判断、更新手順を定義する正本である。

## 1. 目的

- モノレポ内の複数アプリや複数パッケージの version 管理を一貫させる
- semantic version と build number の役割を分離する
- version をいつ、どこで、誰が、どう更新するかを明確にする
- 変更内容を `CHANGELOG.md` に継続して残し、リリース内容を追跡可能にする

## 2. version の種類

このプロジェクトでは、version を少なくとも次の単位で考える。

- **Repository / Project version**
  - リポジトリ全体の節目として扱う version
- **Deployable app version**
  - デプロイ単位のアプリケーション version
- **Package version**
  - `package.json`, `pyproject.toml`, `VERSION` ファイルなどで持つパッケージ単位の version
- **Build number**
  - build ごとに増える識別子

## 3. 基本原則

- モノレポ全体で 1 つの version を強制しない
- デプロイ単位ごとに version を持つ
- semantic version と build number は別物として扱う
- semantic version は意味のある節目で更新する
- build number は build ごとに更新してよい

### 3.1 リリース境界

- 通常の開発コミットや WBS タスク完了ごとに semantic version を上げる必要はない
- リリース対象となる変更単位が確定し、受入確認を終えて配布・デプロイ可能になった時点で semantic version を更新する
- 開発中の変更は、ルート `CHANGELOG.md` の `Unreleased` へ蓄積する
- version 更新を見送る場合は、build number の更新だけでよいのか、未リリース変更として継続するのかを明確にする

## 4. version の保持場所

version 情報の保持場所は、実装技術、配布単位、実行環境によって変わる。  
そのため、本ガイドでは一律にリポジトリ直下の `VERSION`, `UPGRADE_GUIDE.md` を必須とはしない。`CHANGELOG.md` はリポジトリ直下に置き、プロジェクト全体の変更履歴の入口とする。

代わりに、各プロジェクトは以下を明確にする。

- semantic version の正本がどこか
- build number の正本がどこか
- deployable unit / packageごとの詳細なchangelogを別に持つか
- update / upgrade 手順をどこに記録するか
- 未リリース変更をどこに記録するか
- release note と migration 情報をどこに記録するか
- version 更新を確定するタイミングと承認者

プロジェクト開始時に、これらを `docs/VERSIONING.md` の中で明示すること。

### 4.1 Node.js / npm

- `package.json#version` を正本とする

### 4.2 Python

- `pyproject.toml` または `VERSION` ファイルを正本とする

### 4.3 package metadata を持たない構成

- `VERSION` ファイルを正本とする

### 4.3.1 補足

- `UPGRADE_GUIDE.md` を持つかどうかは、配布形態と運用方式による
- 単一アプリでは、ルート `CHANGELOG.md` を変更履歴の正本とする
- モノレポでは、ルート `CHANGELOG.md` を全体の入口とし、必要に応じてアプリ・package単位の詳細changelogへリンクする
- 外部プラットフォーム依存の構成では、別の管理方法を採用してもよい

### 4.4 ChangeLog の記録ルール

- 利用者、運用者、開発者が知る必要のある機能追加、仕様変更、不具合修正、廃止、互換性影響を記録する
- commit一覧や作業ログの転記ではなく、変更の結果と影響を簡潔に記載する
- 通常の開発中は `Unreleased` に追記し、原則として `Added / Changed / Fixed / Removed` に分類する
- 変更が複数のdeployable unit / packageに関係する場合は、対象が判別できるように記載する
- 互換性を壊す変更には、影響と移行方法、またはupgrade / migration文書への参照を付ける
- typo修正や内部整理など、外部から見た振る舞い・運用・開発方法に影響しない変更は省略してよい
- `Unreleased` の同じ変更を重複して記録しない

### 4.5 UI 表示用 build 情報

- semantic version と build number を分けて表示する
- build 時に自動生成される情報がある場合、semantic version と混同しない

## 5. semantic version の判断基準

### 5.1 patch

- バグ修正
- 軽微な改善
- 見た目調整
- 小さな導線修正

### 5.2 minor

- 新機能追加
- 新しい画面追加
- 新しい操作追加
- 情報設計の拡張

### 5.3 major

- 互換性を崩す変更
- 大規模な構成変更
- ユーザーの操作理解や API 契約を大きく変える変更

### 5.4 `0.x` の扱い

- 初期開発期間に `0.x` を使う場合は、minorで非互換変更を許容するかをプロジェクト内で定義する
- 非互換変更をminorで扱う場合も、影響範囲と移行方法をrelease noteまたはupgrade文書へ記録する
- 安定した公開契約を持つ段階では、互換性を壊す変更をmajorとして扱う

## 6. 誰が version を更新するか

- 原則として、リリース対象の変更をまとめる担当者が判断する
- AI エージェントは、更新対象と更新幅を提案できる
- version の確定更新は、承認された変更の一部として行う

## 7. 更新手順

### 7.1 更新対象を特定する

- どの app / package / deployable unit の version を上げるべきかを判断する

### 7.2 更新幅を判断する

- `patch`, `minor`, `major` のいずれかを選ぶ

### 7.3 version を更新する

- Node.js では `package.json#version`
- Python では `pyproject.toml` または `VERSION`
- metadata を持たない場合は専用 `VERSION`

同じ変更で `CHANGELOG.md` を更新し、version正本だけを単独で更新しない。

### 7.4 更新後に確認する

- build が通ること
- テストが通ること
- version 表示箇所に反映されること
- build number と semantic version が混同されていないこと

### 7.5 リリース確定手順

1. リリース対象となる deployable unit / package を特定する
2. 未リリース変更の一覧と、実際の変更内容を照合する
3. `patch / minor / major` の上げ幅を判断する
4. 各対象のversion正本を更新する
5. `CHANGELOG.md` の `Unreleased` を `vX.Y.Z - YYYY-MM-DD` の節へ移し、空の `Unreleased` を先頭に残す
6. 互換性影響がある場合は、upgrade / migration手順を更新する
7. build、test、必要なE2E、成果物、version表示を確認する
8. `CHANGELOG.md` のversion、version正本、Git tag、release名が一致していることを確認する

## 8. モノレポにおける考え方

- 別々にデプロイ・配布できるアプリケーションは、それぞれ別versionでよい
- 原則として、実際に変更された deployable unit / package のversionだけを更新する
- 共有packageや共通契約の変更が複数アプリへ影響する場合は、依存する各単位の更新要否を確認する
- 同時リリースでも、必ず同一 version にする必要はない
- ただし、スイートとして束ねて説明する必要がある場合は、release note や ROADMAP などで関係を説明する
- repository / project versionは、複数の配布単位を一つの製品releaseとして扱う場合に限って採用を検討する

## 9. ドキュメントとの関係

- version 更新判断に迷う場合は、`SPEC`, `ADR`, `ROADMAP`, `PLAN_PHASE_CURRENT` を見て変更の意味を確認する
- version正本、未リリース変更、release履歴、release note、upgrade / migration手順の整合を保つ
- ChangeLogは現在仕様の正本や作業記録の代替にせず、リリースごとの変更結果を追跡する履歴として扱う
- build number の自動更新ルールがある場合は、それを semantic version の代替にしない

## 10. AI エージェントへの指示

- version が関係する変更では、`docs/VERSIONING.md` を確認する
- 意味のある変更を完了する際は、`CHANGELOG.md` の `Unreleased` への追記要否を確認する
- 実装完了やWBS完了だけを理由にversionを確定更新しない
- リリースを確定する際は、変更されたdeployable unit、`CHANGELOG.md`、version正本、migration要否を確認する
- 更新対象と更新幅が曖昧な場合は、勝手に決めずに提案として示す
- build number と semantic version を混同しない
