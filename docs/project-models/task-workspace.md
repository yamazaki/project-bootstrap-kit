# Task Workspace Project Model

- Status: preview
- Model version: 0.1.0

## 用途

deployable softwareではなく、文書、調査、継続業務、案件別成果物を主に扱うworkspace向け。

## 主な構成

- `AGENTS.md`
- `context/CONTEXT.md`: 作業の目的、範囲、現在の前提
- `context/MASTER.md`: 継続利用するdurable fact
- `outputs/`: 成果物
- `sessions/SESSION_INDEX.md`: session索引
- `SESSION_HANDOFF.md`: 次の開始点
- `docs/DOCUMENTATION.md`: 文書の責務
- capture、文書管理、handoff用skill

## Lifecycle

1. durable contextを確認する
2. 今回のtaskとexternal action境界を決める
3. evidenceと解釈を分けて作業する
4. outputを作成する
5. durable sourceへ昇格する内容だけをreviewする
6. session indexとhandoffを更新する

## 既定で含まれないもの

VERSION、ChangeLog、ROADMAP、phase WBS、coding guideline、Technology Profileは既定生成しない。独自fileとして存在することは禁止しない。

## 制約

- `--product-name`を使用しない
- 現在はTechnology Profileに対応しない
- development用upgrade featureはnot-applicable
- previewであり、利用経験を踏まえて構成を変更する可能性がある
