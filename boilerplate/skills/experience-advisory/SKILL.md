---
name: experience-advisory
description: Use when advising, proposing, reviewing, or exploring an idea for another project, initiative, or pre-project concept based on this project's implementation or operational experience. Also use when the user explicitly identifies the request as ADV or experience-based advice. Do not use for this project's own planned implementation review.
---

# experience-advisory

本プロジェクトの実装・運用経験を、他プロジェクト、別の取り組み、またはプロジェクト化前の企画へ活用する相談をADVとして扱い、前提、適用条件、成果物正本、往復履歴を残す。

skillの起動だけを、成果物の外部送信、他プロジェクトへの書き込み、ファイル変更、commit、pushへの承認とみなさない。相談だけを求められた場合は、記録作成を含む変更へ進まず回答に留める。

## 入口

1. `docs/WORK_LINE_ROUTING.md` と `docs/WORK/advisory/README.md` を読む
2. 索引で同じ相談先・対象、主題、既存成果物を確認する
3. 継続案件では件別記録と `assets/adv-{N}/` の正本を読む
4. ADVとして扱うこと、相談対象、期待する成果物、共有してよい情報の境界を示す

## 実行

- 次の `ADV-N` を採番し、索引と件別記録を作る
- 本プロジェクトで観測した事実、そこからの推論、一般化した助言を分ける
- 助言の成立条件、適用しない条件、変動しうる事実、必要な一次確認を示す
- プロジェクト化前の相談では、企画を確定済みプロジェクトとして扱わず、仮説、選択肢、検証課題を区別する
- 継続改訂する成果物は `assets/adv-{N}/` を正本とし、一時添付を正本のままにしない
- 他プロジェクトへの書き込み、送信、commit、pushは自動で行わない

## 終了または遷移

- 日付付きの往復履歴、提供物、残フォロー、成果物正本を更新する
- 本プロジェクト側の修正が必要ならMNTまたはEpicへリンクする
- kitへ還元できる汎用知識は `knowledge-feedback` skillの対象として検討する
