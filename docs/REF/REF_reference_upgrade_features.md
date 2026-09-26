# Upgrade Features Catalog

## 1. 目的

`upgrade-project.mjs` で選択可能な feature の一覧、役割、命名規約を示す。

## 2. 命名規約

- docs / guideline / versioning など、ルールや文書を導入する feature
  - 例: `versioning`
- skills に関する feature
  - `skills-` prefix を使う
  - 例: `skills-sync`, `skills-surface-migration`
- cleanup や補助的後処理 feature
  - 対象が明確に分かる名前を使う
  - 例: `cleanup-migration-backup`

補足:
- 既存の `versioning` feature は、versioning 用 skill の配置も含むが、後方互換のため名前は維持する
- 今後新規に追加する skill 系 feature は `skills-` prefix に統一する

## 3. feature 一覧

機械可読な導入version、更新version、依存順、既定選択方針は `upgrades/catalog.json` を正本とする。

### git-commit-guidance

- ファイル変更と Git commit の承認境界を分離する
- 承認後の commit message の説明部分と本文を原則として日本語にする
- 件名に変更の目的または結果を記載し、必要に応じて理由、変更内容、確認内容、関連識別子を本文に残す
- `AGENTS.md` と `docs/DEVELOPMENT_GUIDELINE.md` の独自記載を保持し、不足する規約を追記する

### work-line-routing

- Epic / MNT / OPS / ADVの判別と線間遷移を導入する
- `maintenance-work`, `operations-work`, `experience-advisory` skillを追加する
- 利用者による明示起動とAIによる自動判定を同じ手順へ接続する
- 既存の独自文書・skillは上書きしない

### technology-profiles

- `docs/TECHNOLOGY/INDEX.md` と `ADOPTION.md` を追加する
- 任意・複数のTechnology Profile文書とprofile固有skillを追加する
- WORK/0.1で採用技術が確定した後のprofile後付けに対応する
- `technology-profile-governance` と `knowledge-feedback` skillを追加する
- legacy `docs/PLATFORM_GUIDELINE.md` を同一内容なら削除し、独自内容なら退避する
- profile固有文書は `SKIP(KEEP)` で保全する

### claude-project-instructions

- `--ai-surface claude|both` のプロジェクトへ `CLAUDE.md` を追加する
- `CLAUDE.md` から正本の `AGENTS.md` を読み込ませる
- 既知の旧内容は更新し、独自編集された内容は `SKIP(KEEP)` として保全する
- `~/.claude/CLAUDE.md` と `~/.claude/rules/*.md` は操作しない

### versioning

- ルート `CHANGELOG.md` がなければ標準雛形を追加する
- 既存 `CHANGELOG.md` は上書きせず、`Unreleased` がなければ警告する
- `docs/VERSIONING.md` の追加
- `AGENTS.md`, `docs/DEVELOPMENT_GUIDELINE.md`, `docs/INDEX.md` への versioning 参照追加
- `version-governance` skill の追加
- ChangeLog記録、リリース境界、未リリース変更、モノレポ更新単位、リリース確定手順の追加
- 既存のversion正本やrelease方式を保持した差分適用

### skills-surface-migration

- 既存 `skills/` を `.agents/skills/` または `.claude/skills/` へ移行
- 旧 `skills/` を `.migration-backup/skills/` へ退避

### cleanup-migration-backup

- `.migration-backup/skills/` を削除
- cleanup 履歴を `docs/BOOTSTRAP_ADOPTION.md` に追記

### skills-sync

- `boilerplate/skills/` を source of truth として比較
- surface ごとの skill 配置先と差分比較
- `ADD / UPDATE / SKIP(SAME) / EXTRA` を表示
- `ADD / UPDATE` のみ反映する

### interaction-design

- `docs/WORK/0.1/interaction_design.md` を追加
- GUI / CLI / Chat UI を含む interaction design 観点を導入する
- `AGENTS.md`, `docs/DEVELOPMENT_GUIDELINE.md`, `docs/DOCUMENTATION.md`, `docs/WORK/0.1/README.md` に追記する

### session-operation-policy

