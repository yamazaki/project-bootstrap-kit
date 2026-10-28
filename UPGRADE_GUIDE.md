# UPGRADE GUIDE

## 目的

`project-bootstrap-kit` の更新を、既存プロジェクトへ取り込む際の判断材料と手順を記録する。

## 基本方針

- 新規プロジェクトへの適用は `init-project.mjs` を使う
- 既存プロジェクトへの更新反映は、feature 単位の `upgrade-project.mjs` を優先して検討する
- `AGENTS.md`, `docs/DEVELOPMENT_GUIDELINE.md`, `docs/DOCUMENTATION.md` のような人手で調整されやすいファイルは、自動上書きしない
- 自動 patch が難しい場合は、dry-run の差分表示を確認した上で手動調整する
- dry-run で具体的な想定変更を確認したい場合は `--diff` を使う
- `--diff` の既定出力先である `.bootstrap-upgrade-diff/` は git 管理対象外とする

## Unreleased

## v0.14.0

- 新しいclean kitで再scanし、allowedDecisionsを確認する。safe-updateはkit-managed / managed-merge / project-ownedのUPSTREAM_CHANGEDかつlocalが受入済みupstreamとhash / kind / mode一致する場合に`--confirm`付きで使える。ownershipは保持する。使えない判断は受入時に拒否される。
- scanのOWNERSHIP_RECOVERY候補は、管理方針を確認して`--update-path-state --path <path> --ownership kit-managed --reason "理由"`で戻せる。対象は受入済みupstreamと完全一致するmanaged-merge / project-ownedのみ。state更新後は再scanする。現行upstreamだけと一致する内容は通常planで受け入れる。
- manual-mergedは通常管理pathがU1と完全一致ならkit-managed、不一致ならmanaged-mergeとし、project-owned / mapped / intentionally-absentは保持する。変更前後はCLIと適用履歴で確認する。既存のownershipを自動で修復せず、state / baselineを手編集しない。
- adoption replaceはkit-managedとしてstateを確立する。旧移行の誤ownershipは上記復帰操作で修復する。state形式・profile versionは変更しない。共通案内とupgrade skillは通常state scanでreviewするため専用featureは不要。rollbackはファイル・state・baseline・人向け履歴を同じ退避点へ復元し再scanする。

## v0.13.0

### セキュリティ確認

- `security-gate`のSKILLと新しい`references/execution-environments.md`、`docs/SECURITY_ASSURANCE.md`を通常scan / planでreviewする。Claude専用projectでは`.claude/skills/`、bothでは両surfaceへ反映する。stateなしfeatureは不足referenceを追加するが既存skill本文を保持するため、旧skillの環境案内への参照は手動で統合する。独自referenceも上書きしない。Cloudアカウント・外部設定・policy JSON schema・profile versionの変更は不要。
- Cloudflare reportのmetadataには実際の監査完了ISO時刻`completed_at`を記録する。旧reportの実日時を確認できなければ再監査し、取込時刻を代入して新しく見せない。再取込でも証跡の古さを維持する。

- stateありdevelopmentは新しいclean kitから通常scan / planでsecurity-gate・policy・入口参照を受け入れる。独自security文書や設定はmanual merge等で保持する。
- `security-audit-cloudflare`と`security-dependencies-osv`は既存のprofile追加登録→scan→plan applyで後付けする。登録だけでは外部toolを導入しない。
- stateなしの限定導入は`--feature security-assurance --ai-surface <surface> --dry-run --diff`を確認し、承認後にapplyする。未導入toolの固定版取得と監査は共通gateの別planで承認後に行う。
- Mantisのinstallは通常案内に含めない。raw report・runtime tool・DBはstate baselineへ含めずprivateに保持する。rollbackは導入前のfile / adoption / state / baselineを一体で復元する。


