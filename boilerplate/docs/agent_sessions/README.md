# agent_sessions

セッションごとの活動記録と再開情報を置く。

active rootには、現行フェーズとフェーズ間作業のsession、および最新の再開プロンプトを置く。フェーズの正式完了後は、参照切れがないことを確認して、そのフェーズに属するsessionを設定済みsession root配下の`phaseN/`等へarchiveする。mature adopterでは既存のsession root mappingを尊重する。

session pathがimmutable referenceまたは監査対象の場合は移動せず、適用除外理由と代替索引を記録する。

推奨ファイル:
- `session_yyyymmdd_nn.md`
- `session_template.md`
- `chat_resume_prompt.md`
