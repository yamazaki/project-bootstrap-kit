# upgrades

このディレクトリは、既存プロジェクトへ機能単位で upgrade を適用するための feature 定義を置く。

## 方針

- upgrade は version 全体ではなく feature 単位で適用する
- 既存プロジェクトの事情に合わせて、必要な feature だけ選択して適用する
- `upgrade-project.mjs` は共通ランナーとして動作し、各 feature ディレクトリを参照する
- 新規 feature を追加する際は、可能な限り dry-run で既存状態との差分を判定できるようにする
- dry-run の結果は、少なくとも `ADD / UPDATE / SKIP(SAME) / WARN` のいずれかで読み取れることを目指す
- `--diff` 指定時は、一時コピーへ apply した結果と対象プロジェクトを比較し、想定差分を `.bootstrap-upgrade-diff/` 配下または `--diff-output` 指定先へ保存する
- 全featureの導入version、更新version、依存順、既定選択は `catalog.json` を正本とする
- `--scan` は全featureのdry-runとapply previewを照合し、確認用planを `.bootstrap-upgrade-diff/` 配下へ保存する
- `--apply-plan` はtarget fingerprintと依存関係を再検証し、一時コピーで全件preflightしてから実targetへ適用する
- 新規 feature の `apply` は、対象プロジェクト配下へのファイル操作に閉じること。外部サービス操作や git 操作を含めると dry-run diff の安全性が崩れる

## 命名規約

- docs / guideline / versioning など、ルールや文書を導入する feature
  - 例: `versioning`
- skills に関する feature
  - `skills-` prefix を使う
  - 例: `skills-sync`, `skills-surface-migration`
- migration 後の cleanup など後処理 feature
  - 対象が明確に分かる名前を使う
  - 例: `cleanup-migration-backup`

補足:
- 既存の `versioning` feature は、versioning 用 skill 配置も含んでいるが、後方互換のため名前は維持する
- 今後新規に追加する skill 系 feature は `skills-` prefix に統一する

## 想定構成

```text
upgrades/
├── README.md
├── catalog.json
└── <feature-name>/
    ├── manifest.json
    ├── files/
    ├── patches/
    └── notes/
```

## 各要素の意味

- `catalog.json`
  - featureの導入version、更新version、依存順、既定選択方針を定義する
- `manifest.json`
  - feature 名、説明、対象ファイル、適用モード、依存関係を定義する
- `files/`
  - 既存プロジェクトへ追加するファイル群
- `patches/`
  - 既存ファイルへ挿入・追記する定型差分の素材
- `notes/`
  - 自動化できない部分や手動確認事項

## 初期 feature

- `work-line-routing`
  - Epic / MNT / OPS / ADVの判別、記録、線間遷移を追加する
  - MNT・OPS・ADVを明示起動またはAI判定で使用するskillを追加する
  - 既存の独自文書・skillは `WARN(KEEP)` として保全する
- `technology-profiles`
  - 複数選択可能なTechnology Profile文書体系を追加する
  - WORK/0.1で技術確定後のprofile後付けに対応する
  - legacy `PLATFORM_GUIDELINE.md` を安全に移行する
  - Technology Profile運用とknowledge feedbackのskillを追加する
- `claude-project-instructions`
  - Claude Code向けの `CLAUDE.md` を追加し、`AGENTS.md` を読み込ませる
  - 独自編集された既存 `CLAUDE.md` は `SKIP(KEEP)` として保全する
  - `~/.claude/` 配下のユーザー共通設定は操作しない
- `versioning`
  - `docs/VERSIONING.md` の追加
  - `AGENTS.md`, `docs/DEVELOPMENT_GUIDELINE.md`, `docs/INDEX.md` への参照追加
  - `.agents/skills/version-governance/` または `.claude/skills/version-governance/` の追加
  - リリース境界、未リリース変更、モノレポ更新単位、リリース確定手順を不足箇所へ追加
  - 既存プロジェクト固有のversion正本とrelease方式を保持する
