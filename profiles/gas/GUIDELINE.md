# TECHNOLOGY GUIDELINE: Google Apps Script

## 対象

Google Apps Script 上で動作するスクリプト。

## 実装制約

- 実行時間制限を前提にする
- quota 制限を考慮する
- トリガー実行と手動実行を区別する
- `PropertiesService`, `LockService`, `CacheService` の使い分けを考慮する
- Drive, Sheets, Gmail などの権限スコープを最小化する

## テスト観点

- quota 到達時の挙動
- トリガー実行時の競合
- lock 不足時の再試行
- Spreadsheet/Drive の I/O 失敗時の挙動

## 非推奨 / 禁止事項

- 実行時間制限を無視した長時間処理を 1 回に詰め込まない
- quota 制限を考慮せず大量 I/O を行わない
- シークレットや設定値をコードへ直書きしない

## 実装前チェック

- 長時間処理を 1 回の実行へ詰め込みすぎていないか
- 並行実行や再入を考慮しているか
- シークレットや設定値をコードへ直書きしていないか
