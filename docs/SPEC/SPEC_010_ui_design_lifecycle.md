# SPEC 010: UI Design Lifecycle

## 1. 目的と適用

development Modelへ、共通UI基準、プロジェクト固有の判断を育てる文書運用、3スキルを配布する。外部デザインツール・特定model・frameworkを必須依存にしない。task-workspaceやUIのないprojectへ、UI対象・固有文書の生成を強制しない。

## 2. 配布asset

- `boilerplate/docs/UI_DESIGN_BASELINE.md`: 共通品質と設計・検証・育成の基準
- `boilerplate/skills/project-bootstrap-kit-ui-design/`: 対象ごとの要求・具体案・採否・固有文書。雛形assetsを含む
- `boilerplate/skills/project-bootstrap-kit-ui-review/`: 媒体別の実画面・操作と未確認。必要時に読むreferenceを含む
- `boilerplate/skills/project-bootstrap-kit-ui-guideline-maintenance/`: 採用判断の統合・例外・廃止・共有影響と実装整合

folder名とfrontmatterのnameを一致させ、汎用名のaliasは配布しない。既存AI surface契約に従ってCodex / Rovoは`.agents/skills`、Claudeは`.claude/skills`、bothは両方へ配置する。global skill・設定は変更しない。

development Model manifestへexact assetsを追加する。Model / state schema、Technology Profile、engine-managed path、ownershipの語彙は変更しない。

## 3. UI対象

1リポジトリ内で利用者・目的・媒体・設計判断を区別できる単位をUI対象とする。app・route・template・deviceと1対1である必要はない。

対象は安定したID、利用者・目的・媒体、source範囲と除外、参照brand・ガイドライン・SPEC・実装資産、owner・状態、検証条件を持つ。新規IDはlowercase kebab-caseとし、索引の`project`とbrand文書の`brand-`prefixを避ける。既存ID・pathは索引で明示対応し、改名を強制しない。

指定ID・path・route等から一意なら前提を示して進む。曖昧なら共通調査を行い、対象依存の変更だけ確認する。共有brand・token・componentの変更は利用先の対象集合へ波及確認する。

## 4. 共通・brand・対象の責務

- baseline: 品質の下限と手順。具体的な色・書体・構図を全projectへ固定しない
- brand: 印象、色等の意味、logo・画像・文言の共有方針
- 対象: 情報階層、構図、密度、navigation、操作、component、状態と媒体の表現

対象の参照brandを明示する。複数brandの暗黙merge・循環参照はしない。同じbrandの意味を共有しても、全媒体で同じCSS値・componentを使う必要はない。対象固有の差分・例外には理由と範囲を残す。上位の必須条件と矛盾する判断を後勝ちで確定しない。

## 5. 文書の正本

`DOCUMENTATION.md`のSPEC / ADR / REF / WORK分類を維持する。

| 内容 | 正本・保存先 |
| --- | --- |
| 共通UI基準 | `docs/UI_DESIGN_BASELINE.md` |
| project索引・共有brand | `docs/REF/REF_ui-guideline_project.md`（初回必要時に作成） |
| 対象固有の採用判断 | `docs/REF/REF_ui-guideline_<target-id>.md`。単一対象はproject文書内でもよい |
| 分割が必要なbrand | `docs/REF/REF_ui-guideline_brand-<brand-id>.md`。任意 |
| 拘束的な製品要件・受入条件 | 関連SPEC。REFへ本文を複製しない |
| 比較案・確認証跡・未採用候補 | 現在タスクの作業線のWORK |
| component / tokenの値 | 実装正本。文書は参照し、値を二重管理しない |

既存DESIGN.md等が正本なら索引から参照し、新たな同内容の正本を作らない。固有文書の完成版は通常のkit snapshotへ含めず、skill assetsの雛形から必要時だけ作る。kit更新で既存固有文書を再生成しない。

## 6. 既存workflowとの接続

`project-bootstrap`のinteraction designを入力に具体化し、聞き取り・WBSを二重化しない。文書分類は`doc-governance`、技術採否はTECHNOLOGY/ADOPTION、認可・securityは既存security workflow、受入・versionは既存正本へ戻す。

今扱わない候補は既存capture-inbox、汎用化候補は既存knowledge-feedbackを使う。別inbox・別feedback保存先・自動外部提出を追加しない。phase-transitionではUIの未反映・例外・未確認を既存の棚卸しへ接続する。

## 7. 検証と受入

web / native-mobile / html-emailの確認条件を区別する。実行環境・版・viewport / OS / client・状態・方法・証跡・問題と再確認・未確認を記録する。ブラウザ表示をnative実動作や実mail client互換性へ読み替えない。

review-onlyはsource・正本を変更しない。静的確認・撮影・視覚確認・操作試験・利用者受入を区別する。自動検査だけで規格への完全適合や美観の向上を保証しない。メール送信・deploy等は別の明示依頼がある時だけ行う。

## 8. 新規・既存・rollback

fresh bootstrapは共通基準・3スキル・雛形を配布し、project / brand / 対象別文書は自動生成しない。stateありはSPEC_006の通常scan / plan、stateなし旧adopterはSPEC_003・005の既存再adoption経路を使う。新しい専用upgrade featureは追加しない。

同名文書・skillの独自内容は保持し、差分を確認してpathごとに追加・手動統合・非採用を判断する。stateを手編集しない。kit側の雛形更新とproject文書の更新を分離する。

rollbackはcontent・state・baseline・adoption履歴を同じ退避点へ戻す。導入後に育てた固有文書は保持・退避し、無条件に削除しない。
