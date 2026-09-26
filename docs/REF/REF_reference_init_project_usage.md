# init-project.mjs Usage

## 1. 目的

`scripts/init-project.mjs` の使い方、引数、挙動、生成物を定義する。

## 2. 前提条件

- 適用先は Git リポジトリであること
- `project-bootstrap-kit` をローカルに clone していること
- 適用先へ `boilerplate/` を展開してよいこと

## 3. 基本コマンド

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

## 4. 引数

- `--target`
  - 適用先リポジトリのローカルパス
- `--project-name`
  - 人向けのproject / workspace名称。日本語と空白を許可する
- `--project-slug`
  - 必須。lowercase kebab-caseの機械識別子
- `--project-model`
  - 任意。`development | task-workspace`。省略時は`development`
- `--product-name`
  - developmentだけで使用する人向け製品 / service名称。省略時はproject name
- `--technology-profile`
  - 任意。複数回指定できる
  - `cloudflare-workers | slack | questetra | gas`
- `--ai-surface`
  - 必須。`codex | claude | rovo | both`
- `--force-overwrite`
  - 非空targetでは使用不可。既存互換の引数として受理するが、`--adopt-existing`の利用を案内して停止する
- `--adopt-existing`
  - 非空の未適用Gitリポジトリを変更せず、adoption planを生成する
- `--plan-output`
  - adoption plan bundleの保存先。target外も指定できる
- `--apply-adoption-plan`
  - 確認・編集済みadoption planを適用する
- `--apply-safe-only`
  - `resolution: add`かつ`confirmAdd: true`のpathだけを先行適用し、正式adoptionはpendingのままにする
- `--show-extras`
  - 通常はtop-level別件数だけを表示するEXTRAの全pathを表示する
- `--accept-adoption-manual-merge`
  - 手動統合後のproject hashをreason付きでplanへ受け入れる

## 5. 未指定時の挙動

### 5.1 `--technology-profile` 未指定

- 共通コアと `docs/TECHNOLOGY/INDEX.md`, `ADOPTION.md` を展開する
- 選択済みprofileはない状態で開始する
- WORK/0.1で採用技術が確定した後、`technology-profiles` featureで追加できる

task-workspaceはTechnology Profileを受け付けず、profile基盤文書も生成しない。非対応の組合せは無視せず停止する。

### 5.2 `--force-overwrite` 未指定

- 適用先リポジトリが `.git` 以外のファイルを持つ場合は停止する

### 5.3 非空の未適用project

通常initと`--force-overwrite`は使用せず、`--adopt-existing`でplanを生成する。

```bash
node scripts/init-project.mjs \
  --target /path/to/existing-repo \
  --project-name "Existing Project" \
  --project-slug existing-project \
  --product-name "Existing Product" \
  --ai-surface codex \
  --adopt-existing
```

planの`ADD`と`CONFLICT`はengine-managed pathを除き既定で`unresolved`となる。file単位で次を設定する。

- 追加: `resolution: add`、`confirmAdd: true`
- 不追加: `resolution: skip`、空でない`reason`、任意の`satisfiedBy`または`supersededBy`
- 既存内容を維持: `resolution: keep`と空でない`reason`
- kit版へ置換: `resolution: replace`と`confirmReplace: true`
- 手動統合: `--accept-adoption-manual-merge`でcurrent project hashを受け入れる

安全な`ADD`だけを先行適用する場合:

```bash
node scripts/init-project.mjs \
  --apply-adoption-plan /path/to/adoption-bundle/plan.json \
  --apply-safe-only
```

全CONFLICTを解決して正式適用する場合:

```bash
node scripts/init-project.mjs \
  --apply-adoption-plan /path/to/adoption-bundle/plan.json
```

### 5.4 `--ai-surface`

- `codex`
  - `.agents/skills/` を生成する
- `rovo`
  - `.agents/skills/` を生成する
- `claude`
  - `.claude/skills/` を生成する
  - `CLAUDE.md` を生成し、`AGENTS.md` を読み込ませる
- `both`
  - `.agents/skills/` と `.claude/skills/` の両方を生成する
  - `CLAUDE.md` を生成し、`AGENTS.md` を読み込ませる

補足:
- Rovo は公式には `.agents/skills/` または `.rovodev/skills/` を使えるが、この kit では Codex と共通化するため `.agents/skills/` に統一する

## 6. スクリプトが行うこと

1. 引数を検証する
2. 適用先が Git リポジトリか確認する
3. 空でないリポジトリへの適用を既定で拒否する
4. Project Model manifestからexact asset setを選択する
5. Modelのmappingに従って`AGENTS.md`、条件付き`CLAUDE.md`、AI surface別skillを配置する
6. 選択Modelが対応する場合だけTechnology Profileの適用可否を確認し、文書とskillを合成する
7. target collision、required path、AI surfaceをfail-closedで検証する
8. `<PROJECT_NAME>`、`<PROJECT_SLUG>`、`<PRODUCT_NAME>`を置換する
9. kit MIT全文を`.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`へ配置する
10. `VERSION`とclean kit commitを読み込み、Model metadataを含む`docs/BOOTSTRAP_ADOPTION.md`を生成する
11. schema 2の`docs/BOOTSTRAP_STATE.json`とupstream baselineを生成する
12. Model-aware初期化検証スクリプトを呼び出す
13. 選択Modelに応じた次の確認先を表示する

## 7. 初期化検証

`scripts/verify-project-init.mjs` は、初期化直後の状態が期待どおりかを確認する。

