---
name: doc-governance
description: Use when creating, classifying, naming, promoting, or retiring project documents such as SPEC, ADR, REF, WORK, history, and agent session records.
---

# doc-governance

## 目的

文書の配置判断と棚卸し判断の再現性を高める。

## 判定手順

1. 拘束力があるか
   - あるなら `SPEC`
2. 重要な意思決定か
   - 該当するなら `ADR`
3. 複数 WBS / 将来フェーズで再利用するか
   - するなら `REF`
4. 単一マイルストーンに閉じるか
   - 閉じるなら `WORK/x.y`
5. 旧案や比較の保存か
   - 該当するなら `history`

## 棚卸し手順

UI文書では、共通基準は `docs/UI_DESIGN_BASELINE.md`、再利用するbrand・対象方針はREF、製品の拘束条件はSPEC、比較・確認は現在タスクのWORKへ分ける。UI固有の判断の統合・例外・廃止には `project-bootstrap-kit-ui-guideline-maintenance` を使い、本skillの分類規則に従う。既存正本を複製しない。

- 今後も再利用されるか
- 仕様拘束を持つか
- 別文書に統合済みか
- 後から参照する価値があるか

結果は以下のいずれかにする。

- `promote`
- `retain-in-work`
- `delete`

## REF 命名チェック

```text
REF_<type>_<subject>.md
```