- `docs/PLAN_PHASE_CURRENT.md` に `セッション運用方針` 節を追加
- フェーズごとに、どの WBS 粒度で AI セッションを区切るかを定義できるようにする
- `AGENTS.md` と `DEVELOPMENT_GUIDELINE.md` に参照を追加する

### coding-guideline

- `docs/CODING_GUIDELINE.md` を追加
- 意味論的なコーディング規約を導入する
- `AGENTS.md`, `docs/DEVELOPMENT_GUIDELINE.md`, `docs/INDEX.md` に参照を追加する

### e2e-runbook

- E2E / 実機確認 Runbook の作成方針を導入する
- `docs/DEVELOPMENT_GUIDELINE.md` に実装後検証の方針を追加する
- `docs/DOCUMENTATION.md` に Runbook 運用ルールを追加する
- `docs/CODING_GUIDELINE.md` に確認スクリプトの安全原則を追加する

### task-completion-gate

- WBS タスクの作業開始時に、AI が実作業へ入る前に対象タスクを `[>]` へ変更する
- AI の実装作業完了と WBS タスク完了を分離する
- ユーザー確認、E2E / 実機確認、最終レビューが残る場合は WBS を `[>]` のまま維持する
- `[x]` への変更と次回再開プロンプトの確定更新を、ユーザー受入後に限定する
- E2E / 実機確認が必要なタスクでは、Runbook と確認スクリプトの準備を AI 側の作業範囲に含める

### phase-transition

- フェーズ終了と次フェーズ開始の標準手順を導入する
- フェーズクローズ、文書棚卸し、完了済み計画の `history` 退避、次フェーズ計画、WBS 作成を標準化する
- 前フェーズ成果物から次フェーズ WBS への反映漏れレビューを導入する
- 後続フェーズへ送る見送り事項を、再検討タイミング付きの台帳として残す
- `phase-transition` skill を追加する

### phase-session-archive-governance

- 正式完了したフェーズのsessionを、参照検査後に設定済みsession root配下のフェーズ別archiveへ整理する規則を追加する
- 現行フェーズ、フェーズ間作業、最新resume promptをactive rootへ残す
- mature adopterのmapped session root、immutable reference、監査要件を尊重し、自動moveは行わない

### capture-inbox

- 作業中の思いつき、課題、疑問を `docs/WORK/inbox/` に捕捉する運用を導入する
- `open / triaged / promoted / deferred / closed` の状態別フォルダを追加する
- `idea / issue / question` の 3 種で capture を分類する
- 棚卸しを WBS マイルストーン切り替え時、WBS 組み替え時、フェーズ移行時に行うルールを追加する
- `capture-inbox` skill を追加する

### project-bootstrap-planning

- `concept_template.md` を新規プロジェクト向け構成から外し、`product_definition.md` を追加する
- 技術実現性検証、構想・利用体験検証、初期実用提供を分離する
- 対話的な要求開発、技術候補の比較、セキュリティ・性能・コスト・運用要件の整理を導入する
- `project-bootstrap` skill をファシリテーション型へ更新する
- 既存の `concept_template.md` と記入済み初期構想文書は保持する

### initial-planning-document-names

- `docs/WORK/0.1/` の初期構想文書を `_template` なしの正規名へ移行する
- 旧名だけが存在する場合は内容を保持してリネームする
- 旧名と新名の内容が競合する場合は `WARN` として自動上書きしない
- 未記入の `wbs_breakdown_template.md` は削除し、記入済みの場合は保全して `PLAN_PHASE_CURRENT.md` への転記を促す
- `project-bootstrap` skill の非機能要件の出力先を `product_definition.md` に明記する

### web-ui-planning

- Web GUI のデザインモック / 仮実装タスクを WBS 検討に組み込む
- 外部公開 / 外部連携エンドポイントで必要な FQDN 設計タスクを WBS 検討に組み込む
- `docs/WORK/0.1/interaction_design.md`, `implementation_ready_checklist.md` を更新する
- `project-bootstrap` skill を最新化する

## 4. 推奨利用順序

### Git commit の承認境界とメッセージ規約を追加する場合

1. `git-commit-guidance`

### Technology Profile方式へ移行またはprofileを追加する場合

1. `technology-profiles`

### Claude Code向けプロジェクト指示を追加する場合

1. `claude-project-instructions`

### 旧 `skills/` 構成から移行する場合

