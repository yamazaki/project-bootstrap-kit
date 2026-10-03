# CHANGELOG

## Unreleased

### Distribution

## v0.11.0 - 2026-10-03

### Distribution

- 旧adopterのscanにslug指定を追加し、pending adoption planへpreview付きの判断表一括記入を提供
- development Modelへ `project-bootstrap-kit-upgrade` skillを追加し、逐次統合、plan保管、更新経路の判別と並行文書作業の順序を案内。指定外managed pathの安全検査は維持

## v0.10.1 - 2026-09-27

### Distribution

- development Modelのasset追加後も54件を期待していた公開回帰testを、現行manifestの56件と一致させた

## v0.10.0 - 2026-09-26

### Distribution

- `development`とpreview `task-workspace`のProject Model catalog / manifest / composition、4 AI surface初期化を追加
- `--project-name`を人向け名称、`--project-slug`を機械識別子へ分離し、developmentの任意`--product-name`とlegacy CLI明示拒否を追加
- BOOTSTRAP_STATE schema 2へProject Model identity / manifest digestを追加し、schema 1のmetadata-only plan / owner name確認 / stale検査 / `SKIP(SAME)` migrationを追加
- Technology Profileとupgrade featureをProject Model別にfail-closed判定し、task-workspaceへのdevelopment資産混入を防止
- 全Modelへkit MIT全文を`.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`として生成し、root licenseを維持
- 公開向けにdesign philosophy、Project Model選択、project lifecycle、3つの導入journey、FAQ、troubleshooting、support・language方針を追加し、exact pathのdocumentation preview検証を追加
- 軽量なIssue / PR / security受付、privacy-safe feedback preparation、public contributionのownership分類・3-way import plan・attribution・idempotency基盤を追加

## v0.9.0 - 2026-09-23

### Distribution

- knowledge feedback exportにsource evidenceとKit Target Mapを分離した再現性section、およびユーザー確認前の`pre-review`と確認後の`final`検査を追加
- フェーズ完了時にmapped session rootと既存referenceを尊重してsession archive、active root、resume promptを確認する配布規則と既存adopter向け補正featureを追加

## v0.8.3 - 2026-09-22

### Distribution

- legacy adopter state migrationのsnapshot再現値と実apply時刻を分離し、既存adoption historyを保持したまま実操作を記録するよう修正
- v0.8.2でsynthetic timestampが露出したschema 1 stateを、通常のstate upgrade planからhuman record、Technology Profile record、baselineとともに訂正する互換経路を追加

## v0.8.2 - 2026-09-21

### Distribution

- `BOOTSTRAP_STATE.json`がない旧adopterをupgrade scanで検出し、adoption metadataを復元してstate migration plan schema 2を自動生成する導線を追加
- upgrade scriptからmigration planのsafe-only、manual merge受入、complete applyへ進めるようCLIを統合

## v0.8.1 - 2026-09-21

### Distribution

- manual merge対象path自身の変更だけを許可してimmutable evidenceと他managed pathを検証し、`--accept-adoption-manual-merge`が仕様どおり受入できるよう修正

## v0.8.0 - 2026-09-21

### Distribution

- fresh initとmature adoptionへ機械可読なbootstrap stateとcontent-addressed upstream baselineを追加
- ADDのpath単位add/skip判断、existing専用検証、managed fingerprint、project外plan bundle、EXTRA要約を追加
- ownership別のU0/U1/L0/L1判定、3-way evidence、safe update、manual merge、accepted-deviation、deferred、ownership transitionを追加
- plan schema 2とstate schema 1を導入し、v0.7.0以前のplanは最新kitでの再生成へ移行

## v0.7.0 - 2026-09-21

### Distribution

- 既存ファイルを持つ未適用projectへ、同名fileを上書きせず`ADD / SKIP(SAME) / CONFLICT / EXTRA`をplan確認して導入する`--adopt-existing`を追加
- `--apply-safe-only`、file単位のkeep理由・replace確認、replace前backup、complete adoption前検証を追加し、非空targetへの`--force-overwrite`を拒否

## v0.6.1 - 2026-09-21

### Distribution

- 未適用、空フォルダ、空Gitリポジトリへのupgrade scanをfail-closedで拒否し、新規projectには`init-project.mjs`の利用を案内

## v0.6.0 - 2026-09-20

### Distribution

- 適用先の初回kit versionと全upgrade featureの現在状態をscanし、確認用planから依存順で一括適用する機能を追加
- stale plan拒否、dry-runとapply previewの不整合隔離、一時コピーpreflightにより、独自編集や古いhandler資産の意図しない上書きを抑止

## v0.5.0 - 2026-09-20

### Distribution

- 新規プロジェクトにルート `CHANGELOG.md` を展開し、意味のある変更を `Unreleased` へ継続記録する標準運用を追加
- リリース時にChangeLog、version正本、tag、release名を整合させる規則を `VERSIONING.md` と `DEVELOPMENT_GUIDELINE.md` へ追加
- 既存プロジェクトへChangeLog運用を安全に追加する `versioning` upgrade featureを更新
- 明示承認後の Git commit に、日本語で目的、理由、変更内容、確認内容を残す品質要件を追加
- 既存プロジェクトにコミットの承認境界とメッセージ規約を追加する `git-commit-guidance` upgrade featureを追加
- 計画開発と運用中の後続作業を Epic / MNT / OPS / ADVへ振り分ける標準規約を追加
- 利用者による明示起動とAIによる自動判定の両方に対応する `maintenance-work`、`operations-work`、`experience-advisory` skillを追加
- MNT / OPS / ADVの索引・件別記録・成果物正本の配置を `docs/WORK/` に追加
- 既存プロジェクトへ一括導入する `work-line-routing` upgrade featureを追加

## v0.4.1 - 2026-09-13

## v0.4.0 - 2026-09-13

## v0.3.0 - 2026-09-12

## v0.2.0 - 2026-09-12

## v0.1.0 - 2026-04-05
