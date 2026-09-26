# ドキュメント運用ガイド

最終更新: 2026-04-04

本ドキュメントは、このプロジェクトにおけるドキュメントの管理思想、配置規則、命名規則、昇格ルール、セッション運用を定義する正本である。  
開発全体の進め方は `docs/DEVELOPMENT_GUIDELINE.md`、version管理とルート `CHANGELOG.md` の運用は `docs/VERSIONING.md`、採用技術の索引と固有制約は `docs/TECHNOLOGY/` を参照する。

## 1. 目的

- 増殖しやすいドキュメントを、寿命と責務で整理する
- タスクごとの短期文書と、将来も再利用する長期文書を分離する
- アイデア起票から実装、運用、振り返りまでの文書ライフサイクルを標準化する
- AI エージェントと人間が同じ判断基準で文書を扱えるようにする

## 2. 基本思想

### 2.1 文書は「種類」ではなく「寿命」と「拘束力」で分類する

同じ Runbook や UI 文書でも、将来ずっと参照するものと、単一タスクの作業用で終わるものがある。  
したがって、文書は名称だけで分類せず、次の観点で分類する。

- 仕様として拘束力があるか
- 重要な意思決定か
- 複数 WBS / 将来フェーズでも再利用するか
- 単一マイルストーンの遂行に閉じるか
- 旧案や履歴として残すものか

### 2.2 文書もセッション分割の思想で管理する

本プロジェクトは、長時間の単一セッションに依存せず、タスク単位に区切って進める。  
ドキュメントも同様に、短寿命の作業文書を `WORK` に閉じ込め、安定した内容のみを `REF` や `SPEC` に昇格させる。

## 3. ディレクトリ構成

`docs/` 配下は、原則として次の構成を取る。

```text
docs/
├── INDEX.md
├── DEVELOPMENT_GUIDELINE.md
├── DOCUMENTATION.md
├── VERSIONING.md
├── TECHNOLOGY/
│   ├── INDEX.md                   # 選択済みprofileの索引
│   ├── ADOPTION.md                # プロジェクト固有の採否・例外・一次検証
│   └── <profile-id>/
│       ├── profile.json
│       ├── GUIDELINE.md
│       └── REFERENCE.md           # profileに存在する場合
├── ROADMAP.md
├── PLAN_PHASE_CURRENT.md
├── SPEC/
├── ADR/
├── REF/
├── WORK_LINE_ROUTING.md
├── WORK/
│   ├── 0.1/
│   ├── inbox/
│   ├── maintenance/
│   ├── operations/
│   ├── advisory/
│   └── x.y/
├── history/
└── agent_sessions/
```

### 3.1 各ディレクトリの役割

- `SPEC/`
  - 仕様の Single Source of Truth
- `ADR/`
  - 重要な設計判断の記録
- `REF/`
  - 複数 WBS や将来フェーズでも再利用する参照資産
- `WORK/0.1/`
  - 新規プロジェクト開始時の初期構想
- `WORK/inbox/`
  - 作業中に発見したアイデア、課題、疑問を、分類前の気づきとして一時捕捉する場所
- `WORK/x.y/`
  - 特定マイルストーン `x.y` に閉じる作業文書
- `WORK_LINE_ROUTING.md`
  - Epic / MNT / OPS / ADVの判別、遷移、共通記録規則の正本
- `WORK/maintenance/`, `WORK/operations/`, `WORK/advisory/`
  - リリース済み成果物への後続作業、運用上の確認・調査、実装・運用経験を活用する助言に閉じる索引と件別記録
- `TECHNOLOGY/`
  - 複数の採用技術に対するprofile、プロジェクト固有の採否、実証知識への導線
- `history/`
  - 旧案、比較結果、生成過程、廃止済み文書
- `agent_sessions/`
  - active rootには現行フェーズとフェーズ間作業のsession、および最新の再開情報を置く
  - 正式完了したフェーズのsessionは、設定済みsession root配下の`phaseN/`等のフェーズ別archiveへ移す
  - mature adopterでは既存のsession root mappingを尊重し、kit既定pathへ強制移動しない

## 4. 文書分類ルール

### 4.1 基本判定

新規文書を作る前に、次の順で分類する。

