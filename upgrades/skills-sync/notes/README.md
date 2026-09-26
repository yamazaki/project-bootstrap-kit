# skills-sync/notes

dry-run では、対象 surface ごとに次を表示する。

- `ADD`
- `UPDATE`
- `SKIP(SAME)`
- `EXTRA`

apply では、`ADD` と `UPDATE` のみ反映し、`EXTRA` は削除しない。
