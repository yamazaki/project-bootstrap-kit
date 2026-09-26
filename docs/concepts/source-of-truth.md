# Source of Truth

## 1. 正本を1つにする

同じ判断を複数fileへコピーすると、どちらがcurrentか分からなくなる。情報の種類ごとに正本を決め、他の文書は正本へのlinkと用途に必要な要約だけを持つ。

例:

- kit version: `VERSION`
- kitの変更履歴: `CHANGELOG.md`
- 適用済みkit state: `docs/BOOTSTRAP_STATE.json`
- 人向けadoption履歴: `docs/BOOTSTRAP_ADOPTION.md`
- 設計判断: `docs/ADR/`
- 現在の仕様: `docs/SPEC/`
- 補足と操作reference: `docs/REF/`

適用先projectでは、Project Modelが定める文書構造を基準にproject固有の正本を明示する。

## 2. 文書の寿命を分ける

- Durable source: 継続して参照する事実、規則、仕様
- Decision record: 重要な選択と理由
- Working record: 実行中の計画、調査、review
- Session handoff: 次のsessionに必要な現在地
- History: currentではないが、判断経緯として残す資料
- Output: 提出物や成果物。自動的にdurable sourceへ昇格しない

作業記録やchat全文をcurrent仕様へコピーしない。再利用する情報だけをevidenceと適用範囲を確認して正本へ反映する。

## 3. 確度を区別する

- 利用者提供の事実
- 外部sourceで確認した事実
- repositoryから確認した事実
- 推論・解釈
- 仮説・未確認事項

外部仕様や価格など変動する事実は、確認日、source、再確認条件を残す。未確認事項を確定事項として書かない。

## 4. Stateを手動編集しない

`docs/BOOTSTRAP_STATE.json`とbaselineはupgrade比較の機械可読正本である。schema migration、ownership変更、feature state更新は対応するplanまたはCLIを使い、integrityとhistoryを維持する。