1. 仕様拘束があるか
   - あるなら `SPEC`
2. 重要な意思決定か
   - 該当するなら `ADR`
3. 複数 WBS / 将来フェーズでも再利用するか
   - するなら `REF`
4. 単一マイルストーンに閉じるか
   - 閉じるなら `WORK/x.y`
5. 旧案や比較の保存か
   - 該当するなら `history`

### 4.2 Runbook の扱い

Runbook は名称ではなく適用範囲で分類する。

- 単一 `x.y` に閉じる Runbook
  - `WORK/x.y`
- 継続運用で再利用する Runbook
  - `REF`

E2E / 実機確認 Runbook は、実装変更の受入確認を人間が再実行できる形にするための文書である。  
ユニットテストやローカル結合テストだけでは確認できない変更では、必要に応じて次の内容を含める。

- 確認目的
- 前提条件
- 環境準備
- 工程別の確認内容
- 期待ログ / 期待結果
- 失敗時の切り分け観点
- 確認スクリプトの実行方法

確認スクリプトを伴う場合でも、Runbook にはスクリプトを実行する目的、必要な前提、結果の読み方を記載する。  
確認結果は `docs/PLAN_PHASE_CURRENT.md` の進捗ログと `docs/agent_sessions/session_*.md` に記録する。
E2E / 実機確認が必要な WBS タスクでは、Runbook と確認スクリプトの準備が AI 側の作業範囲に含まれる。  
人間による確認またはレビューが残っている間は、対象 WBS を `[x]` にせず、確認待ちとして記録する。

### 4.3 UI 文書の扱い

UI 文書は次の 3 層で扱う。

- `WORK`
  - ラフ案、比較案、ワイヤー、途中の画面メモ
- `REF`
  - UI guideline、画面設計の補足、コンポーネント方針
- `SPEC`
  - 画面遷移、状態、権限境界、受入条件など拘束力を持つ要件

補足:
- ここでいう UI には GUI だけでなく CLI や Chat UI も含む
- 初期構想段階では、詳細画面設計よりも `interaction design` の方向性整理を優先する

### 4.4 フェーズ移行文書の扱い

フェーズ終了と次フェーズ計画を行う場合、次の文書を必要に応じて作成または更新する。

| 文書 | 配置 | 役割 |
| --- | --- | --- |
| フェーズクローズ文書 | `docs/WORK/<last-phase>.<last-milestone>/` | 完了要件、抜け漏れ、文書棚卸し、未解決事項を整理する |
| 完了済み計画の履歴 | `docs/history/PLAN_PHASE_<phase>_<yyyymmdd>.md` | 完了した `PLAN_PHASE_CURRENT.md` を履歴として保存する |
| 次フェーズ計画 | `docs/PLAN_PHASE_CURRENT.md` | 現在フェーズの WBS と進捗を管理する |
| 反映漏れレビュー | `docs/WORK/<last-phase>.<last-milestone>/` | 前フェーズ成果物から次フェーズ WBS への反映漏れを確認する |
| 見送り事項台帳 | `docs/WORK/<last-phase>.<last-milestone>/` または `docs/REF/` | 後続フェーズへ送る事項を、再検討タイミング付きで残す |
| capture inbox 棚卸し結果 | `docs/WORK/<last-phase>.<last-milestone>/` | `docs/WORK/inbox/` の各 capture を `promoted / deferred / closed / triaged` に判定した結果を記録する |
| セッション記録 | `docs/agent_sessions/` | 実施作業、決定事項、棚卸し、次アクションを残す |
| 完了フェーズのsession履歴 | `<session-root>/phaseN/` | 正式完了したPhase Nのsessionを保存する。現行フェーズ、フェーズ間作業、最新resume promptはactive rootへ残す |

見送り事項台帳は、後続フェーズ計画時に再確認するための文書である。単なるメモではなく、少なくとも次を含める。

- 見送り事項
- 現在の送り先
- 再検討タイミング
- 再検討観点
- 根拠文書

見送り事項台帳は、単一フェーズに閉じる場合は `WORK` に置く。複数フェーズで継続的に使うことが確認できた場合は、`REF_catalog_*` として昇格を検討する。

