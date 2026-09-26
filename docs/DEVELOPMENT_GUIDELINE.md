# project-bootstrap-kit 開発ガイドライン

最終更新: 2026-09-19

## 1. 目的

本リポジトリは、新規プロジェクトへ再利用可能な bootstrap kit を管理する。ここで扱うのは、配布対象プロジェクトの内容ではなく、配布骨格そのものの設計と運用である。

## 2. 文書体系

- `docs/SPEC/`
  - kit 自体の仕様
- `docs/ADR/`
  - kit 自体の重要な判断
- `docs/REF/`
  - kit の運用・補足資料
- `docs/WORK/`
  - kit 改善タスクの作業文書
- `docs/history/`
  - 旧案、過去構造
- `docs/agent_sessions/`
  - セッション記録

- `docs/WORK_LINE_ROUTING.md`
  - 成熟済みkitのEpic / MNT / OPS / ADV / SELF判別の正本

補足:
- kit 自体の文書運用ルールは `docs/DOCUMENTATION.md` を正本とする
- kit 自体の version 管理ルールは `docs/VERSIONING.md` を正本とする

## 3. bootstrap kit の構成原則

- 配布対象は必ず `boilerplate/` に置く
- runtime、integration、storage、framework、tooling固有の差分は必ず `profiles/<id>/` に置く
- kit 自体の運用資料は `docs/` に置く
- 配布用 `AGENTS.md` は `_AGENTS.md` として保持し、展開時に `AGENTS.md` へ変換する
- 配布用 `CLAUDE.md` は `_CLAUDE.md` として保持し、`--ai-surface claude|both` の場合だけ展開時に `CLAUDE.md` へ変換する
- `CLAUDE.md` は `AGENTS.md` を読み込む入口に限定し、行動規範を重複定義しない

## 4. Technology Profileの原則

- `--technology-profile` は任意かつ複数回指定できる
- 未指定時も `docs/TECHNOLOGY/INDEX.md` と `ADOPTION.md` を展開し、WORK/0.1中の後付けを可能にする
- profileは `profile.json`、`GUIDELINE.md`、任意の `REFERENCE.md` と `skills/` で構成する
- profile追加処理は `init-project.mjs` と `technology-profiles` featureで共通ライブラリを使用する
- 変動するplatform仕様は公式一次情報、プロジェクト固有の採否は `ADOPTION.md` を正本とする
- 新規CLIは `--technology-profile` に統一し、旧 `--platform-profile` は受け付けない

## 5. Project Model assetの原則

- `models/catalog.json`はProject Model一覧とdefaultの正本とする
- `models/<id>/model.json`はModelが選択するasset、required path、AI surface、Technology Profile policyの正本とする
- 現行`boilerplate/`はModel manifestが参照するasset libraryとして維持する
- Model manifestにないassetを暗黙に展開しない
- 同一targetへの暗黙上書きを許可しない
- Project ModelとTechnology Profile、AI surfaceを別軸として扱う

## 6. kit 改善時の確認項目

変更開始時と終了前に `docs/REF/REF_reference_change_impact_matrix.md` を使い、Self-management、New distribution、Existing adopters、Technology-specific distribution、Distribution engine、Contract and referenceの各面を判定する。

- 配布対象へ持ち込むべき変更か
- kit 自体の内部資料だけで完結すべき変更か
- profile 差分として表現すべきか
- 複数profileを合成できるか、排他的な前提を持ち込んでいないか
- profileの実証知識と変動する公式仕様を分離しているか
- 既存プロジェクトの `ADOPTION.md` とknowledge feedbackへ影響するか
- feedbackを取り込む場合、機密情報除去、汎用性、成立条件、反例、公式一次情報を確認したか
- feedback受領時に `scripts/verify-feedback-export.mjs --mode final` を再実行し、匿名化、再現性、kit targetの実在、ユーザー確認済みと、人間による残存識別riskを確認したか
- profileへ反映する場合、profile versionと既存プロジェクト向けupgrade方法を更新したか
- profile version更新時に、直前versionの文書snapshotを `profiles/<id>/history/<version>/` へ残したか
- 共通コアの変更か
- skill の更新が必要か
- 利用者に意味のある変更は、version更新を待たず同じ変更内で `CHANGELOG.md` の `Unreleased` へ記録したか
- リリースを確定する場合、`VERSION`、`CHANGELOG.md`、`UPGRADE_GUIDE.md` のversionが一致しているか

### 6.1 成熟済みkitの案件管理

- 通常の機能追加、修正、調査、助言、自己管理は、継続的なフェーズWBSではなく案件単位で管理する
- 新能力・高度化はEpic、リリース済みkitの修正はMNT、運用確認はOPS、他プロジェクトへの助言はADV、kit自身の管理運用はSELFとする
- SELFに配布能力の変更を混在させない。必要な場合はEpicまたはMNTを別途起票する
- 複数フェーズにまたがる大規模な構想が発生した場合だけ、対象Epic内に専用計画を追加する
- 適用先からのknowledge feedbackは受付キューで検査・採否した後、適切な作業線へ昇格する

### 6.2 検証の使い分け

- `verify-project-init.mjs` は新規適用先の生成直後に `init-project.mjs` から自動実行する
- `verify-project-init.mjs` をkit自身の汚染検査には使用しない
- `verify-kit-repository.mjs` はkit自身の変更完了前、commit前、release前に実行する
- 配布内容または配布機構を変更した場合は、自己検証に加えてfresh bootstrapと対象upgradeの検証を行う

## 7. upgrade feature 実装方針

`upgrade-project.mjs` に新しい feature を追加する際は、可能な限り dry-run で既存状態との差分を判定できるように実装する。

### 7.1 基本原則

- dry-run は apply 前の計画確認だけでなく、既存状態との差分確認にも使えることを目指す
- 既に同等状態であれば `SKIP(SAME)` を返せるようにする
- 独自編集が強く自動判定しづらい場合は `WARN` を返せるようにする
- `ADD / UPDATE / SKIP(SAME) / WARN` のいずれかで読み取れることを推奨する
- `--diff` 指定時に、一時コピーへ apply した想定差分を生成できることを前提にする

### 7.2 実装時の観点

- 何を比較対象にするか
- 既存状態と期待状態をどう判定するか
- apply 時に安全に反映できるか
- apply は対象プロジェクト配下へのファイル操作に閉じ、外部サービス操作や git 操作を含めない
- ローカル固有の差分を誤って消さないか
- テキスト比較を行う場合は、Markdown 記法や軽微な空白差異だけで誤判定しないようにする

詳細な契約は `docs/SPEC/SPEC_003_upgrade_feature_contract.md` を参照する。
