# 06 Production Operations

## 目的

production公開後の作業を、初期開発と同じPhase計画へ無理に押し込まず、性質に応じて扱う。

## 作業の分け方

- 新しい大きな能力、複数Phaseの構想: Epic
- リリース済み機能の不具合、互換性、軽微な改善: MNT
- 障害、調査、release運用、回復判断: OPS
- 経験や資産を別projectへ活用する相談: ADV

適用先projectでは名称が異なっても、計画開発、保守、運用調査、助言を混在させない原則を使える。

## Phase型開発から切り替える目安

- 最初の価値提供とproduction移行が完了した
- 残作業が独立した保守・運用案件として扱える
- 常時更新する巨大なcurrent WBSより、案件ごとの記録が追跡しやすい

新しいproduct milestoneが始まる場合は、必要な範囲だけ再びROADMAPとPhase計画を作る。

## Incidentと改善

incidentでは事実、影響、暫定回復、恒久対応を分ける。運用調査から恒久修正が必要になった場合は、MNTまたはEpicへ分離して相互linkする。

Technology Profileの知識は、project固有の採否と一般化できる知識を分け、検査済みknowledge feedbackだけをkit候補へ戻す。
