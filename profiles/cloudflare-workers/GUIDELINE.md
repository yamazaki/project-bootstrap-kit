# TECHNOLOGY GUIDELINE: Cloudflare Workers

## 1. 対象と正本

Cloudflare Workers、Workers上のHTTP API、Webhook、連携処理、GUI、scheduled処理を対象とする。

- プロジェクト固有の採否と例外は `docs/TECHNOLOGY/ADOPTION.md` を正本とする
- 実証知識と分岐条件は `REFERENCE.md` を参照する
- limits、pricing、API、Wrangler設定、互換性は利用時点のCloudflare公式文書を正本とする
- 公式文書と `REFERENCE.md` が矛盾する場合は公式文書を優先し、差分をknowledge feedback候補として記録する

## 2. 設計前に確定する前提

- per-request記録の正本が、アプリログ、DB、platform logのどこか
- コストまたはquotaで最も逼迫する資源が何か
- 可視化と記録が必須要件か努力目標か
- secret、個人情報、テナント情報が通過または保存されるsink
- 後続処理に必要な配送保証、再送、重複許容、順序保証

一般論を機械的に採用せず、前提が異なる場合は不採用理由と再検討条件を `ADOPTION.md` に記録する。

## 3. リクエスト処理

- body sizeは`Content-Length`だけに依存せず、有界ストリーム読みで実メモリ使用量を制御する
- 検証順序は安価な処理を優先するが、拒否リクエストの記録要件と整合させる
- 外部から受けるリクエストは、送信元能力に応じて署名検証または推測不能URLと共有secret headerを使う
- secret、token、署名をURL queryへ載せない
- timeout後の再送を行う場合はat-least-onceと重複可能性を明文化する
- 応答後処理は`ctx.waitUntil()`で完結可能な短時間処理に限定し、恒久retryやDLQが必要ならQueues等を検討する

## 4. ログ、記録、redaction

- platform log、アプリログ、DB記録、通知、metrics、repositoryを別sinkとして列挙する
- 全sinkへ同じ情報を重複出力せず、記録の正本と調査用ログの責務を分ける
- ログ出力は単一choke pointへ集約する
- event、reason、error classは列挙型と数値を基本とし、利用者入力やraw `Error.message`を連結しない
- secret、token、Cookie、受信body全文、secret性のあるURLはraw出力しない
- エラー保存は自由文より分類enumと安全な派生値を優先する
- 新しいsinkや出力fieldを追加する変更では、redaction policyと回帰テストを同時に更新する

## 5. 設定、環境、デプロイ

- local、development、staging、productionの責務と設定境界を明示する
- bindings、variables、secretsの環境継承可否を利用中Wranglerの公式schemaと文書で確認する
- secretはWorkers Secrets等へ保存し、設定値・エラーログ・fixtureへ含めない
- 危険側の機能は未設定時disabledとなるfail-closed flagを基本とする
- 遮断系変更はobserveからenforceへ段階的に移行する
- bare deployを避け、対象環境を明示したscriptまたはRunbookを使う
- migrationを伴う場合は、migrationと各Workerのdeploy順序、rollbackを定義する

## 6. Worker分割

用途別subdomainまたは責務境界を持つ場合は、単一Workerのhost分岐と複数Workerを比較する。

- 外部連携、利用者GUI、管理GUIなど、認証境界・更新頻度・障害影響が異なる責務はWorker分割を優先検討する
- Worker専用コード間の相互importを避け、共有処理は明示したshared層へ集約する
- 共有module変更時は、依存する全Workerを検証する
- 複数Workerが同じstorageを利用する場合も、データアクセス境界とmigration責務を一元化する
- Worker数や料金への影響は固定知識で判断せず、利用時点の公式limitsとpricingを確認する

## 7. テストと運用

- runtime、test pool、mock機能は採用versionの実装と型定義で確認する
- `waitUntil()`内の記録、retry、通知について失敗分岐をテストする
- redactionはforbidden keyとsynthetic canaryで回帰検証する
- metrics labelは低cardinalityの列挙値に限定する
- 失敗シグナルは、失敗を検知する対象資源とは独立した経路へ出す
- 記録write失敗時のfail-open / fail-closed、適用範囲、残存リスクを事前に決める
- dashboardやalert定義を再現可能な形でrepositoryへ保持する
- incident、secret rotation、deploy、rollbackのRunbookを整備する

## 8. 実装前チェック

- 前提5項目と採否が `ADOPTION.md` に記録されている
- 使用するlimits、pricing、API、Wrangler仕様を公式文書で確認した
- request body、認証、retry、重複、記録責務を設計した
- sink一覧とredaction policyがある
- environment、binding、secret、deploy経路が明示されている
- Worker分割、FQDN、認証境界を検討した
- test、monitoring、alert、Runbookの対象がWBSに反映されている
