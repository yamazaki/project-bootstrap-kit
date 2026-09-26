# SPEC 003: Upgrade Feature Contract

## 1. 目的

`upgrade-project.mjs` と各 upgrade feature が満たすべき基本契約を定義する。

## 2. feature 単位の適用

- upgrade は version 全体ではなく feature 単位で適用する
- feature は `upgrades/<feature-name>/` 単位で定義する

## 3. dry-run 契約

新しい feature を追加する際は、可能な限り dry-run で既存状態との差分を判定できることを目指す。

dry-run では、少なくとも以下の状態が判別できることを推奨する。

- `ADD`
- `UPDATE`
- `SKIP(SAME)`
- `WARN`

### 3.1 最低要件

- feature 名
- 対象ファイルまたは対象ディレクトリ
- 何を追加・変更する想定か

### 3.2 推奨要件

- 既存プロジェクト側が既に同等状態かどうか
- apply しても意味がない場合は `SKIP(SAME)` を返せること
- 独自編集が強く自動判定しづらい場合は `WARN` を返せること
- テキスト比較では、Markdown 記法や軽微な空白差異だけで `UPDATE` 扱いしないこと

### 3.3 dry-run diff

`--diff` が指定された場合、`upgrade-project.mjs` は対象プロジェクトの一時コピーへ feature の `apply` を実行し、元プロジェクトとの差分を unified diff として生成する。

- 標準出力には変更予定ファイルと diff ファイルの保存先を表示する
- 既定の保存先は `<target>/.bootstrap-upgrade-diff/<feature>_<timestamp>.diff` とする
- `--diff-output <path>` が指定された場合は、そのパスへ保存する
- `.bootstrap-upgrade-diff/` は git 管理対象外とする

## 4. apply 契約

- apply は dry-run の結果を踏まえて実行する前提とする
- `EXTRA` やローカル固有の資産は、原則として自動削除しない
- destructive な処理を行う場合は、バックアップや退避の方針を持つ
- apply は対象プロジェクト配下のファイル操作に閉じる
- apply に外部サービス操作、ネットワーク操作、git 操作を含めてはならない
- 上記に反する処理が必要な場合は、upgrade feature ではなく手動 Runbook として扱う

## 5. 履歴記録

feature を apply した場合は、可能な限り `docs/BOOTSTRAP_ADOPTION.md` に履歴を残す。

履歴には少なくとも以下を記録する。

- 適用日時
- feature 名
- 追加または変更した主要項目

## 6. 全feature scanとplan

`upgrade-project.mjs --scan` は、対象の `docs/BOOTSTRAP_ADOPTION.md` と全featureのdry-run / apply previewを読み取り、現在状態と適用候補をplan JSONへ保存する。

- scan対象はGitリポジトリであり、`docs/BOOTSTRAP_ADOPTION.md` に `Bootstrap Kit: project-bootstrap-kit` が記録された適用済みprojectに限定する
- 空フォルダ、空Gitリポジトリ、adoption未確認projectはplanを生成せず停止し、新規projectには `init-project.mjs` を案内する
- 初回kit versionはadoption記録から取得する
- adoption記録が欠落した既存適用先は、自動推定せず記録の確認・修復を求める
- 既存ファイルを持つ未適用projectでは、現行initの `--force-overwrite` に上書きリスクがあることを警告する
- 現在性は履歴文字列だけでなく、現行featureを適用した場合の実体差分で判定する
- adoption履歴だけが不足し、他の実体差分がない場合は `current` とする
- dry-run判定とapply previewが矛盾する場合は `review` とし、既定の一括適用対象にしない
- project固有資産を示す `EXTRA` は削除せず、それだけを理由にupgrade対象としない
- featureは `upgrades/catalog.json` の順序と依存関係で評価する
- 依存featureをplanへ選択した場合は一時コピーへ順次反映し、後続featureをその予定状態に対して評価する

状態は `current / available / review / blocked / not-applicable` を使用する。planは既定で `<target>/.bootstrap-upgrade-diff/upgrade-plan_<timestamp>.json` に保存する。`available` のうちcatalogで `recommended` のfeatureだけを `selectedFeatures` に入れる。`review` は `--include-review` を指定した場合だけ選択可能とし、`manual` featureは自動選択しない。

## 7. plan apply契約

`--apply-plan <path>` は、利用者がscan結果とplanを確認した後の明示操作とする。

- plan生成時のtarget絶対path、kit version、target fingerprintが一致しない場合は停止する
- feature名、catalog順、依存関係を再検証する
- `.git`、`node_modules`、`.bootstrap-upgrade-diff` を除く一時コピーへ全featureをpreflightし、全件成功後に実targetへ適用する
- 後続featureが先行featureの共通文書やskillを更新した場合は、選択済みfeatureだけを限定的に再評価・再適用し、収束しなければ停止する
- applyは既存feature handlerを順番に呼び、外部サービス操作、network操作、git操作を追加しない
- 実targetへの適用中に予期しないI/O failureが発生した場合は停止する。完全なfilesystem transactionではないため、利用者はapply前にGit等でrollback点を確保する

## 8. 命名規約との関係

- docs / guideline / versioning のようなルール導入 feature は、feature 名で目的が読めること
- skills に関する feature は `skills-` prefix を使うことを推奨する
- cleanup や migration 後処理は、対象が読める名前を使う

## 9. v0.8.0以降のbootstrap stateとの関係

- `docs/BOOTSTRAP_STATE.json`を持つprojectでは、scan/applyの正本を`SPEC_006_bootstrap_state_and_three_way_upgrade.md`とする
- repository全体fingerprintではなくmanaged path evidenceを使用する
- plan schema 2を使用し、schema 1 planは再生成を求める
- feature handlerはfeature stateとevidenceの補助契約として維持する
- stateがない旧adopterはlatest kitへの再adoptionで最初のbaselineを確立する
