# Public Contribution Sync Reference

最終更新: 2026-09-23

本書はpublic Issue / Pull Requestをprivate sourceへ還流するmaintainer手順を示す。外部writeは各操作のaction-time approval後に行う。

## 1. Workflow

```text
public PR
  -> read-only intake
  -> scope / rights / security / CI review
  -> ownership classification
  -> clean patch bundle
  -> private import plan
  -> apply / manual translation
  -> private tests / docs
  -> explicit private commit approval
  -> public staging re-export
  -> merge / close preview
  -> action-time approval
  -> public merge / close
  -> read-back / ledger finalization
```

## 2. Ownership routing

| Ownership | Route |
| --- | --- |
| direct | U0 / U1 / L1比較後にpatch候補 |
| transformed | private source / transformerへmanual translation |
| generated | generator / metadata sourceを変更 |
| publicOwned | publicだけで処理しprivate import不要 |
| unknown / forbidden | BLOCKED |

## 3. Bundle identity

bundleはpublic repository、PR number、head SHA、patch digestで一意にする。

最低限保持する情報:

- PR number / URL
- base / head SHA
- author public identity
- changed paths
- ownership / private mapping
- base / head / private digest
- rights acknowledgement
- decision
- append-only status history

Issue / PR本文とcomment全文、推測email、private profile情報は保存しない。

## 4. Direct path decision

| U0 / U1 / L1 | Decision |
| --- | --- |
| private未変更、PR変更あり | safe apply候補 |
| private変更あり、PR変更なし | private側だけ進行 |
| privateとPRが同一 | SKIP(SAME) |
| privateとPRが別々に変更 | DIVERGED / manual merge |
| delete / rename | manifest decision必要 |

## 5. Stale checks

次が変化した場合は再intake / replanする。

- PR head SHA
- public base
- manifest ownership
- transformer / generator version
- private mapped path
- target public tree

## 6. Idempotency

- imported bundleを再実行しない
- publicへ同等treeが入っていればSKIPする
- partial adoptionは採用file / digestを個別記録する
- 同じhead SHAで異なるpatch digestをinvalidとして拒否する

## 7. Merge or incorporated close

元PRをmergeする条件:

- reviewed headが不変
- rights / security / CIを満たす
- private importと再exportがPR内容と一致
- public baseが有効
- action-time approval済み

Incorporated closeとする例:

- transformed / generatedとして別実装した
- partial adoptionした
- private側で追加修正した
- maintainer PRへ再構成した

取り込み先と差異を説明するcomment / closeもexternal writeとして承認を得る。

## 8. Attribution

- public historyでは可能なら元PR mergeでauthorを保持する
- private ledgerへPR URL、head SHA、author、private commit、再export commitを記録する
- private commitへPublic-PR / Public-Head trailerを残す
- verified public identityがある場合だけCo-authored-byを使う
- emailを推測しない

## 9. Approval table

| Action | Boundary |
| --- | --- |
| read-only intake / analysis | read-only |
| bundle / plan作成 | private artifact |
| private apply | scope / plan review |
| private commit | explicit approval |
| public comment / review | action-time approval |
| public merge / close | action-time approval |
| public push / PR作成 | action-time approval |

初期運用では各操作を段階的に承認する。反復運用後に承認分離の実益がないと利用者が判断した場合は、`SPEC_007_public_distribution_contract.md`のgrouped approval条件を満たす1〜3 bundleへ集約できる。

## 10. Fixture round-trip

Phase 7までにdirect path fixture PRでintake、bundle、3-way apply、private commit gate、re-export、merge preview、merge、read-back、idempotencyを確認する。

追加fixture:

- stale head
- diverged private source
- transformed path
- generated path
- partial adoption
- already imported bundle
- publicOwned preservation

## 11. Recovery

- private apply前はplan破棄で戻す
- apply後commit前は対象diffをreviewして戻す
- private commit後は履歴を破壊せずrevert候補を提示する
- public merge前は外部状態を変更しない
- public merge後はforce pushせずrevert PRまたは修正版で回復する
- credential / private情報混入時はrotationと公開停止を先に行う