- `skills-surface-migration`
  - 既存 `skills/` を `.agents/skills/` / `.claude/skills/` へ移行
  - 旧 `skills/` を `.migration-backup/skills/` へ退避
- `cleanup-migration-backup`
  - `.migration-backup/skills/` を削除
  - cleanup 履歴を `BOOTSTRAP_ADOPTION.md` へ追記
- `skills-sync`
  - kit の最新 skill と既存プロジェクトの skill を比較
  - `ADD / UPDATE / SKIP(SAME) / EXTRA` を表示
  - `ADD / UPDATE` のみを反映
- `interaction-design`
  - `docs/WORK/0.1/interaction_design.md` を追加
  - GUI / CLI / Chat UI を含む interaction design 観点をガイドラインへ組み込む
- `session-operation-policy`
  - `docs/PLAN_PHASE_CURRENT.md` にセッション運用方針の節を追加
  - セッション粒度の判断基準を `AGENTS.md` と `DEVELOPMENT_GUIDELINE.md` に反映する
- `coding-guideline`
  - `docs/CODING_GUIDELINE.md` を追加
  - 意味論的なコーディング規約をガイドラインへ反映する
- `e2e-runbook`
  - E2E / 実機確認 Runbook の方針を `docs/DEVELOPMENT_GUIDELINE.md` に反映する
  - Runbook 運用ルールを `docs/DOCUMENTATION.md` に反映する
  - 確認スクリプトの安全原則を `docs/CODING_GUIDELINE.md` に反映する
- `task-completion-gate`
  - WBS タスクの作業開始時に、対象タスクを `[>]` へ変更する
  - AI の実装作業完了と WBS タスク完了を分離する
  - ユーザー確認、E2E / 実機確認、最終レビューが残る場合は WBS を `[>]` のまま維持する
  - `[x]` への変更と次回再開プロンプトの確定更新を、ユーザー受入後に限定する
- `phase-transition`
  - フェーズ終了と次フェーズ開始の標準手順を導入する
  - フェーズクローズ、文書棚卸し、次フェーズ計画、反映漏れレビュー、見送り事項台帳化をガイドラインへ反映する
  - `phase-transition` skill を追加する
- `phase-session-archive-governance`
  - 完了フェーズのsession archive、active root、resume promptの整合確認を追加する
  - session fileは自動移動せず、mapped pathとreference scanを前提にする
- `capture-inbox`
  - 作業中の思いつき、課題、疑問を `docs/WORK/inbox/` に捕捉する運用を導入する
  - `open / triaged / promoted / deferred / closed` の状態別フォルダを追加する
  - 棚卸しを WBS マイルストーン切り替え時、WBS 組み替え時、フェーズ移行時に行うルールを追加する
  - `capture-inbox` skill を追加する
- `project-bootstrap-planning`
  - 発想から要求、技術候補、非機能要件、フェーズ、WBS までの初期構想プロセスを更新する
  - PoC と初期実用提供を分離し、フェーズ番号と開発成熟度を独立して管理する
  - `product_definition.md` と最新の `project-bootstrap` skill を追加する
  - 既存の `concept_template.md` と記入済み初期構想文書は保持する
- `initial-planning-document-names`
  - `docs/WORK/0.1/` の初期構想文書を `_template` なしの正規名へ移行する
  - WBS 下書き文書を廃止し、`docs/PLAN_PHASE_CURRENT.md` を正本として一本化する
  - 競合する文書や記入済み WBS 下書きは `WARN` として保全する
- `web-ui-planning`
  - Web GUI のデザインモック / 仮実装タスクを WBS 検討に組み込む
  - 外部公開 / 外部連携エンドポイントの FQDN 設計タスクを WBS 検討に組み込む
  - `project-bootstrap` skill を最新化する
