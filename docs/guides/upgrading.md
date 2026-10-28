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

slug指定はstateなし経路とschema 1 -> 2のmetadata移行で使用でき、lowercase kebab-caseを使う。stateなし経路で未指定時は従来どおり適用記録のProject Nameを推定値にする。schema 2の既存identity変更は拒否し、別migrationとして扱う。過去適用記録の名称をscanのためだけに書き換える必要はない。

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


### ownershipと判断

| ownership | 意味 | `UPSTREAM_CHANGED`でのsafe-update |
| --- | --- | --- |
| kit-managed | kitの内容を管理対象にする | L1がU0とhash / kind / mode一致し、`--confirm`ありなら可 |
| managed-merge | kitとprojectの内容を統合して管理する | 同じ条件で可。ownershipを保持 |
| project-owned | projectを内容の正本とする | 同じ条件で明示的に可。ownershipを保持 |
| mapped | 別pathが責務を満たす | 不可。mappingを自動解除しない |
| intentionally-absent | 理由付きで不存在を維持する | 不可。不在の意図を自動解除しない |

`UPSTREAM_CHANGED`はL1=L0を表すため、それだけでL1=U0とは限らない。scanの各pathに`allowedDecisions`を表示し、受入時とapply時に同じ条件を再検証する。確認不足や不適合な判断はplanへ保存せず、選択肢を示して拒否する。planの選択肢欄を書き換えても適用条件は変わらない。

`manual-merged`は現在のlocalを受け入れる。kit-managed / managed-mergeではlocalがU1とhash / kind / mode一致ならkit-managed、異なるならmanaged-mergeとする。project-ownedは同一内容でも保持する。mapped / intentionally-absentもその宣言を保持する。判断受入時にownershipの変更前後を表示し、適用時にstateと人向け履歴へ残す。

| path state | 判断の候補（上表と存在条件で絞り込む） |
| --- | --- |
| CURRENT | 判断不要。ownership復帰は別CLI |
| UPSTREAM_CHANGED | safe-update / manual-merged / accepted-deviation / deferred |
| LOCAL_CHANGED | manual-merged / deferred |
| DIVERGED | manual-merged / accepted-deviation / deferred |
| NEW_UPSTREAM_PATH | add / skip / manual-merged / deferred |

accepted-deviationはkit-managedでは使えない。addはU1の存在と`--confirm`、skipはlocal不存在、NEW_UPSTREAM_PATHのmanual-mergedはlocal存在を条件とする。safe-updateにも`--confirm`を必須とする。

### kit-managedへの復帰

scanは受入済みupstreamと完全一致するmanaged-merge / project-ownedを、CURRENTも含め`OWNERSHIP_RECOVERY`候補として表示する。候補は自動変更しない。管理方針を確認してpathごとに実行する。

```bash
node scripts/upgrade-project.mjs --target /path/to/adopted-project \
  --update-path-state --path .agents/skills/project-bootstrap-kit-upgrade/SKILL.md \
  --ownership kit-managed --reason "独自編集がなくkit管理へ戻す"
```

受入済みU0とlocalのhash / kind / modeが一致する場合に限る。現行U1との一致だけでbaselineを更新しない。先に新内容を通常planで受け入れ、必要なら復帰する。stateを更新したら再scanする。内容の書換えは行わず、理由・日時・変更前後・hashを記録する。mapped / intentionally-absentから直接戻す操作は提供しない。

既存の遷移はkit-managed→managed-merge、managed-merge⇔project-owned、intentionally-absent→project-owned / managed-merge、mapped→mapped（参照変更）。本変更でmanaged-merge / project-owned→kit-managedを上記一致条件付きで追加する。

## 2.1 進行中projectへのTechnology Profile追加・修復

schema 2のstateがある場合は、profile選択の登録をpreviewする。WORK/0.1後や実装・運用の途中でも使用できる。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted-project \
  --update-technology-profiles --add cloudflare-workers --add slack \
  --reason "実装で採用するruntimeと連携先を追加"
```

確認後に同じcommandへ`--apply`を付ける。この操作はstateの`project.technologyProfiles`へ追加し、理由・日時・変更前後をhistoryへ残す。既存選択は保持し、同じ追加の再実行は`SKIP(SAME)`。state schema、identity、AI surface、snapshot日時、path / baseline、featureの受入状態、既存のkit受入versionは変更しない。

登録だけではファイルを配置せず、既存ファイルも受け入れない。次のscanで新profileの文書・skillが`NEW_UPSTREAM_PATH`に、本書とは別の適用先`docs/TECHNOLOGY/INDEX.md` / `ADOPTION.md`がprofileを含む想定構成との差分に現れる。AI surfaceはstateの設定を使う。

```bash
node scripts/upgrade-project.mjs --target /path/to/adopted-project --scan --plan-output /tmp/profile-addition/plan.json
node scripts/upgrade-project.mjs --accept-path-decision /tmp/profile-addition/plan.json --path docs/TECHNOLOGY/slack/GUIDELINE.md --decision add --reason "guidelineの追加を確認" --confirm
```

上記の受入commandは1pathの例である。plan全体を確認して残りのpathも判断する。`add --confirm`は既存local contentもupstreamで置き換えるため、同一内容か確認する。独自編集された既存ファイルは内容を統合・確認して`manual-merged`で保持する。`NEW_UPSTREAM_PATH`でもlocalが存在すれば`manual-merged`を使用でき、upstreamと完全一致ならkit-managedとなる。INDEX / ADOPTIONが通常ownershipで`UPSTREAM_CHANGED`かつlocalが受入済みupstreamとhash / kind / mode一致なら`safe-update --confirm`、独自記録があれば1ファイルずつ`manual-merged`を使う。

全path判断後に`--apply-plan /tmp/profile-addition/plan.json`を実行し、別pathの確認scanで受入済みprofileが`CURRENT`になることを確認する。保留は理由付きで残す。baselineと受入hashはこの段階で確立する。

既にfeatureで文書・skillだけ配置し追跡外になったprojectも、同じ登録→scan→review→applyで修復できる。stateやintegrityを手編集しない。登録前のplanはstaleになるため再生成する。未知ID、不適用Model、不正state / baselineは登録前に停止する。profile削除、Model / AI surface変更はこのCLIでは扱わない。

stateありの`--feature technology-profiles`はdry-run / applyとも停止し、この経路を案内する。stateありscanの`--technology-profile`も黙って無視せず停止する。schema 1は先にmetadata移行を完了する。stateなし旧projectでは従来featureを使用でき、state移行と同時に選択する場合は`--scan --technology-profile <id>`でadoption planへ含める。

rollbackは事前の退避点へ戻す。登録だけならstateの復元で足りるが、plan適用後は対象ファイル・state・baseline・人向け履歴を同じ退避点から復元する。古いplanは再利用しない。

## 3. Schema 1から2

schema 1 stateではmetadata-only migration planを生成する。人向けProject Nameを確認し、明示して再scanする。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted-project \
  --scan \
  --project-name "Confirmed Project Name" \
  --plan-output /tmp/state-schema-migration/plan.json
```

旧stateの`project.name`が大文字・空白を含む人向け名称の場合は、その値を直接変更せず、上記scanへ`--project-slug confirmed-project`も明示する。自動的な小文字化・推定は行わない。planに表示される旧name、人向け名称、初期slugを確認してからapplyする。既に有効なslugであれば未指定で引き継げる。schema 2へ移行した後のslug変更はこの引数では受け付けない。

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
