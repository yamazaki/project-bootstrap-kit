# SPEC 005: Existing Project Adoption Contract

## 1. 目的

`project-bootstrap-kit`未適用で、既存ファイルを持つGitリポジトリへ、既存内容を無断で上書きせずkitを導入する契約を定義する。

## 2. 通常initとの境界

- 空Gitリポジトリは通常の`init-project.mjs`を使用する
- 非空の未適用Gitリポジトリは`--adopt-existing`を使用する
- 適用済みprojectは`upgrade-project.mjs --scan`を使用する
- 非空targetへの`--force-overwrite`は許可しない
- `--adopt-existing`は既存内容を一括上書きする旧`--force-overwrite`と同じ処理ではない

## 3. plan生成

`--adopt-existing`は、指定条件でfresh bootstrapを一時生成し、targetと比較したplanと期待状態snapshotをbundleへ保存する。plan bundleはtarget外にも配置でき、plan生成ではtargetのproject fileを変更しない。

各pathは次へ分類する。

- `ADD`: fresh生成物にあり、targetにない
- `SKIP(SAME)`: fresh生成物とtargetが同等
- `CONFLICT`: 同じpathに異なる内容またはfile種別がある
- `EXTRA`: targetにだけ存在し、kit管理対象ではない

成熟projectのADDはengine-managed pathを除き`unresolved`を既定とする。`add`には`confirmAdd: true`、`skip`には1行reasonを必須とする。skipは任意で`satisfiedBy`または`supersededBy`を持てる。

## 4. conflict解決

CONFLICTはfile単位で次のresolutionを持つ。

- `unresolved`: 既定値。通常applyを停止する
- `keep`: target内容を保持する。空でない`reason`を必須とする
- `replace`: kit snapshotへ置換する。`confirmReplace: true`を必須とする
- `manual-merge`: 自動applyせず、手動統合後のplan再生成を求める

schema 2では、明示CLIによるmanual merge受入時だけ指定CONFLICT path自身の変更を許可する。plan記録済みimmutable evidenceと指定外managed pathは従来どおり一致を要求し、受入後にcurrent kind/mode/hashとmanaged fingerprintを更新する。

初回adoptionの`docs/BOOTSTRAP_ADOPTION.md`はadoption状態の正本であるため`keep`を許可しない。stateなしlegacy adopter migrationでは例外としてengineが既存recordを保持し、実時刻のmigration履歴とcomplete metadataを追記する。directoryとfileの競合も自動replaceせず、手動解決とplan再生成を求める。

## 5. safe-only

`--apply-safe-only`は`resolution: add`かつ`confirmAdd: true`のADDだけを一時コピーでpreflightしてからtargetへ追加する。

- CONFLICTとEXTRAは変更しない
- `docs/BOOTSTRAP_ADOPTION.md`は生成しない
- planの`adoptionStatus`は`pending`のままとする
- target fingerprintを更新し、同じplanで後続判断を継続できる
- pending中は通常のupgrade scan対象にならない

## 6. 完了apply

- target path、kit version/commit、managed fingerprint、snapshot hash、planの全pathを再検証する
- 未解決、理由不足、replace未確認、manual-merge、改変snapshotがあれば停止する
- targetの一時コピーへ全判断を適用し、`verify-project-init.mjs`成功後に実targetへ反映する
- replace対象は`.bootstrap-upgrade-diff/adoption-backup/`へpathを維持して退避する
- EXTRAは変更しない
- complete adoption記録にkeep理由とreplace pathを残す
- complete後に`upgrade-project.mjs --scan`を利用可能とする
- complete時に`docs/BOOTSTRAP_STATE.json`とupstream baselineを生成する
- complete applyはcleanなkit HEADとsnapshot再生成一致を必須とする
- expected snapshotの決定的な時刻値とcomplete applyの実時刻を分離する。人間向けadoption/profile履歴にはcomplete apply開始時に1回だけ確定した実時刻を使う
- stateなしlegacy adopterでは既存`BOOTSTRAP_ADOPTION.md`の初回version、初回適用日時、upgrade historyを保持し、latest kitの初回bootstrapではなくstate migrationとして追記する

existing-project verificationはplan判断だけを検査し、EXTRAやrepository全体のplaceholderを走査しない。選択Technology Profileの必須file/skillは存在を確認する。

## 7. 外部操作とGit

adoption plan生成とapplyは、対象project配下のfile操作に閉じる。Git commit、branch、push、network、外部service操作を行わない。

一時コピーpreflight後も実targetへのfile操作は完全なfilesystem transactionではない。apply前に利用者がGit commitまたはbranch等のrollback点を確保し、ADDはGit差分、replaceはadoption backupから回復できるようにする。
