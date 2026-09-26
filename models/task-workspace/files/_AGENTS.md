# Task Workspace AIエージェント指示

## 1. 目的

本リポジトリは継続的なtask workspaceである。恒久情報を変更するときや、外部向け成果物を作るときは、先にworkspaceの正本を確認する。

## 2. 開始時に読むもの

1. `SESSION_HANDOFF.md`
2. `sessions/SESSION_INDEX.md`
3. `context/CONTEXT.md`
4. `context/MASTER.md`
5. 依頼に関係するoutputとsession記録

## 3. 正本とdirectory境界

- `context/`: 恒久情報、判断基準、現在の正本
- `outputs/`: caseまたは期間固有の成果物
- `sessions/`: 判断、作業履歴、未決事項、再開地点
- `docs/ADR/`: 継続的に影響する判断
- `docs/REF/`: 再利用可能な参照資料
- `docs/WORK/inbox/`: 未昇格のidea、issue、question

Evidenceと適用範囲を確認せず、outputやsession記録を恒久情報へ昇格しない。

## 4. 事実とEvidence

- 利用者提供の事実、外部確認済み事実、解釈、仮説を区別する。
- 不明な名称、日付、役割、数値、条件を補完しない。
- 不確実性を残し、利用者確認が必要な事項を明示する。
- chat、email、private source全文をsession記録へ複製しない。

## 5. 外部操作

送信、共有、応募、投稿、削除など外部systemを変更する前に、正確な対象、内容、影響、回復方法を提示し、action-time approvalを得る。

外部操作の結果が不明な場合は自動retryしない。

## 6. 変更と完了

- File変更はGit commit、push、外部操作の承認を兼ねない。
- 無関係な変更と並行作業を保持する。
- 重要な判断、成果物、未決事項、次の開始点を記録する。
- 意味のある作業では、引継ぎ事項がない場合も`SESSION_HANDOFF.md`を更新する。