- schema 2でprofileを後付けする場合は、`--target <project> --update-technology-profiles --add <id> --reason "理由"`をpreviewし、同じcommandへ`--apply`を付けて選択だけを登録する。複数追加は`--add`を繰り返す。
- 登録後に通常scanで新profileの文書・skillとTECHNOLOGY INDEX / ADOPTIONの差分をreviewし、path判断後に`--apply-plan`する。配置済みだが追跡外のprofileも同じ経路で修復できる。既存の独自編集は`NEW_UPSTREAM_PATH`でも`manual-merged`で保持できる。`add --confirm`はupstreamを配置するため既存内容との比較を先に行う。
- stateありの`--feature technology-profiles`はdry-run / applyとも停止する。stateありscanの`--technology-profile`も停止し、登録CLIへ案内する。schema 1は先にmetadata移行する。stateなしの旧projectは従来featureまたはprofileを指定したadoption planを使う。
- 登録前のplanは再生成する。state / integrityの手編集は行わない。登録だけでは文書・skillの配置や受入を完了しない。詳細は[profile追加・修復手順](docs/guides/upgrading.md#21-進行中projectへのtechnology-profile追加修復)を参照する。
- 新規案内と2つのskillは通常state upgradeでreviewする。state形式と各profile本体のversionは変更しない。rollbackは登録のみならstateを、plan適用後はstate / baseline / 対象ファイル / 人向け履歴を同じ退避点から復元する。

## v0.12.0

### schema 1に人向け名称を保存した既存project

- schema 1 -> 2のscanで旧`project.name`がslugとして拒否される場合は、`--project-name "確認済み名称" --project-slug confirmed-project`を明示する。初期slugはplanで確認してからmetadata-only migrationをapplyする。旧stateの名称やintegrityを手で変更しない。schema 2へ移行後のslug変更は引き続き拒否する。

### 知見captureとfeedback保存先

- captureの`type`へ`learning`を追加。既存captureを一括変換する必要はない。作業中に知見・条件・根拠を短く残し、タスク・マイルストーンのクローズ時に関連する`open / triaged`を回収する。
- internal/export knowledge feedbackの新規保存先を、時期・作業線によらず`docs/project-bootstrap-kit-feedback/`へ統一。directoryは初回作成時に用意する。
- stateful adopterは通常のstate scanでAGENTS、DEVELOPMENT_GUIDELINE、DOCUMENTATION、capture inbox README、capture-inbox / knowledge-feedback / phase-transition skillの差分をreviewする。独自編集は3-wayまたはmanual mergeで保持する。
- stateなし旧adopterは`node scripts/upgrade-project.mjs --target <project> --feature capture-inbox --ai-surface <surface> --dry-run --diff`と、同じ引数で`--feature technology-profiles`を指定したpreviewで差分を確認する。後者は広範な文書・skill更新を含むため、無関係な差分がある場合は上記対象だけを手動で統合する。`phase-transition`のfeedback保存先・capture棚卸し手順もreviewする。独自編集skillは一括上書きしない。
- 過去のfeedbackは自動移動しない。移動前に旧path、移動先、参照元、内容を一覧化し、同名ファイルは内容を確認して統合またはslugで区別する。固定directoryへ移動後、internal版内のexport参照・Evidence Mapの相対参照・索引・作業文書のリンクを更新し、参照切れと旧path残存を確認する。監査等で移動できない文書は旧pathを維持し、理由と新保存先を索引に残す。
- rollbackは移動前一覧とGit等の退避点からファイルと参照を戻す。kit側の受領先は変更しない。匿名化・ユーザー確認・final検査は引き続き必須。

## v0.11.0

- development Modelへ `project-bootstrap-kit-upgrade` skillを追加。既存stateful adopterは新しいclean kitで `--scan` し、skillのADDと既存規範・phase-transition差分をreviewして適用する。独自編集skillを一括同期で上書きしない。
- stateなし旧adopterはscan時に `--project-slug` を明示できる。stateありprojectのidentity変更には使わない。
- pending adoption planの判断は `--set-adoption-decisions <plan> --decisions <json>` でpreviewし、`--apply`でplanだけを保存できる。判断語彙と例は[adoption guide](docs/guides/existing-project-adoption.md)を参照する。
- manual mergeは1file編集→受入→次の順を維持する。旧planはkit commitが異なるため再scanし、既存編集と判断を保全して再確認する。完了後の確認scanもplan/bundleを生成する。[upgrade guide](docs/guides/upgrading.md)に経路・保管・順序を記載。

## v0.10.1

公開回帰testの期待値だけを現行Project Model manifestへ合わせたPATCH releaseである。配布内容、初期化、upgradeの挙動は変わらないため、既存プロジェクト側の対応は不要。

## v0.10.0

### Project Modelとstate schema 2

- fresh initは`--project-name`を人向け名称、`--project-slug`をlowercase kebab-case識別子として必須化する
- Model省略時は`development`。developmentの`--product-name`は任意で、省略時はProject Nameを使用する
- `task-workspace`はpreviewで、`--product-name`とTechnology Profileを受け付けない
- schema 1 adopterは`upgrade-project.mjs --scan --project-name "確認済み名称"`でmetadata-only migration planを作成し、review後に`--apply-plan`する
- schema 1 migrationはcontent fileを変更せず、stateとadoption metadataへname / slug / product / Model identityを追加する
- 既存upgrade featureはdevelopment専用。task-workspaceで実行するとnot-applicableとして停止する
- 全Modelで`.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`を生成し、project rootのlicenseは変更しない

## v0.9.0

### knowledge-feedback export再現性

- v0.8.0以降のstateful adopterは通常のupgrade scanでpath差分を確認し、`knowledge-feedback` skillの更新をproject固有差分と3-way reviewする
- feature単位で管理する旧adopterは`skills-sync`をdry-runし、更新差分を確認する
- export作成中は`--mode pre-review`、ユーザー確認後は`--mode final`を使用する
- mode未指定は後方互換のため`final`として扱う
- source project側ではKit Target Mapの形式、kit受付側ではtarget pathの実在を確認する

### 完了フェーズsession archive governance

- v0.8.0以降のstateful adopterは通常のupgrade scanを使い、mapped session rootを維持したpath単位planをreviewする
- feature単位で管理する旧adopterは、`phase-transition`の後に`phase-session-archive-governance`をdry-runする
- featureは文書とskillへcheckを追加するだけで、session fileを自動移動しない
- 適用後はmapped session root、reference scan、active rootの残存範囲、resume promptを利用者が確認する
- Phaseを持たないproject、immutable reference、監査要件があるprojectではnot-applicable理由または代替索引を記録する

## v0.8.3

### v0.8.2 synthetic timestamp訂正

- stateなしlegacy adopterは最新kitで`upgrade-project.mjs --scan`をやり直し、既存adoption historyの保持と`legacy-state-migration`を確認してからapplyする
- v0.8.2でstate生成済みかつhuman recordに`2000-01-01 00:00:00Z`があるprojectは、通常のstate scanに表示される`CORRECTION`を確認してapplyする
- 訂正時刻にはstate `history`の`mature-adoption.at`を使用し、Technology Profile record、`project.snapshotAppliedAt`、baselineを同時に更新する
- 訂正後に再scanし、全managed pathが`CURRENT`で`CORRECTION`が再表示されないことを確認する
- stateやbaseline objectを手動編集しない。scan後にadoption recordを変更した場合はstale planとして再scanする

## v0.8.2

### stateなし旧adopterのmigration routing

- `docs/BOOTSTRAP_ADOPTION.md`あり・`docs/BOOTSTRAP_STATE.json`なしのprojectでも`upgrade-project.mjs --scan`を使用できる
- Project Name、Product Name、AI surface、旧Technology/Platform Profileをadoption記録とskill配置から復元する
- CLIの`--ai-surface`、`--technology-profile`、`--project-name`、`--product-name`指定を優先する
- scanは通常upgradeではなく、state/baseline確立用adoption plan schema 2を生成する
- `upgrade-project.mjs --apply-plan <plan> --apply-safe-only`と`--accept-adoption-manual-merge`でmigrationを継続できる
- state確立後の次回scanは自動的に3-way upgradeへ切り替わる

## v0.8.1

### adoption manual merge受入修正

- v0.8.0 planはkit commit契約により再利用せず、v0.8.1で再生成する
- safe-only済みADDはtarget上で`SKIP(SAME)`として再評価されるため維持できる
- conflict/add/skip判断は旧planを参照して新planへ再設定する
- manual mergeは1pathずつtargetへ統合し、直後に`--accept-adoption-manual-merge`で受け入れる
- 指定path以外のmanaged pathも同時に変更するとstaleとして拒否される

## v0.8.0

### bootstrap stateと3-way upgrade

- fresh initとexisting adoptionで`docs/BOOTSTRAP_STATE.json`とupstream baselineを生成する
- v0.7.0以前のplan schema 1は再利用せず、最新kitでadoption planを再生成する
- stateがない適用先はupgrade scanではなく`--adopt-existing`で最初のbaselineを確立する
- state確立後はU0/U1/L0/L1から`CURRENT / UPSTREAM_CHANGED / LOCAL_CHANGED / DIVERGED`を判定する
- project-owned、mapped、intentionally-absentを自動上書きしない
- accepted-deviationはbaselineを進め、deferredは次回scanでも再表示する
- manual mergeとownership transitionは明示CLIでreason/hash/historyを記録する
- plan schema 2、bootstrap state schema 1を使用する。このstateはUnreleasedのschema 2 migration対象となる

## v0.7.0

### 既存projectの安全な初回adoption

既存ファイルを持つ未適用projectでは、通常initや`--force-overwrite`ではなく`init-project.mjs --adopt-existing`を使用する。

- plan生成ではproject fileを変更しない
- 同名fileの差異は`CONFLICT`として保持する
- `--apply-safe-only`は`ADD`だけを先行適用し、正式adoptionをpendingのままにする
- `keep`には理由、`replace`にはpath単位の確認を必須とする
- replace対象は`.bootstrap-upgrade-diff/adoption-backup/`へ退避する
- complete adoption後だけupgrade scanを利用できる

## v0.6.1

### upgrade scanの適用前提

`--scan` は、`docs/BOOTSTRAP_ADOPTION.md` に `Bootstrap Kit: project-bootstrap-kit` が記録された適用済みprojectだけを対象とする。

- 空フォルダ、空Gitリポジトリ、未適用projectではplanを生成せず停止する
- 新規の空Gitリポジトリには `init-project.mjs` の利用方法を表示する
- adoption記録が欠落した既存適用先は、推測で続行せず適用履歴を確認・修復する
- 既存ファイルを持つ未適用projectでは、`init-project.mjs --force-overwrite`が同名ファイルを上書きし得るため、バックアップと競合確認なしに実行しない

## v0.6.0

### 適用状態scanとplan確認型の一括upgrade

適用先の初回kit versionと全featureの現在状態を確認し、安全な更新候補を依存順でplanへ保存できる。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --scan
```

表示されたplan JSONを確認し、問題がなければ明示的に適用する。

```bash
node scripts/upgrade-project.mjs \
  --apply-plan /path/to/repo/.bootstrap-upgrade-diff/upgrade-plan_<timestamp>.json
```

- adoption記録があれば初回version、AI surface、Technology Profileを自動検出する
- 現在状態は各featureのdry-runとapply previewを照合して判定する
- `AVAILABLE` の安全な推奨featureだけが既定planに入る
- `REVIEW` は警告またはdry-run / apply preview不整合を示し、既定では適用しない
- destructiveなcleanup等のmanual featureは一括planへ自動追加しない
- scan後に対象が変わった場合は適用を拒否するため、再scanする
- 一時コピーへのpreflight完了後に実targetへ適用する
- 選択feature間の共通文書・skill更新は、選択済みfeatureだけをfollow-up passで収束させる
- apply前に対象projectでrollback可能なbranchまたはcommitを確保する

## v0.5.0

このreleaseには、配布先向けのChangeLog運用、Git commit guidance、作業線ルーティングと、kit自身の自己管理整備が含まれる。自己管理整備は既存適用先へ反映しない。

### versioning

既存プロジェクトへルート `CHANGELOG.md` と継続的な `Unreleased` 記録を追加し、version管理規則を更新する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature versioning \
  --ai-surface codex \
  --diff
```

- 既存のversion正本とプロジェクト固有規則は保持する
- `CHANGELOG.md` がない場合は追加し、既存ファイルがある場合は安全に差分判定する
- dry-runとdiffを確認してからapplyする

### git-commit-guidance

既存プロジェクトに、Git commit の明示的承認を維持したまま、承認後の commit message を日本語で明確に記録する規約を導入する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature git-commit-guidance \
  --diff
```

- 主な更新対象は `AGENTS.md` と `docs/DEVELOPMENT_GUIDELINE.md`
- ファイル変更の承認と commit の承認を分離する
- Conventional Commits 等の既存形式は維持し、変更の説明部分と本文を日本語にする
- 既存の独自記載は保持し、不足する節だけを追記する
- dry-run と diff を確認してから `--apply` で反映する

### work-line-routing

既存プロジェクトへ Epic / MNT / OPS / ADVの判別規則、MNT・OPS・ADVの記録場所とskillを一括導入する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature work-line-routing \
  --ai-surface codex \
  --diff
```

- `--ai-surface` は `codex | rovo | claude | both` から指定する。省略時は既存の `.agents/skills/` と `.claude/skills/` を検出する
- 利用者によるskillの明示起動と、依頼内容からのAI判定は同じ手順へ収束する
- 同名の独自文書・skillは `WARN(KEEP)` として保全する
- 既存案件の分類や移行は自動で行わない
- dry-runとdiffを確認してからapplyする

## v0.4.1

kit内部の `docs/INDEX.md` のリンク修正のみ。配布先プロジェクトへのupgradeは不要。

## v0.4.0

### technology-profiles

単一 `docs/PLATFORM_GUIDELINE.md` を、複数選択可能な `docs/TECHNOLOGY/` 方式へ移行する。

profile未指定で基盤だけ導入する場合:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --ai-surface codex \
  --diff
```

既存profileを移行、またはWORK/0.1で確定したprofileを追加する場合:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --technology-profile cloudflare-workers \
  --technology-profile slack \
  --ai-surface both \
  --diff
```

- `--technology-profile` は任意かつ複数回指定できる
- `docs/PLATFORM_GUIDELINE.md` が選択profileと同一なら削除する
- 独自編集されたlegacy guidelineは `LEGACY_PLATFORM_GUIDELINE.md` へ移動して保全する
- legacy guidelineをprofileへ安全に対応付けできない場合はapplyを停止する
- profile側文書が独自編集されている場合は `SKIP(KEEP)` とし、自動上書きしない
- apply後は `docs/TECHNOLOGY/ADOPTION.md` に初期採否と未決事項を記入する
- `project-bootstrap` と `phase-transition` skillもTechnology Profileライフサイクル対応版へ同期する
- `knowledge-feedback` はkit全体の改善を対象とし、internal版と匿名化済みexport版を分離する
- export版は利用プロジェクト側のskill付属 `verify-feedback-export.mjs` とユーザー確認を通過してからkitへ移送する
- kit側では受領時に `scripts/verify-feedback-export.mjs` を再実行する

## v0.3.0

### versioning

配布先プロジェクトのversion管理に、ルート `CHANGELOG.md`、リリース境界、未リリース変更、モノレポの更新単位、リリース確定手順を追加する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature versioning \
  --ai-surface codex \
  --diff
```

`--ai-surface` は利用する環境に合わせて `codex | rovo | claude | both` から指定する。既存の `docs/VERSIONING.md` は全面上書きせず、プロジェクト固有のversion正本やrelease方式を保持したまま、不足する汎用方針を追加する。`CHANGELOG.md` がなければ標準雛形を追加し、既存ファイルは上書きしない。既存ファイルに `Unreleased` がない場合は、dry-runの警告に従って手動で運用を合わせる。

## v0.2.0

### claude-project-instructions

Claude Code向けに、`AGENTS.md` を読み込むプロジェクト直下の `CLAUDE.md` を追加する feature。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature claude-project-instructions \
  --ai-surface claude \
  --diff
```

`--ai-surface` は `claude` または `both` を指定する。`CLAUDE.md` が存在しない場合は追加し、既知の旧内容は一般化した内容へ更新する。独自編集された内容は `SKIP(KEEP)` として保全する。このfeatureは `~/.claude/` 配下を操作しない。

### initial-planning-document-names

`docs/WORK/0.1/` の初期構想文書を `_template` なしの正規名へ移行し、WBS を `docs/PLAN_PHASE_CURRENT.md` に一本化する feature。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature initial-planning-document-names \
  --diff
```

旧名だけが存在する文書は内容を保持してリネームする。旧名と新名が両方存在して内容が異なる場合と、記入済みの `wbs_breakdown_template.md` がある場合は `WARN` とし、自動上書き・削除を行わない。既存の `project-bootstrap` skill がある場合は、非機能要件の出力先と WBS の正本も更新する。

### project-bootstrap-planning

初期構想を、対話的な要求開発、技術候補比較、非機能要件、PoC と初期実用提供の段階設計へ更新する feature。

dry-run と想定差分:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature project-bootstrap-planning \
  --ai-surface codex \
  --diff
```

主な更新対象:

- `AGENTS.md`
- `docs/DEVELOPMENT_GUIDELINE.md`
- `docs/DOCUMENTATION.md`
- `docs/WORK/0.1/product_definition.md`
- `docs/WORK/0.1/README.md`
- `.agents/skills/project-bootstrap/` または `.claude/skills/project-bootstrap/`

既存の `concept_template.md`、記入済みの idea、phase、interaction、roadmap、checklist は削除・上書きしない。`SKIP(KEEP)` は、既存文書を意図的に保持することを示す。

### web-ui-planning

Web GUI のデザインモック / 仮実装と、外部公開 / 外部連携エンドポイントの FQDN 設計を WBS 検討に組み込むための feature。

既存プロジェクトへ反映する場合:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature web-ui-planning \
  --ai-surface codex \
  --diff
```

`--ai-surface` は `codex`, `rovo`, `claude`, `both` のいずれかを指定する。指定した場合は `project-bootstrap` skill も更新する。

主な更新対象:

- `AGENTS.md`
- `docs/DEVELOPMENT_GUIDELINE.md`
- `docs/DOCUMENTATION.md`
- `docs/WORK/0.1/interaction_design.md`
- `docs/WORK/0.1/implementation_ready_checklist.md`
- `.agents/skills/project-bootstrap/` または `.claude/skills/project-bootstrap/`

## v0.1.0

初版。既存プロジェクトへ upgrade する対象ではなく、以後の upgrade の基準点とする。

## 将来の運用

今後 version が上がるごとに、以下を記録する。

- 何が変わったか
- 既存プロジェクトで反映が必要な項目
- 手動で確認すべきファイル
- 自動化可能かどうか
