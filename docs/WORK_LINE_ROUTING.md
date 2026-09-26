# project-bootstrap-kit 作業線ルーティング

最終更新: 2026-09-19

本書は、成熟済みの `project-bootstrap-kit` に入る独立した機能追加、保守、運用確認、他プロジェクト支援、自己管理を分類する正本である。

## 1. 運用前提

- 通常の変更を継続的なフェーズWBSへ割り当てない
- 1件の依頼または問題を、起点と変更対象に基づいて案件単位で管理する
- 複数フェーズにまたがる大規模な構想が発生した場合だけ、個別Epicの中で計画文書を作る
- 規模やセッション数ではなく、何を変える作業かで判別する

## 2. 作業線

| 作業線 | 対象 | 記録先 |
| --- | --- | --- |
| Epic | 新しい配布能力、文書体系、profile、upgrade、管理機構の追加・高度化 | private maintainer records |
| MNT | リリース済みkitの不具合修正、互換性維持、軽微な調整 | `docs/WORK/maintenance/` |
| OPS | 配布、検証、release、feedback受入などの運用上の確認・調査・回復判断 | `docs/WORK/operations/` |
| ADV | kitの経験や資産を他プロジェクト、別の取り組み、企画へ活用する相談・提供 | `docs/WORK/advisory/` |
| SELF | kit自身の管理規範、自己検証、文書運用など、配布能力を変えない自己管理 | private maintainer records |

## 3. SELFの境界

SELFは、配布先へ渡す機能ではなく、このリポジトリを正確に保守するための変更を扱う。

例:

- root `AGENTS.md` の改善
- kit自身の作業線、文書分類、自己検証の整備
- 配布用文書と自己用文書を混同しないためのガード
- releaseやChangeLogの自己運用改善

SELFの検討から `boilerplate/`、`profiles/`、`upgrades/`、配布用scriptの変更が必要と判明した場合、その変更はSELFへ混在させない。新能力ならEpic、リリース済み機能の修正ならMNTを別途起票し、相互リンクする。

## 4. 変更面の影響判定

各案件は受付時と終了前に、次の6面を評価する。詳細な判断基準は `REF/REF_reference_change_impact_matrix.md` を正本とする。

1. Self-management
2. New distribution
3. Existing adopters
4. Technology-specific distribution
5. Distribution engine
6. Contract and reference

反映する面には対象ファイルと理由を、反映しない面には不要と判断した理由を記録する。共通に見える規則でも、自動的な二重反映はしない。

## 5. knowledge feedbackとの関係

private maintainer records は作業線ではなく、適用先プロジェクトからの外部feedbackを受け付ける入口である。

1. export版を検査してfeedback inboxへ受け付ける
2. 匿名化、再現性、汎用性、現行仕様との整合を評価する
3. 採用する場合はEpic、MNT、OPS、SELFのいずれかへ昇格する
4. 元feedbackには昇格先IDを、作業線記録にはfeedbackのEvidence IDを残す
5. 不採用・保留の場合は作業線を起票せず、feedback側で理由を記録する

ADVはkitから他プロジェクトへの助言を扱うため、適用先からkitへ戻るknowledge feedbackの受付先にはしない。

## 6. 線間遷移

- OPSで恒久修正が必要と判明した場合はMNTへ移す
- MNTで新能力や重要な契約変更が必要と判明した場合はEpicへ移す
- ADVからkitの変更が必要になった場合はEpicまたはMNTへ移す
- SELFから配布物の変更が必要になった場合はEpicまたはMNTへ分離する
- 同じ事実を複製せず、元案件と移行先を相互リンクする

## 7. statusと完了

statusは `⬛ 未着手`、`🔄 進行中`、`✅ 完了`、`🚫 blocker` を使用する。OPSとADVでは `👀 経過観察・相手待ち` も使用できる。

AI側の変更、検証、記録が終わっても、利用者レビューが残る案件は `🔄` のままとする。完了時は正本、ChangeLog、version、upgrade要否、残リスクを再確認する。
