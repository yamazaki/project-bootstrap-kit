---
name: phase-transition
description: Use when closing a project phase, checking phase completion, archiving the current phase plan, planning the next phase, creating WBS, or carrying deferred scope into later phases.
---

# phase-transition

## 目的

フェーズ終了と次フェーズ開始を再現性ある手順で進める。

正本は `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`。本 skill は補助である。

## 標準手順

1. 前提確認
   - `docs/ROADMAP.md`
   - `docs/PLAN_PHASE_CURRENT.md`
   - 最新の `docs/agent_sessions/session_*.md`
   - `docs/agent_sessions/chat_resume_prompt.md`
   - 対象フェーズの `docs/WORK/<phase>.*`
   - 関連する `SPEC / ADR / REF / Runbook`
   - `docs/TECHNOLOGY/INDEX.md` と `docs/TECHNOLOGY/ADOPTION.md`
2. 現行フェーズのクローズ
   - 目標、IN / OUT、完了条件、WBS 状態を照合する
   - 未完了、後続送り、スコープ外を明示する
   - クローズ文書を `docs/WORK/<last-phase>.<last-milestone>/` に作る
3. 文書棚卸し
   - `promote`
   - `retain-in-work`
   - `delete`
   - Technology Profileの採否、例外、一次検証、後続検討を棚卸しする
4. 次フェーズ計画
   - 完了済み `PLAN_PHASE_CURRENT.md` を `docs/history/PLAN_PHASE_<phase>_<yyyymmdd>.md` へ退避する
   - `docs/ROADMAP.md` の完了フェーズ、現在フェーズ、将来フェーズを更新する
   - `docs/PLAN_PHASE_CURRENT.md` に次フェーズの目標、IN / OUT、マイルストーン、WBS、完了条件、リスク、成果物を作る
5. 反映漏れレビュー
   - 前フェーズ成果物と次フェーズ WBS を突き合わせる
   - Runbook の OUT / 未確認事項も確認する
   - 漏れは WBS または `WORK` 文書へ反映する
6. 見送り事項台帳
   - 後続フェーズへ送る事項を台帳化する
   - 各項目に、送り先、再検討タイミング、再検討観点、根拠文書を持たせる
7. project-bootstrap-kitへのknowledge feedback
   - 他プロジェクトにも通用する成功、失敗、分岐条件、運用知識を抽出する
   - `knowledge-feedback` skillを使い、必要な場合はinternal版を作成する
   - kitへ渡す場合は匿名化済みexport版を別に作り、検査とユーザー確認を通す
   - internal版を移送せず、他リポジトリへ自動送信しない
8. 完了フェーズのsession archive
   - 正式完了したフェーズに属するsessionを特定する
   - 移動前にrepository内のreference scanを行う
   - 参照切れがないことを確認して、設定済みsession root配下のフェーズ別directoryへ移す
   - 現行フェーズ、inter-phase session、最新のresume promptはactive rootへ残す
   - session pathがimmutable referenceまたは監査対象の場合は移動せず、適用除外理由と代替索引を記録する
   - mature adopterでは既存のmapped session rootを尊重し、kit既定pathへ強制移動しない
9. セッション更新
   - `docs/agent_sessions/session_yyyymmdd_nn.md`
   - `docs/agent_sessions/chat_resume_prompt.md`

## PLAN の粒度

`PLAN_PHASE_CURRENT.md` はフェーズ実行計画である。

- WBS には「何をやるか」を書く
- 「技術的詳細と制約」にはフェーズ横断の前提、制約、後戻りが大きい判断を書く
- WBS ごとの詳細設計、API contract、Runbook、判断材料は `docs/WORK/<phase>.<milestone>/` に分ける

## 完了チェック

- フェーズクローズ文書がある
- 完了済み計画が `docs/history/` に退避されている
- `ROADMAP.md` と `PLAN_PHASE_CURRENT.md` の現在フェーズが一致している
- 次フェーズ WBS が前フェーズ成果物からの引き継ぎ事項を反映している
- 後続フェーズへ送る事項が再検討可能な台帳に残っている
- Technology Profileの採否と例外が更新され、汎用知識の有無が確認されている
- 完了フェーズのsessionがarchiveされ、active rootが現行フェーズ、inter-phase session、最新resume promptに限定されている。または適用除外理由と代替索引が記録されている
- session移動前のreference scanで参照切れ候補がないことを確認している
- resume promptがactive rootに残り、現行計画と一致している
- セッション記録と再開プロンプトが更新されている
