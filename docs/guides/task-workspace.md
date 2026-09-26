# Start a Task Workspace

## 1. 初期化

```bash
node scripts/init-project.mjs \
  --target /path/to/research-workspace \
  --project-model task-workspace \
  --project-name "Research Workspace" \
  --project-slug research-workspace \
  --ai-surface codex
```

task-workspaceでは`--product-name`とTechnology Profileを指定しない。

## 2. 最初に整理するもの

- `context/CONTEXT.md`: 目的、scope、現在の前提
- `context/MASTER.md`: 継続利用するdurable fact
- `SESSION_HANDOFF.md`: 次の開始点
- `sessions/SESSION_INDEX.md`: session索引

## 3. 作業中

- 利用者提供事実、外部確認事実、解釈、仮説を区別する
- 成果物は`outputs/`へ置く
- outputやsession内容を自動的にMASTERへコピーしない
- 送信、共有、応募、投稿、削除等はexact previewと実行時承認を得る
- 外部操作の結果が不明なら自動retryしない

## 4. Session終了

1. 必要なsession recordを作る
2. `sessions/SESSION_INDEX.md`へ追加する
3. durable contextへ昇格する内容をreviewする
4. `SESSION_HANDOFF.md`を現在地へ更新する

## 5. 制約

task-workspaceはpreviewである。VERSION、ChangeLog、ROADMAP、phase WBS、Technology Profileは既定生成しない。software開発が主目的になった場合のModel変更は自動化されていない。
