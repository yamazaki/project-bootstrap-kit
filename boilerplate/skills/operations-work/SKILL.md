---
name: operations-work
description: Use for operational tasks involving alerts, logs, service availability or stops, threshold breaches, suspicious events, recovery checks, or troubleshooting, whether or not an incident or code fix is ultimately found. Also use when the user explicitly identifies the request as OPS or operations work.
---

# operations-work

運用上の事象や確認依頼をOPSとして受け付け、事実・仮説・影響・回復・経過観察・恒久対応の要否を追跡可能にする。障害であることや修正が必要であることを前提にしない。

skillの起動だけを、本番変更、外部操作、ファイル変更、commit、pushへの承認とみなさない。依頼された調査範囲とプロジェクトの承認境界を守る。

## 入口

1. `docs/WORK_LINE_ROUTING.md` と `docs/WORK/operations/README.md` を読む
2. 索引から類似事象、過去の判断、再利用可能な確認・調査手順を探す
3. 該当Runbook、Technology Profile、安全不変条件を読む
4. OPSとして扱うこと、現時点の事実、確認範囲、変更を伴う操作の承認境界を示す

## 調査

- 次の `OPS-N` を採番し、索引と件別記録を作る
- 観測した事実、仮説、未確認事項を分ける
- alertが既知の閾値超過か、外部サービスの一時停止か、継続中の障害かを決めつけず確認する
- secret、個人情報、顧客データ、巨大なログ本文を記録へ複製しない
- 読み取り調査と、再起動、設定変更、データ修復、外部通知などの変更操作を分離する
- 結果が不明な外部操作は自動再試行せず、結果不明として保持する

## 終了または遷移

- 事象、判明した原因または非障害の判断、影響、回復、対応判断、再利用可能な確認・調査手順を記録する
- 修正不要、既知閾値、外部サービス一時停止の場合も判断根拠とクローズ条件を残す
- 恒久修正が必要なら `maintenance-work` へ引き継ぎ、MNTをリンクする
- 原因未確定、再発監視、外部待ちの場合は `👀` または `🚫` と条件を明記する
- 恒久Runbookや監視知識は適切な `REF` またはTechnology Profile採否へ反映する