フェーズ移行時は、`docs/WORK/inbox/` の `open` を必ず確認する。フェーズクローズ文書または capture inbox 棚卸し結果には、各 capture を次フェーズ計画へ反映したか、後続フェーズへ送ったか、対応不要として閉じたか、継続確認として残したかを記録する。

### 4.5 capture inbox の扱い

作業中に発見した思いつき、機能追加候補、仕様変更候補、バグ、考慮漏れ、疑問は、すぐに `SPEC / ADR / REF / PLAN` へ反映せず、必要に応じて `docs/WORK/inbox/` に捕捉する。

`capture inbox` は、作業の本筋を止めずに気づきを失わないための一時保管場所である。正式な仕様、計画、参照資産ではない。

ディレクトリは状態別に分ける。

```text
docs/WORK/inbox/
├── open/
├── triaged/
├── promoted/
├── deferred/
└── closed/
```

状態の視認性はフォルダで確保し、ファイル名には状態を含めない。

```text
capture_yyyymmdd_hhmm_<slug>.md
```

例:

```text
docs/WORK/inbox/open/capture_20260531_1430_fqdn-design.md
```

各 capture ファイルは、冒頭に次のメタデータを持つ。

```md
---
type: idea | issue | question
status: open | triaged | promoted | deferred | closed
created_at: YYYY-MM-DD HH:mm
source: session | implementation | review | test | user-feedback
related_wbs:
related_docs:
priority: low | medium | high
---
```

`type` は次の 3 種に限定する。

- `idea`
  - 思いつき、改善案、将来やりたいこと
- `issue`
  - 課題、仕様変更候補、バグ、考慮漏れ、リスク
- `question`
  - 疑問、確認事項、判断待ち

状態変更時は、フォルダ移動とメタデータの `status` 更新を同時に行う。

```text
docs/WORK/inbox/open/foo.md
-> docs/WORK/inbox/triaged/foo.md
```

`capture inbox` の棚卸しは、次のタイミングで行う。

- WBS マイルストーン切り替え時
  - 例: `1.1` 完了後、`1.2` 開始前
  - 必要に応じて実施し、次 WBS の作業を優先する場合は残留を許容する
- WBS の大きな組み替えやマイナーチェンジ時
- フェーズ終了、次フェーズ計画策定時
- ユーザーが明示した時

セッション終了ごとの棚卸しは必須にしない。

棚卸しは、必ず仕様反映や実装反映を行うことではない。各 capture の扱いを判定し、状態を更新することである。

- WBS マイルストーン切り替え時
  - 次 WBS に影響するものは `PLAN_PHASE_CURRENT.md`、`WORK/x.y`、`SPEC` などへ反映する
  - まだ判断しないものは `triaged` または `deferred` として残してよい
- フェーズ終了時
  - 原則として全件を確認する
  - 反映する、後続フェーズへ送る、対応不要として閉じる、のいずれかを判定する
  - 必ず inbox を空にする必要はないが、`open` のまま放置しない

状態の意味は次の通りである。

- `open`
  - 捕捉直後で未整理
- `triaged`
  - 棚卸し済みだが、まだ反映先や対応時期を確定していない
- `promoted`
  - `SPEC / ADR / REF / WORK / PLAN` などへ反映済み
- `deferred`
  - 後続フェーズまたは将来検討へ送った
- `closed`
  - 対応不要、重複、解消済み

## 5. 文書タイプと REF の命名規則

`REF` は役割がファイル名から読めるように、タイプ語彙を固定する。

### 5.1 推奨タイプ

- `architecture`
  - システム構成、責務分離、通信経路、図解
- `design`
  - 実装設計、データ設計、制約、方針詳細
- `ui-guideline`
  - UI 全体に効く原則、トーン、共通部品方針
- `ui-spec`
  - 画面単位の構成、導線、状態、要件
- `runbook-test`
  - テスト手順、検証手順、受入確認
- `runbook-setup`
  - 初期構築、環境構築、導入手順
- `runbook-deploy`
  - 更新、デプロイ、ロールバック
- `runbook-ops`
  - 日常運用、障害対応、保守手順
- `reference`
  - 比較表、外部仕様要約、命名規約、索引
