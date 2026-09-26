# Choosing a Project Model

## 1. 最初の質問

主成果は何か。

- 実装、test、release、production運用を伴うproductやtool: `development`
- 文書、調査、継続業務、案件別成果物: `task-workspace`

「コードを書くか」だけでは決めない。最終成果と、継続して管理する情報の種類で選ぶ。

## 2. 比較

| 観点 | development | task-workspace |
| --- | --- | --- |
| Status | stable | preview |
| 計画 | ROADMAP / phase WBS | context / handoff |
| 仕様・設計 | SPEC / ADR / REF | 必要に応じてADR / REF |
| 成果物 | source code、release | `outputs/` |
| Session継続 | agent session文書 | session index / handoff |
| Version / ChangeLog | 既定あり | 既定なし |
| Technology Profile | 対応 | 未対応 |
| Production運用 | MNT / OPS / ADV | external actionと継続task管理 |

## 3. 判断例

- Web service、CLI tool、automation: development
- 調査repository、文書作成workspace、継続的な応募・比較・整理: task-workspace
- 調査からsoftware実装へ発展する可能性がある: 現在の主成果で選び、Model変更は将来のreview可能なmigrationとして扱う

## 4. 避ける判断

- file数が少ないだけでtask-workspaceを選ぶ
- task-workspaceが軽量だからという理由だけでdevelopment lifecycleを省く
- 既存projectのfile構成だけからModelを自動推定する
- 1つのrepositoryへ複数Modelを同時適用する

## 5. 初期化

Model省略時はdevelopment。task-workspaceは明示指定する。

```bash
node scripts/init-project.mjs \
  --target /path/to/workspace \
  --project-model task-workspace \
  --project-name "Research Workspace" \
  --project-slug research-workspace \
  --ai-surface codex
```
