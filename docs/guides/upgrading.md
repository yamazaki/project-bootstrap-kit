# Upgrade an Adopted Project

## 1. Scan

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted-project \
  --scan \
  --plan-output /tmp/adopted-project-upgrade/plan.json
```

scanはproject contentを変更せず、planとbundleを保存する。state schema 2ではaccepted upstream `U0`、current upstream `U1`、accepted local `L0`、current local `L1`から状態を判定する。

kit version/commitとclean状態、targetのGit差分・rollback点を先に確認する。フェーズクローズや計画改訂などmanaged pathを編集する作業が並行する場合、kit更新を先に完了するか、その作業後にscanするかを決める。scan後の文書改訂でplanがstaleになるため、同時に進めない。利用者の既存編集を無断で戻さない。

## 1.1 旧adopterのstate移行

適用記録あり・stateなしではscanがlegacy migrationのadoption planを作る。改名やmetadata不足があれば明示する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/legacy-project --scan \
  --project-name "現在のプロジェクト名" --project-slug current-project \
  --plan-output /tmp/legacy-migration/plan.json
```

slug指定はstateなし経路だけで、lowercase kebab-caseを使う。未指定時は従来どおり適用記録のProject Nameを推定値にする。stateあり経路では指定を拒否し、identity変更を別migrationとして扱う。過去適用記録の名称をscanのためだけに書き換える必要はない。

CONFLICTはtargetのGit履歴、確認済みkit適用commit時点の内容、現在内容、plan bundleのsnapshotを比較する。未カスタマイズならreplace候補、project固有の正本ならkeep候補、kitの新規則も必要なら統合候補となる。ただしsquash・rename・浅い履歴・未commit編集・適用commitへ独自編集が同居する場合があるため、履歴だけでreplaceを承認しない。差分の目視確認を伴わせ、旧upstreamを推測復元しない。

legacy migrationは[adoption guideの判断表と逐次統合](./existing-project-adoption.md)を使い、`--apply-plan`で完了する。必要に応じて `--apply-plan <plan> --apply-safe-only` で承認済みADDだけ先行できる。state成立後の次scanは通常upgradeへ切り替わる。

## 1.2 planとCLIの対応

planの `operation` とschemaを読み、生成元の経路に合う操作を選ぶ。`schemaVersion: 2` だけではadoptionとstate-upgradeを区別できない。

| operation | 判断・受入CLI | apply |
| --- | --- | --- |
| adopt-existing | `--set-adoption-decisions`、`--accept-adoption-manual-merge` | legacyは `--apply-plan`。safe-only可 |
| state-upgrade | `--accept-path-decision` | `--apply-plan`。safe-only不可 |
| bootstrap-state-schema-migration | 人向け名称を確認し再scan。path受入CLIは使わない | `--apply-plan`。metadataのみ |

いずれの手動統合も1ファイルずつ「編集→専用CLIで受入→次」の順とする。AIによる統合編集も可能。2ファイルを先に編集すると最初の受入が停止する。編集を保全し原因を確認してから新planで再判断し、fingerprintの書換えで検査を回避しない。

## 2. 状態

- `CURRENT`: upstream / localとも変化なし
- `UPSTREAM_CHANGED`: upstreamだけ変化
- `LOCAL_CHANGED`: localだけ変化
- `DIVERGED`: 両方変化
- `NEW_UPSTREAM_PATH`: 新しいkit path

ownershipと状態に応じ、safe-update、manual merge、accepted deviation、deferred、add、skipを選ぶ。自動上書きではなくplanへ判断を記録する。

`--update-path-state` などでownership/stateを更新した場合は再scanし、新planへ判断する。state更新前のplanをそのまま使うとstaleとして停止する。

## 3. Schema 1から2

schema 1 stateではmetadata-only migration planを生成する。人向けProject Nameを確認し、明示して再scanする。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted-project \
  --scan \
  --project-name "Confirmed Project Name" \
  --plan-output /tmp/state-schema-migration/plan.json
```

migrationは通常contentを書き換えず、stateとadoption metadataへname、slug、product、development Model identityを追加する。

## 4. Apply

```bash
node scripts/upgrade-project.mjs \
  --apply-plan /tmp/adopted-project-upgrade/plan.json
```

apply前にtargetのrollback可能なcommitまたはbranchを確保する。plan後のtarget、baseline、kit HEAD、manifest変更はstaleとして停止する。

## 5. Model境界

upgrade snapshotはstateに記録されたModelのasset setから生成する。development専用featureをtask-workspaceへ適用しない。Model変更は通常upgradeではなく、別のreview可能なmigrationを必要とする。

version別の注意事項は[Upgrade Guide](../../UPGRADE_GUIDE.md)、state詳細は[Bootstrap State Reference](../REF/REF_reference_bootstrap_state.md)を参照する。

## 6. 完了確認とplanの保管

完了apply後はstate、適用履歴、baseline、置換backup、固有規則の保持、現行参照を確認する。再scanの差分とfeature状態も読み、deferredやpending-reviewなど意図的な残差を記録する。全件CURRENTだけを一律の完了条件にしない。

scanは実行ごとにplan/bundleを生成し、CURRENTだけの確認scanでも生成する。既定の時刻付きpathは並存し得る。明示 `--plan-output` の既存plan/bundleは上書きせず停止するため、確認scanには別pathを指定する。

使用中・保留中のplan/bundleは保持する。不要な確認用・stale planは、判断記録・rollback資料を確保した後に対になるbundleとともに破棄できる。bundleにはproject内容が含まれ得るため共有範囲に注意する。backupディレクトリ、`docs/BOOTSTRAP_STATE.json`、`.project-bootstrap/baselines/`は別責務であり、plan整理で削除しない。

development Modelには `project-bootstrap-kit-upgrade` skillを配布する。skillは利用者とAIによる更新の入口であり、commit/pushを自動承認しない。既存adopterはstate-based scanのADD判断で受け取る。skills-syncによる全skillの一括UPDATEを独自編集保持の代わりに使わない。
