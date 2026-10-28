# SPEC 006: Bootstrap State and Three-Way Upgrade Contract

## 1. 目的

v0.8.0以降のfresh init、existing adoption、将来upgradeが、直前に受け入れたkit側contentとproject側contentを再現可能に比較する契約を定義する。

## 2. 用語

- `U0`: 直前に受け入れたupstream content hash
- `U1`: 今回のclean kit HEADが生成するupstream content hash
- `L0`: 直前に受け入れたproject content hashまたは不存在
- `L1`: 現在のproject content hashまたは不存在

`U0`は古いkit version全般ではなく、そのprojectが直前に受け入れたpath単位のkit contentである。

## 3. State manifest

正本は`docs/BOOTSTRAP_STATE.json`とし、schema version 2を使用する。

- state自身は通常path stateから除外する
- `integrity`を除外し、object keyを再帰的にsortしたJSONをSHA-256でdigestする
- stateにはkit version/commit、project name / slug / product name、Project Model identity / manifest digest、AI surface、Technology Profile、path state、feature state、historyを記録する
- project file内容、Secret値、credential値は保存しない
- reasonは1行とし、代表的なcredential patternを警告する
- `project.snapshotAppliedAt`はexpected snapshotを同一bytesで再生成する内部値であり、人間向けの初回適用日時を意味しない。fresh initまたはcomplete applyで確定した値を保存し、以後のscanで再利用する

## 4. Baseline store

upstream contentだけを`.project-bootstrap/baselines/sha256/<hash>`へexact bytesで保存する。

- project固有contentを保存しない
- 同一contentはhash単位で重複保存しない
- 1 objectは4 MiB以下
- 1 operationの追加合計は64 MiB以下
- hash不一致、欠落、path traversal、size超過はfail-closed
- Git管理対象とし、orphanは自動削除しない

## 5. Ownership

- `kit-managed`: local未変更ならupstream変更をsafe update候補にできる
- `managed-merge`: upstreamとproject固有内容を統合し、将来は3-way reviewする
- `project-owned`: upstream変更を通知するが自動上書きしない
- `mapped`: 別pathが責務を満たし、`satisfiedBy`または`supersededBy`を持つ
- `intentionally-absent`: 理由付きで不存在を維持する

ownership変更はstate直接編集ではなく、許可された遷移を行うCLIで理由、current project hash、upstream hash、日時をhistoryへ記録する。

managed-merge / project-ownedからkit-managedへの明示復帰は、localと受入済みU0のhash / kind / mode一致を条件とする。scanはCURRENTも含め復帰候補を表示する。復帰はbaselineやproject contentを変更せず、state変更後は再scanする。mapped / intentionally-absentは直接の復帰対象としない。

## 6. Path state

| 条件 | 状態 |
| --- | --- |
| `U1 = U0`かつ`L1 = L0` | `CURRENT` |
| `U1 != U0`かつ`L1 = L0` | `UPSTREAM_CHANGED` |
| `U1 = U0`かつ`L1 != L0` | `LOCAL_CHANGED` |
| `U1 != U0`かつ`L1 != L0` | `DIVERGED` |
| stateにないpathがU1に存在 | `NEW_UPSTREAM_PATH` |

fingerprintはmanaged pathの存在・file種別・mode・hashとimmutable plan evidenceだけを対象とし、EXTRAを含めない。

## 7. Upgrade decisions

- `safe-update`: kit-managed / managed-merge / project-ownedのUPSTREAM_CHANGEDで、localが受入済みU0とhash / kind / mode一致し、明示confirm時だけU1を配置する。ownershipは保持する
- `manual-merged`: current localを明示CLIでhash検証して受け入れる
- `accepted-deviation`: review済みで反映しない。U0をU1へ進め、L0をcurrent localへ進める
- `deferred`: 判断保留。U0/L0を進めず、次回scanでも表示する
- `add`: NEW_UPSTREAM_PATHを明示confirmして追加する
- `skip`: NEW_UPSTREAM_PATHを理由付きで意図的に追加しない

`NEW_UPSTREAM_PATH`でもlocal contentが既に存在する場合は、`manual-merged`で確認済みlocalを保持して受け入れられる。専用CLIのcurrent hash検証と逐次統合規則を適用し、ownershipはkit-managed / managed-mergeならlocalとU1のhash / kind / mode一致時にkit-managed、不一致時にmanaged-mergeとする。project-owned / mapped / intentionally-absentは宣言を保持する。localが不存在の場合はこの判断を拒否する。