- `catalog`
  - 一覧表、マトリクス、台帳、観点表
- `requirements`
  - 要件整理、要件骨子、スコープ整理
- `glossary`
  - 用語集、概念定義、用語統一
- `matrix`
  - 対応表、トレーサビリティ、責務対応表

### 5.2 命名規則

```text
REF_<type>_<subject>.md
```

例:

- `REF_architecture_platform_boundaries.md`
- `REF_design_config_distribution.md`
- `REF_ui-guideline_admin_console.md`
- `REF_ui-spec_console_devices.md`
- `REF_runbook-test_pages_admin_console.md`
- `REF_runbook-setup_raspberry_pi.md`
- `REF_runbook-deploy_pages_admin_console.md`
- `REF_runbook-ops_secret_rotation.md`
- `REF_reference_naming_convention_runtime_ids.md`
- `REF_catalog_test_viewpoints_yobiko.md`

## 6. 昇格ルール

### 6.1 基本原則

- 新規文書は原則として、最初に `WORK` または `REF` のどちらかに置く
- 一時メモを最初から `REF` に置かない
- `WORK` 文書は、マイルストーン完了時に必ず棚卸しする

### 6.2 昇格先

- `WORK -> REF`
  - 次フェーズでも参照価値がある
  - 他マイルストーンでも再利用できる
  - 実運用や継続開発の基準として使える
- `WORK / REF -> SPEC`
  - 拘束力を持つ最終仕様に達した
  - 受入条件や状態、権限、インターフェースなど、守るべき規範になった
- `WORK / REF -> ADR`
  - 重要な採否判断や設計判断として残すべき内容になった

### 6.3 棚卸しの 3 分類

セッション終了時またはマイルストーン完了時に、各文書を次のいずれかに分類する。

- `promote`
  - `SPEC` または `REF` に昇格する
- `retain-in-work`
  - 作業文書として `WORK` に残す
- `delete`
  - 一時メモや重複下書きとして破棄する

### 6.4 フェーズ移行時の棚卸し

フェーズ移行時は、通常の文書棚卸しに加えて、次を確認する。

- 前フェーズの `WORK` 文書に、次フェーズへ反映すべき論点が残っていないか
- Runbook の OUT / 未確認事項が、次フェーズ WBS または見送り事項台帳に反映されているか
- `ROADMAP.md` の将来フェーズや長期バックログへ送った項目が、再検討可能な形で残っているか
- `SPEC / ADR / REF` へ昇格すべき安定事項がないか
- 完了済み `PLAN_PHASE_CURRENT.md` が `history` に退避されているか
- `docs/TECHNOLOGY/ADOPTION.md` の採否、例外、一次検証、後続検討が更新されているか
- 他プロジェクトへ還元できる知識がinternal版として抽出され、移送する場合は匿名化済みexport版が作られているか
- 完了フェーズに属するsessionが、参照検査後に設定済みsession root配下のフェーズ別archiveへ移動済みか
- active session rootに、現行フェーズ、フェーズ間作業、最新resume prompt以外のsessionが残っていないか
- resume promptがarchiveへ移動されず、次に再開する現行作業を指しているか
- sessionを移動できない場合、immutable reference、監査要件等の適用除外理由と代替索引が記録されているか

### 6.5 技術選定ADRからのガイドライン昇格

実装方式または技術選定のADRを確定した場合は、決定事項のうち恒常的に従う規律を精査する。

- コードを書くたびに従う実装規約は `docs/CODING_GUIDELINE.md` へ昇格する
- 開発、検証、migration、deployなどのプロセス規律は `docs/DEVELOPMENT_GUIDELINE.md` へ昇格する
- 背景、比較、採否理由、代替案はADRに残し、ガイドライン側から参照する
- Technology Profileとの差異や例外は `docs/TECHNOLOGY/ADOPTION.md` に記録する
- 昇格要否の確認までを、技術選定WBSの完了条件に含める

### 6.6 WBSマイルストーンでのknowledge feedback

WBSマイルストーンのクローズ時は、`docs/TECHNOLOGY/ADOPTION.md` と当該マイルストーンの成果物を確認し、他プロジェクトでも有効な知識がある場合だけfeedbackを作成する。毎セッションでの作成は必須にしない。

