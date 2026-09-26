# Human and AI Collaboration

## 1. 基本関係

AIは調査、差分作成、実装、検証、選択肢整理を支援する。利用者は目的、優先順位、許容risk、外部操作、受入を判断する。

作業量ではなく、判断の影響で責務を分ける。

## 2. AIが進められること

- repositoryと正本のread-only確認
- scope内のfile変更
- local test、dry-run、preview、diff review
- reversibleな生成物作成
- evidenceに基づく候補とtrade-offの提示
- 明示承認済み範囲のcommit

## 3. 人の判断が必要なこと

- 目的やscopeを変える選択
- 重要な仕様・設計判断の受入
- destructiveまたは回復困難な操作
- production、public repository、外部serviceへのwrite
- credential、費用、法務、公開範囲に関する判断
- 利用者reviewを完了とする判断

## 4. 完了の定義

AI側の実装やtestが終わっても、利用者reviewが残る場合は完了ではない。完了報告では少なくとも次を分ける。

- 実装済み
- local verification済み
- 利用者review待ち
- external action未実施
- release / production / public公開済み

previewやdry-runを実適用、local acceptanceをproduction acceptanceと表現しない。

## 5. Handoff

意味のある作業後は、次の担当がchat履歴なしでも再開できるよう、現在地、判断、検証結果、未決事項、次の開始点をrepositoryへ残す。