受入時とapply時に同じ判断規則を検証し、使えない判断はplan保存前に選択肢を示して拒否する。scanのallowedDecisionsは案内用であり、適用時は再計算する。manual-mergedのownership決定規則は既存pathにも適用し、受入CLI、state history、人向け履歴へ変更前後を残す。

同じupstream変更はaccepted-deviationまたはmanual-merged後に再通知せず、deferredは再通知する。

## 8. Three-way evidence

`DIVERGED`ではplan bundleに次を保存する。

- U0 baseline
- U1 upstream snapshot
- L1 current local

これはreview用bundleであり、state/baseline正本にはproject contentを保存しない。

## 9. Feature stateと配布coverage

feature stateは`applied / accepted-deviation / not-applicable / pending-review`を使用し、feature contract versionとevidenceを保持する。

全fresh生成pathはstate snapshot engineで追跡する。boilerplate変更に個別migration handlerが必要な場合は、feature catalog、handler、contract version、evidenceを同じ変更で更新する。kit verificationはcatalog contract versionとdistribution contractを検査する。

## 10. 互換境界

- v0.7.0以前のplan schema 1は非互換として拒否する
- stateがないprojectはlatest kitへ再adoptionし、最初のU0/L0を確立する
- adoption記録があるstateなし旧adopterでは、upgrade scanがmetadataを復元して再adoption planへ自動routingする
- stateなしlegacy scanは`--project-slug`の明示値を推定値より優先する。未指定時の推定は維持し、initと同じlowercase kebab-caseを検証する。schema 2 stateの通常upgradeではslug指定を拒否し、identity改名を通常scanへ混在させない。schema 1のmetadata移行では次項の条件に従って初期slugを明示できる
- 過去upstreamを推測復元しない
- state schema 1はmetadata-only migration planでschema 2へ更新する。旧`project.name`は有効なlowercase kebab-caseの場合だけslugとして保持する。人向け名称等で無効な場合は`--project-slug`の明示を求め、旧stateを書き換えず初期slugをmetadata移行planへ記録する。旧`productName`をproduct name候補とし、人向けproject nameは明示確認を必須とする。schema 2の既存slug変更はこの引数では受け付けない
- schema migrationはcontent fileを変更せず、stateとhuman-readable adoption metadataだけを更新する。stale / integrity / clean kit HEADを確認し、再実行は`SKIP(SAME)`とする
- Project Model変更は通常upgradeとして扱わず、別のreview可能なmigration planを必要とする
- v0.8.2のstate migrationがsynthetic `snapshotAppliedAt`を人間向け履歴へ出力したstate schema 1は、state historyの`mature-adoption.at`を用いてhuman record、profile record、state、baselineをreview可能なupgrade planから訂正する

## 11. Source再現性

plan作成はdirty kit checkoutでも許可できるが、complete applyは次を必須とする。

- kit checkoutがclean
- current HEADがplanのkit commitと一致
- clean HEADから再生成したsnapshotがplan snapshotと一致

## 12. 初期化後のTechnology Profile追加

- schema 2では`--update-technology-profiles --add <id> [--add <id> ...] --reason <text>`で選択の追加をpreviewし、`--apply`時だけstateへ保存する
- 既存選択との和集合とし、既存順序を保持する。同一追加の再実行はstateを書き換えず`SKIP(SAME)`とする
- schema、integrity、baseline、profile実在、Model policyとprofile applicabilityを全件検証してから保存する。変更前後、追加ID、理由、日時をstate historyへ記録する
- identity、AI surface、snapshotAppliedAt、既存kit受入version、path / baseline、feature stateは維持する。人向け初回適用記録を最新選択で書き換えない
- この操作は文書・skillを配置せず、pathを受け入れない。次のscanがprofileを含むsnapshotを生成し、既存のpath判断・plan applyで受け入れる。登録だけで全pathの追跡完了とは扱わない
- 追跡外の配置済みprofileも同じ経路で登録・修復する。固有編集はmanual-merged等の明示判断で保持する
- 登録前のplanはstate digest不一致でstaleとなる。再scanする
- stateありのtechnology-profiles featureはdry-run / applyとも拒否し、登録CLIへ案内する。stateありscanの`--technology-profile`も拒否し、schema 1ではmetadata移行を先に行う
- stateなし旧adopterは従来featureまたはprofile指定のadoption planを使う。profile削除・置換とModel / AI surface変更はこの追加操作では扱わない