## 7. 新規プロジェクト開始時の文書運用

### 7.1 初期構想は `WORK/0.1/` から始める

新規アプリケーションまたはサービスの着想時は、いきなり `SPEC` や `REF` に書かず、まず `WORK/0.1/` に置く。

標準フロー:

1. 発想の記録
2. 要求とプロダクト定義
3. UI / Interaction 構想（必要な場合）
4. 技術候補と非機能要件の検討
5. Technology Profileの選定と追加
6. 開発成熟度とフェーズの定義
7. ロードマップ作成
8. 現在フェーズ計画化
9. WBS 分解
10. 実装着手判定

### 7.2 初期構想文書

- `idea.md`
- `product_definition.md`
- `interaction_design.md`
- `phase_definition.md`
- `roadmap.md`
- `implementation_ready_checklist.md`

各文書の役割は次の通りである。

| 文書 | 役割 | 主な内容 |
| --- | --- | --- |
| `idea.md` | 発想の起点を記録する | きっかけ、観察した課題、影響を受ける人、期待する変化、仮説 |
| `product_definition.md` | 要求とプロダクト方針を具体化する | 対象利用者、提供価値、初期提供範囲、機能要求、技術候補、非機能要件 |
| `interaction_design.md` | 利用体験と Interface を整理する | GUI / CLI / Chat / API、操作導線、デザイン、FQDN |
| `phase_definition.md` | 成熟度とフェーズの対応を定義する | 技術実現性検証、構想・利用体験検証、初期実用提供、完了条件 |
| `roadmap.md` | 中長期のフェーズ構成を下書きする | 現在、将来、長期バックログ |
| `implementation_ready_checklist.md` | 実装着手可否を確認する | 要求、成熟度、技術、非機能要件、受入条件 |

`idea.md` は発想の原石を記録する文書であり、要求や解決策を確定する場所ではない。具体的な要求、提供範囲、技術構成は `product_definition.md` で整理する。

`roadmap.md` の内容は、構想整理後にプロジェクト全体の正本である `docs/ROADMAP.md` へ反映する。WBS は初期構想用の別文書を作らず、`docs/PLAN_PHASE_CURRENT.md` を正本として直接作成・更新する。

### 7.3 開発成熟度とフェーズ

初期構想では、フェーズ番号とは別に次の開発成熟度を定義する。

- 技術実現性検証
- 構想・利用体験検証
- 初期実用提供
- 本格提供・拡張

PoC は技術実現性検証または構想・利用体験検証を目的とする。初期実用提供と同義ではない。

単純なプロジェクトでは複数の成熟度を1フェーズで扱ってよい。不確実性が大きい場合は PoC を複数フェーズに分割し、各フェーズがどの検証段階を担うかを `phase_definition.md` に記録する。

### 7.4 UI / Interaction がある場合

UI / Interaction を持つプロジェクトでは、初期構想段階で少なくとも以下を整理する。

- UI / Interaction が必要か
- GUI / CLI / Chat / その他のどれか
- 誰がどのように使うか
- どのような体験や印象を目指すか
- 今フェーズで扱うか、後フェーズへ送るか
- Web GUI がある場合、デザインモック / 仮実装を早期 WBS に含めるか
- 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を早期 WBS に含めるか

これらは、まず `docs/WORK/0.1/interaction_design.md` に整理する。

プロダクト価値が GUI や操作体験に依存する場合、API のみの実装では構想・利用体験検証の完了としない。主要利用者が価値を確認できる簡易 Interface を PoC の範囲に含める。

### 7.5 技術候補と非機能要件

`product_definition.md` では、利用者が判断できるよう技術候補の利点、制約、運用負荷、コスト、変更難易度を比較する。

非機能要件は、初期段階から少なくとも次を整理する。

- セキュリティ
  - 守るべきデータ、権限、操作、致命的になるリスク
- 性能・負荷
  - 成否を左右する処理、想定規模、目標、負荷試験の要否
- コスト
  - 課金要素、無償利用範囲、有償化の閾値、判断基準
- 運用・可用性・復旧
  - 監視、通知、停止許容、復旧方法

