# Interaction Design

- Status: Draft
- Scope: Phase
- Source of Truth: No
- Owner: Product / Engineering / Design
- Owner WBS: 0.1
- Promotion Target: Retain-in-Work
- Supersedes: N/A

## 1. UI / Interaction の要否

- このプロジェクトに UI / Interaction が必要か
- 必要な場合、GUI / CLI / Chat / その他のどれか

## 2. 想定利用者

- 誰が使うか
- どの場面で使うか
- どれくらいの頻度で使うか

## 3. 体験の目標

- どのような体験を目指すか
- 速さ / 安心感 / 正確さ / 学習しやすさ / 楽しさ などの優先順位

## 4. 想定する Interface の種類

- GUI
- CLI
- Chat UI
- API only
- その他

## 5. デザイン / テーマの方向性

- トーン
- 配色の方向
- 情報量 / 密度
- フォーマル / カジュアル
- ブランド感

## 6. 画面種別と導線

Web GUI を持つ場合は、初期段階で必要になりうる画面種別を整理する。

- 個人の操作 / 設定画面
- テナント管理画面
- サービス全体の管理画面
- 外部連携の設定 / 認可 / Webhook 管理画面
- その他

## 7. デザインモックの要否

Web GUI を持つ場合は、早期フェーズにデザインモックまたは仮実装の WBS を設けるか判断する。

- 確認したいこと:
  - 主要導線
  - 情報設計
  - レイアウト密度
  - デザインテーマ
  - 画面種別間の役割分担
- 成果物の例:
  - 静的モック
  - 仮実装された画面
  - クリック可能な簡易導線
  - 画面キャプチャ

## 8. FQDN / 外部エンドポイント設計の要否

外部公開または外部連携されるエンドポイントがある場合は、FQDN とエンドポイントの設計要否を整理する。Web GUI がなく API だけを提供する場合も対象に含める。

- 利用者向け画面の FQDN
- テナント管理画面の FQDN
- サービス管理画面の FQDN
- API / Webhook / Callback / Request URL の FQDN
- 開発 / staging / production の環境別 FQDN
- Cookie、認証、CORS、OAuth redirect、Webhook 署名検証への影響

## 9. 初期フェーズで扱う範囲

- 今フェーズで UI / Interaction を実装するか
- 今は要件整理だけに留めるか
- 後フェーズへ送るか
- 技術実現性検証、構想・利用体験検証、初期実用提供のどの段階で扱うか

プロダクト価値が GUI や操作体験に依存する場合、API のみの実装では構想・利用体験検証の完了としない。主要利用者が価値を確認できる簡易 Interface を PoC に含める。

## 10. リスク / 未確定事項

- GUI が必要かまだ不明
- CLI だけで足りるか不明
- デザインテーマ未確定
- アクセシビリティ要件未確定
- 画面種別ごとの責務境界が未確定
- FQDN 設計が未確定
