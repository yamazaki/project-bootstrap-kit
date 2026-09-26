# 04 Implementation and Acceptance

## 目的

計画した変更を小さく実装し、期待する利用者動作を検証して受け入れる。

## 実装中

- current planと正本を更新しながら進める
- unrelatedな変更を混ぜない
- 既存のproject-owned fileを一律上書きしない
- Secretやraw private dataをlog、plan、test fixtureへ残さない
- 思いついた別課題はcurrent scopeへ無断追加せずcaptureする

## Verification

狭いunit checkから始め、必要に応じてintegration、fresh init、upgrade、E2E、実機へ広げる。local test、dry-run、production確認を区別する。

## Acceptance

- automated checkが通った
- diffと生成物をreviewした
- migrationとrollbackを確認した
- user-visible docsとChangeLogを同期した
- 利用者判断が必要な項目を具体的に提示した

AI側の変更が終了しても、利用者reviewが残るtaskは完了にしない。