1. `skills-surface-migration`
2. `skills-sync`
3. `cleanup-migration-backup`

### versioning ルールを追加する場合

1. `versioning`

### interaction design 観点を追加する場合

1. `interaction-design`

### セッション粒度の方針を追加する場合

1. `session-operation-policy`

### E2E / 実機確認 Runbook の方針を追加する場合

1. `coding-guideline`
2. `e2e-runbook`
3. `task-completion-gate`

### WBS タスク完了判定を厳格化する場合

1. `e2e-runbook`
2. `task-completion-gate`

### フェーズ移行プロセスを追加する場合

1. `phase-transition`
2. `phase-session-archive-governance`

### 作業中の気づき捕捉を追加する場合

1. `capture-inbox`

### 初期構想と project-bootstrap を新体系へ更新する場合

1. `project-bootstrap-planning`
2. `initial-planning-document-names`

### Web GUI のデザインモック / 外部エンドポイント FQDN 設計観点を追加する場合

1. `interaction-design`
2. `web-ui-planning`

## 5. 実行例

### 5.0 適用先全体のscanと一括upgrade

v0.8.0以降のstate-enabled projectでは、このscanはpath単位のU0/U1/L0/L1比較planを生成する。操作例、decision、ownership transitionは[Bootstrap State Reference](./REF_reference_bootstrap_state.md)を参照する。

まず全featureをscanし、現在状態と適用候補をplanへ保存する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --scan
```

`docs/BOOTSTRAP_ADOPTION.md` のkit識別子がないprojectはscan対象外となる。適用済みprojectでAI surfaceとTechnology Profileだけを推定できない場合は、単一feature実行と同じ引数で明示する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --scan \
  --ai-surface both \
  --technology-profile cloudflare-workers
```

plan JSONで、初回適用version、現在相当、各featureの `current / available / review / blocked / not-applicable`、`selectedFeatures` を確認する。問題がなければ、表示されたplanを明示指定して適用する。

```bash
node scripts/upgrade-project.mjs \
  --apply-plan /path/to/repo/.bootstrap-upgrade-diff/upgrade-plan_<timestamp>.json
```

- scan後に対象内容が変わった場合はstale planとして停止するため、再scanする
- 空フォルダ、空Gitリポジトリ、未適用projectはplanを生成せず、表示される案内に従って `init-project.mjs` を使う
- 既存ファイルを持つ未適用projectでは、`--force-overwrite`の上書きリスクを確認する
- `REVIEW` は既定planへ含まれない。警告とapply previewを確認し、必要な場合だけ `--include-review` でplanを再生成する
- `manual` featureは `--include-review` でも自動選択されない。単一featureとして個別に確認する
- apply前に一時コピーで全選択featureをpreflightする
- 選択feature間の共通文書・skill更新は、選択済みfeatureだけのfollow-up passで収束させる
- apply後に再度 `--scan` し、残る `REVIEW` とmanual featureを確認する

### 5.1 dry-run

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature skills-sync \
  --ai-surface codex
```

期待すること:
- 何を追加・更新する想定かが表示される
- feature によっては `ADD / UPDATE / SKIP(SAME) / SKIP(KEEP) / EXTRA / WARN` のような差分判定が表示される
- 既に同等状態であれば `SKIP(SAME)` が表示される

### 5.2 dry-run diff

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature web-ui-planning \
  --ai-surface codex \
  --diff
```

期待すること:
- 通常の dry-run 出力に加えて、`--apply` した場合の想定差分が生成される
- 標準出力には変更予定ファイルと diff ファイルの保存先が表示される
- diff は既定で `<target>/.bootstrap-upgrade-diff/<feature>_<timestamp>.diff` に保存される
- 保存先を明示したい場合は `--diff-output /path/to/upgrade.diff` を指定する
- `.bootstrap-upgrade-diff/` は配布先プロジェクトの `.gitignore` に含める

### 5.3 apply

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature skills-sync \
  --ai-surface codex \
  --apply
```

期待すること:
- dry-run で確認した内容に基づいて実際に変更が反映される
- `docs/BOOTSTRAP_ADOPTION.md` に履歴が追記される
- 反映後は `git diff` などで変更内容を確認する
