# Language Policy

Status: Accepted

## 推奨方針

- 日本語を唯一の完全な正本とする
- 初回公開では英語全文翻訳を必須にしない
- 英語は短いproduct summary、主要navigation、重要なstatus表示から段階的に提供する
- 英語文書を追加する場合は、対応する日本語sourceを先頭に明記する
- 意味のある日本語更新時に英語側の確認要否を検査する
- 英語が古い場合は正本として扱わず、確認日または未同期statusを表示する

## 理由

初回から全文を二重管理すると、CLI、state、Model、support契約の変更時にtranslation driftが発生しやすい。現在維持できる言語を正本とし、英語範囲を明示的に増やす方が、誤った古い案内を残しにくい。

## 初回英語候補

- root READMEの短いEnglish summary
- Project Model名、status、比較表の英語label
- Getting StartedとSupportへのnavigation
- security reporting入口（Phase 5）

## Drift検査

- 英語fileは対応する日本語source pathをmetadataまたは冒頭へ記載する
- link切れとsource欠落を自動検査する
- 内容同等性の最終判断は人が行う
- 自動翻訳結果をreviewなしに正本として公開しない

## 初回公開の判断

- 日本語を唯一の完全正本とする
- 初回英語は短いsummary / navigationに限定する
- 具体的な英語assetは日本語正本とdrift検査を用意してから追加する
- 英語全文翻訳は初回公開の完了条件にしない

2026-09-24に利用者が本方針を承認した。
