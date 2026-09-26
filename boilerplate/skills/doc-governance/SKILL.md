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
