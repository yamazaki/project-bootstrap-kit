# Getting Started

## 1. 空のリポジトリを作成

- GitHub 上で空の repository を作成する
- ローカルへ clone する

## 2. bootstrap kit を clone

```bash
git clone <project-bootstrap-kit-repo>
cd project-bootstrap-kit
```

## 3. 初期化スクリプトを実行

```bash
node scripts/init-project.mjs \
  --target /path/to/new-repo \
  --project-name "My Project" \
  --project-slug my-project \
  --product-name "My Product" \
  --ai-surface codex
```

初期化時点で採用技術が決まっている場合:

```bash
node scripts/init-project.mjs \
  --target /path/to/new-repo \
  --project-name "My Project" \
  --project-slug my-project \
  --product-name "My Product" \
  --ai-surface codex \
  --technology-profile cloudflare-workers \
  --technology-profile slack
```

詳しい引数と挙動は [docs/REF/REF_reference_init_project_usage.md](docs/REF/REF_reference_init_project_usage.md) を参照する。

`--project-model`省略時は製品・service・tool開発向けの`development`となる。文書・調査・継続業務向けの`task-workspace`を使う場合は、`--project-model task-workspace`を指定し、`--product-name`とTechnology Profileは指定しない。

`init-project.mjs` は実行後に初期化検証を行う。必要なら個別に `node scripts/verify-project-init.mjs` を再実行できる。

### 既存ファイルを持つ未適用project

非空の既存Gitリポジトリには`--force-overwrite`を使わず、read-onlyのadoption planを生成する。

```bash
node scripts/init-project.mjs \
  --target /path/to/existing-repo \
  --project-name "Existing Project" \
  --project-slug existing-project \
  --product-name "Existing Product" \
  --ai-surface codex \
  --adopt-existing
```

CONFLICTは既存fileを保持したままplanへ記録される。詳細な解決方法とapply手順は[初期化スクリプト利用方法](docs/REF/REF_reference_init_project_usage.md)を参照する。

成熟projectではADDも既定で未解決となる。追加、意図的不追加、keep、replace、manual mergeをpath単位で判断する。complete後は`docs/BOOTSTRAP_STATE.json`と`.project-bootstrap/baselines/`が将来upgradeの比較基準になる。

## 4. 展開後に確認するファイル

- `AGENTS.md`
- `CLAUDE.md`（`--ai-surface claude|both` の場合）
- `docs/DEVELOPMENT_GUIDELINE.md`
- `docs/TECHNOLOGY/INDEX.md` と、選択済みprofileの関連文書
- `docs/WORK/0.1/` の初期構想文書
- `docs/TECHNOLOGY/INDEX.md`
- `docs/TECHNOLOGY/ADOPTION.md`
- `.agents/skills/` または `.claude/skills/`
- `docs/BOOTSTRAP_STATE.json`
- `.project-bootstrap/baselines/sha256/`
- `.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`

`CLAUDE.md` は Claude Code 用の入口であり、プロジェクトの行動規範の正本である `AGENTS.md` を読み込む。初期化スクリプトは `~/.claude/CLAUDE.md` や `~/.claude/rules/*.md` を作成・変更しない。

## 5. 最初の作業

1. `docs/WORK/0.1/idea.md` を埋める
2. `docs/WORK/0.1/product_definition.md` を埋める
3. UI / Interaction がある場合は `docs/WORK/0.1/interaction_design.md` を埋める
4. `docs/WORK/0.1/phase_definition.md` を埋める
5. `docs/WORK/0.1/implementation_ready_checklist.md` を確認する
6. 実装着手前に `ROADMAP` と `PLAN_PHASE_CURRENT` を作成する

採用技術がWORK/0.1の途中で確定した場合は、`technology-profiles` upgrade featureでprofileを後付けする。

## 6. テンプレートの意図

- `boilerplate/docs/ROADMAP.md` と `boilerplate/docs/PLAN_PHASE_CURRENT.md` は、このプロジェクトで実際に使用している `docs/ROADMAP.md` と `docs/PLAN_PHASE_CURRENT.md` の章構成と運用意図を参考にした汎用版である
- 完全コピーではなく、新規プロジェクトに流用しやすいように具体名や個別 WBS を外している