### 7.1 基本コマンド

```bash
node scripts/verify-project-init.mjs --target /path/to/new-repo --project-model development --ai-surface codex
```

Technology Profile指定時:

```bash
node scripts/verify-project-init.mjs \
  --target /path/to/new-repo \
  --ai-surface codex \
  --technology-profile cloudflare-workers \
  --technology-profile slack
```

### 7.2 検証内容

- 選択Model manifestの必須fileが存在すること
- developmentでは`CHANGELOG.md`に`Unreleased`節があること
- task-workspaceではdevelopment-only pathが既定生成されないこと
- `_AGENTS.md` が残っていないこと
- `_CLAUDE.md` が残っていないこと
- `--ai-surface claude|both` の場合に `CLAUDE.md` が存在すること
- `CLAUDE.md` が `@AGENTS.md` を含み、正本の行動規範を読み込むこと
- developmentでは`docs/TECHNOLOGY/INDEX.md`と`ADOPTION.md`が存在すること
- profile指定時に `docs/TECHNOLOGY/<profile-id>/` の文書とprofile固有skillが存在すること
- legacy `docs/PLATFORM_GUIDELINE.md` が残っていないこと
- `<PROJECT_NAME>`, `<PROJECT_SLUG>`, `<PRODUCT_NAME>`などの必須プレースホルダが残っていないこと
- `ROADMAP.md` や `PLAN_PHASE_CURRENT.md` などにテンプレート文言が残っている場合の警告

補足:
- 検証スクリプトは `rg` が利用可能なら `rg` を使い、未導入環境では `grep` にフォールバックする

### 7.3 出力方針

- 検証結果の個別行は英語で出力してよい
- 利用者への次アクションは日本語で出力する
- 次アクションでは、次に編集すべきファイルや着手順を明示する

## 8. 生成物

developmentでは最低限、以下が生成または展開される。

- `AGENTS.md`
- `CLAUDE.md`（`--ai-surface claude|both` の場合）
- `CHANGELOG.md`
- `docs/INDEX.md`
- `docs/DEVELOPMENT_GUIDELINE.md`
- `docs/DOCUMENTATION.md`
- `docs/ROADMAP.md`
- `docs/PLAN_PHASE_CURRENT.md`
- `docs/SPEC/`
- `docs/ADR/`
- `docs/REF/`
- `docs/WORK/`
- `docs/TECHNOLOGY/INDEX.md`
- `docs/TECHNOLOGY/ADOPTION.md`
- `docs/history/`
- `docs/agent_sessions/`
- `docs/BOOTSTRAP_ADOPTION.md`
- `docs/BOOTSTRAP_STATE.json`
- `.project-bootstrap/baselines/sha256/`
- `.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`
- `.agents/skills/` または `.claude/skills/`

Technology Profile指定時のみ:

- `docs/TECHNOLOGY/<profile-id>/profile.json`
- `docs/TECHNOLOGY/<profile-id>/GUIDELINE.md`
- profileに存在する場合は `REFERENCE.md` とprofile固有skill

task-workspaceでは`README.md`、`SESSION_HANDOFF.md`、`context/`、`outputs/`、`sessions/`、task用`docs/`とskillを生成する。development用のVERSION / ChangeLog / ROADMAP / phase WBS / Technology文書は既定生成しない。

## 9. 初期化後に最初にやること

1. `AGENTS.md` を読む
2. `docs/DEVELOPMENT_GUIDELINE.md` を読む
3. `docs/DOCUMENTATION.md` を読む
4. `docs/TECHNOLOGY/INDEX.md` と `ADOPTION.md` を読む
5. `project-bootstrap` skill を使い、`docs/WORK/0.1/idea.md` から対話的に発想を整理する
6. `docs/WORK/0.1/product_definition.md` に要求、技術候補、非機能要件を整理する
7. 採用技術が確定したら、`technology-profile-governance` skillでprofile追加要否を判断する
8. UI / Interaction がある場合は `interaction_design.md` を整理する
9. `phase_definition.md` で PoC、初期実用提供、フェーズの対応を定義する
10. `docs/ROADMAP.md` と `docs/PLAN_PHASE_CURRENT.md` を具体化する

## 10. 注意事項

- `--force-overwrite`は非空targetへ使用できない。既存projectでは`--adopt-existing`を使う
- `--apply-safe-only`後も`docs/BOOTSTRAP_ADOPTION.md`は生成されず、upgrade対象にはならない
- EXTRAはplan JSONへ完全一覧を保持するが、標準出力では既定で要約する
- complete applyはplanと一致するclean kit HEADを必須とする
- `keep`はkit標準との差異を受け入れる明示判断であり、理由がadoption記録へ残る
- `replace`対象は`.bootstrap-upgrade-diff/adoption-backup/`へ退避される
- profileは複数選択でき、共通ルールを置き換えない
- profileの実証referenceは変動する公式仕様の正本ではない
- `_AGENTS.md` は kit 内で自動解釈されないようにするための退避名であり、適用先では `AGENTS.md` へ変換される
- `_CLAUDE.md` も kit 内で自動解釈されないようにするための退避名であり、`--ai-surface claude|both` の場合だけ適用先で `CLAUDE.md` へ変換される
- 初期化スクリプトは `~/.claude/CLAUDE.md` と `~/.claude/rules/*.md` を作成・変更しない
- 適用先には `docs/BOOTSTRAP_ADOPTION.md` を生成し、適用 version を記録する
