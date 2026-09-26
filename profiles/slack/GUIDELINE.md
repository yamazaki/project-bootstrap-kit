# TECHNOLOGY GUIDELINE: Slack

## 対象

Slack ボット、Slack App、Slack 上で動作する連携機能。

## 実装制約

- Slack Events等の応答期限は、実装時点のSlack公式仕様を確認して設計へ反映する
- retry 前提で冪等性を持たせる
- 署名検証を必須とする
- 権限スコープは最小化する
- OAuth 導線と token 保管を明示する
- rate limit と backoff を考慮する

## テスト観点

- retry 時の重複処理
- 署名検証失敗時の拒否
- 権限不足時の挙動
- Slack 側タイムアウトを考慮した処理分離

## 非推奨 / 禁止事項

- 署名検証を省略したまま受信処理を実装しない
- retry 前提のイベントを非冪等なまま処理しない
- 応答時間制約を無視して重い処理を同期経路へ載せない

## 実装前チェック

- 対象API・イベントの現在の応答期限をSlack公式仕様で確認したか
- 外部 API 呼び出しを即時応答経路に入れすぎていないか
- bot token / signing secret の扱いが安全か
