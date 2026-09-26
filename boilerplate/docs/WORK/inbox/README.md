# capture inbox

作業中に発見した思いつき、課題、疑問を一時捕捉する場所。

正式な仕様、計画、参照資産ではない。棚卸し時に、`SPEC / ADR / REF / WORK / PLAN` へ反映するか、後続フェーズへ送るか、閉じるかを判断する。

## ディレクトリ

- `open/`
  - 捕捉直後で未整理
- `triaged/`
  - 棚卸し済みだが、まだ反映先や対応時期を確定していない
- `promoted/`
  - `SPEC / ADR / REF / WORK / PLAN` などへ反映済み
- `deferred/`
  - 後続フェーズまたは将来検討へ送った
- `closed/`
  - 対応不要、重複、解消済み

## 命名

```text
capture_yyyymmdd_hhmm_<slug>.md
```

状態はファイル名ではなく、配置フォルダと frontmatter の `status` で管理する。
