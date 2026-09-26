# Project Model Migration Reference

最終更新: 2026-09-24

本書はlegacy stateへのModel identity追加と、将来のModel変更境界を説明する。

## 1. Schema 1 to schema 2

目的は既存development projectへModel identityを追加することであり、content書換えではない。

```text
scan
  -> integrity確認
  -> legacy metadata候補抽出
  -> development manifest照合
  -> migration plan
  -> user review
  -> apply
  -> verify / rerun
```

## 2. Naming migration

Legacy metadata:

- old project.name: slug候補
- old productName: product name候補

新project nameは一意に推測できない。product nameを初期候補としてplanへ表示し、利用者が確認・修正する。

## 3. Migration guarantees

- read-only scan
- content file変更なし
- state / adoption metadata差分をpreview
- stale / integrity mismatchを拒否
- explicit apply
- history記録
- rerun SKIP(SAME)

## 4. Profile compatibility

Legacy profileのsupportedProjectModels欠落はdevelopment-onlyとして扱う。task-workspaceへ自動適用しない。

## 5. task-workspace to development

将来優先scenario:

- context / masterを保持
- outputsを保持
- sessions / handoffを保持
- development planning / spec / coding / test / release assetを追加
- AGENTS / DOCUMENTATIONをmanual merge
- Technology Profileを別途選択
- VERSION / ChangeLog導入をreview
- 不要pathを自動削除しない

Model変更は通常upgradeではなく、全pathをreviewするmigration planとする。

## 6. development to task-workspace

禁止しないが初期優先度は低い。Development assetの削除を自動化せず、project-ownedとして保持または手動整理する。

## 7. Generated attribution

全Modelへkit MIT全文を追加する。Legacy adopterではADD / CONFLICTをplan表示し、root licenseは変更しない。

## 8. Recovery

- plan前: 変更なし
- apply前: plan破棄
- apply後commit前: metadata diffを戻す
- commit後: 履歴を破壊せずrevert
- contentが変化した場合: contract違反として停止し原因調査