未決事項や事前検証が必要な事項は、`phase_definition.md` と `docs/PLAN_PHASE_CURRENT.md` の WBS に反映する。

### 7.6 Web GUI / FQDN 設計がある場合

Web GUI を持つプロジェクトでは、最初から詳細画面設計を確定するのではなく、必要に応じてデザインモックまたは仮実装を WBS に含める。目的は、主要導線、レイアウト密度、デザインテーマ、画面種別ごとの役割分担について、開発前に認識を合わせることである。

外部公開または外部連携されるエンドポイントを持つ場合は、Web GUI の有無に関わらず FQDN 設計を WBS に含める。特に次を確認する。

- 個人の操作 / 設定画面
- テナント管理画面
- サービス全体の管理画面
- API / Webhook / Callback / Request URL
- development / staging / production の環境差分
- Cookie、認証、CORS、OAuth redirect、Webhook 署名検証への影響

## 8. セッション運用

### 8.1 セッション開始時に確認するもの

最初に `docs/WORK_LINE_ROUTING.md` に従って作業線を判別する。利用者によるskillの明示指定と、依頼内容からのAI判定の両方を入口とする。以下の共通読込はEpicに適用し、MNT / OPS / ADVでは各索引と件別記録に定めた入口を使う。

- Epicでは `docs/INDEX.md`、開発・文書・versioning guideline、Technology Profile、`ROADMAP.md`、`PLAN_PHASE_CURRENT.md`、最新の `agent_sessions/` を確認する
- MNTではmaintenance索引と関連する仕様・設計・version文書を確認する
- OPSではoperations索引、類似事象、該当Runbookを確認する
- ADVではadvisory索引、継続案件の件別記録と成果物正本を確認する

### 8.2 実装前に明示すること

- 対象 WBS
- 影響範囲
- 技術的アプローチ
- 作成/更新予定の文書と分類先
- リスクとトレードオフ

新規プロジェクト開始時は、追加で次を明示する。

- 誰の何の課題を解くか
- 事実 / 仮説 / 未決事項
- 初期提供範囲 / 初期提供範囲に含めないもの
- 技術実現性検証、構想・利用体験検証、初期実用提供のどこまでを扱うか
- 技術候補と判断材料
- クリティカルなセキュリティ、性能、コスト要件
- Technology Profileの追加要否と、未収録技術の扱い
- フェーズ分割の考え方
- 実装着手に不足している前提

UI / Interaction を持つ場合は、追加で次を明示する。

- GUI / CLI / Chat のどれを扱うか
- 今フェーズで UI / Interaction を実装対象に含めるか
- デザイン / テーマの方向性をどこまで決めるか
- Web GUI の場合、デザインモック / 仮実装を WBS に含めるか
- 外部公開 / 外部連携エンドポイントがある場合、FQDN 設計を WBS に含めるか

### 8.3 セッション終了時の記録

Epicでは `docs/agent_sessions/session_yyyymmdd_nn.md` に、最低限次を記録する。MNT / OPS / ADVでは各件別記録に同等の引き継ぎ情報を残す。

- 概要
- 実施作業 / 対象 WBS
- 決定事項
- 未解決事項
- 次アクション
- 作成 / 変更ファイル一覧
- 文書棚卸し結果

## 9. 文書メタデータ

各文書は、可能な限り次のメタデータを冒頭に持つ。

```md
- Status: Draft | Active | Frozen | Superseded
- Scope: Global | Phase | Milestone | Session
- Source of Truth: Yes | No
- Owner: <team or area>
- Owner WBS: <x.y or x.y.zz>
- Promotion Target: SPEC | ADR | REF | Retain-in-Work | Delete
- Supersedes: <file or N/A>
```

## 10. Technology Profileの文書運用

- `docs/TECHNOLOGY/INDEX.md` は選択済みprofileと参照先の索引である
- `docs/TECHNOLOGY/ADOPTION.md` はプロジェクト固有の採用、不採用、例外、後続検討、一次検証の正本である
- `<profile-id>/GUIDELINE.md` は、選択した技術に関する安定した共通原則である
- `<profile-id>/REFERENCE.md` は、過去プロジェクトの実証知識、失敗例、分岐条件であり、全項目を機械的に採用しない
- limits、pricing、API、設定仕様など変動する事実は、利用時点の公式一次情報を優先する
- profile文書をプロジェクト事情で直接変更せず、差異は `ADOPTION.md` に記録する
- profile追加時、技術選定ADR確定時、E2E・production運用・障害対応時に `ADOPTION.md` を更新する

