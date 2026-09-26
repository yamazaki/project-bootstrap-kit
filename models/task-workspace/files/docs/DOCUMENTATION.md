# 文書運用ガイド

## 1. 正本

- 恒久情報・判断基準: `context/`
- Case・期間固有の成果物: `outputs/`
- Session判断・再開情報: `sessions/`と`SESSION_HANDOFF.md`
- 継続的な判断: `docs/ADR/`
- 再利用可能な参照: `docs/REF/`
- 未整理のidea・issue: `docs/WORK/inbox/`

## 2. 昇格

Sessionやoutputを恒久情報へ自動copyしない。Evidenceと適用範囲を確認し、再利用する事実・判断基準だけを昇格する。

## 3. Session記録

次を記録する。

- 実施したこと
- 決定したこと
- File・output
- 未決事項
- 次の開始点
- 関連commit

会話全文やprivate source contentを複製しない。

## 4. Handoff

意味のある作業後は`SESSION_HANDOFF.md`を更新する。残作業がない場合も明記し、直前の結果と有用なcontextを残す。