### 10.1 knowledge feedback

他プロジェクトにも通用する知識は、次の場所へ自己完結したfeedbackとして記録する。

```text
docs/WORK/<phase>.<milestone>/kit_feedback_internal_yyyymmdd_<slug>.md
docs/WORK/<phase>.<milestone>/kit_feedback_export_yyyymmdd_<neutral-slug>.md
```

- internal版は元プロジェクト内だけに保管し、Evidence IDと元文書パスの対応を持ってよい
- export版はsource側の元文書パス、ファイル名、project・product・organization名、顧客・tenant・個人識別子を含めない
- export版では根拠をEvidence IDと匿名化した概要で表現する
- export版ではsource evidenceとkit targetを別sectionにし、Kit Target Map、semantic change、再現手順、受入条件を残す
- ユーザー確認前は`--mode pre-review`、確認後は`--mode final`でexport検査を行い、finalを通過したexport版だけをkitへ渡す
- feedbackは提案であり、作成時点でkitの正本へ直接反映しない

## 11. skills の位置づけ

skills は補助であり、作業線の正本は `WORK_LINE_ROUTING.md`、その他の正本は `AGENTS.md`、`DEVELOPMENT_GUIDELINE.md`、`DOCUMENTATION.md`、`VERSIONING.md`、`docs/TECHNOLOGY/INDEX.md`、`docs/TECHNOLOGY/ADOPTION.md`、選択済みprofileの `GUIDELINE.md` である。

### 11.1 利用する skill

- `skills/doc-governance/`
  - 文書分類、昇格、命名、棚卸しを補助する
- `skills/project-bootstrap/`
  - 対話的な要求開発、技術・非機能要件の検討、検証段階の定義、ロードマップと WBS の作成を補助する
- `skills/version-governance/`
  - version 更新判断、更新対象、更新手順確認を補助する
- `skills/capture-inbox/`
  - 作業中の気づき、課題、疑問を `docs/WORK/inbox/` に捕捉する
- `skills/technology-profile-governance/`
  - 複数Technology Profileの選定、後付け、採否記録、継続更新を補助する
- `skills/knowledge-feedback/`
  - 他プロジェクトへ還元できる汎用知識を抽出する
- `skills/maintenance-work/`
  - リリース済み・運用中の既存能力に対する修正をMNTとして扱う
- `skills/operations-work/`
  - アラート、ログ、停止、閾値超過、回復確認などの運用上の作業をOPSとして扱う
- `skills/experience-advisory/`
  - 本プロジェクトの経験を、他プロジェクトやプロジェクト化前の企画へ活用する助言をADVとして扱う

### 11.2 skill に期待すること

- 人間と AI の判断を揃える
- セッションを跨いでも文書運用ルールを再現しやすくする
- 文書の誤配置や `REF` の肥大化を防ぐ

### 11.3 配置方針

この bootstrap kit では、適用先プロジェクトに `skills/` を配置しない。

- `codex`
  - `.agents/skills/`
- `rovo`
  - `.agents/skills/`
- `claude`
  - `.claude/skills/`
- `both`
  - `.agents/skills/` と `.claude/skills/`

補足:
- Rovo は公式には `.agents/skills/` または `.rovodev/skills/` を使えるが、この kit では Codex と共通化するため `.agents/skills/` に統一する
- `boilerplate/skills/` は kit 内の source of truth であり、適用先へは直接配置しない

## 12. この運用で目指す状態

- `REF` は選別済みの再利用資産だけになる
- タスク専用資料は `WORK` に閉じ込められる
- `SPEC` には拘束力のある要件だけが残る
- セッションを切っても、次回再開時に文書の位置づけがすぐ分かる
- 次の新規プロジェクトにも同じ文書運用をそのまま持ち運べる
- 各プロジェクトで得た汎用知識が、機密情報を除いたfeedbackとしてkitへ循環する
