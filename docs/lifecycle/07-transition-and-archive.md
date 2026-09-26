# 07 Transition and Archive

## 目的

完了した計画をcurrentな作業場所から外し、判断経緯と再開情報を失わずに次の作業へ移る。

## Phase完了時

- WBS、受入、verificationを完了する
- 残課題を次Phase、別案件、backlogへ明示的に移す
- impact、migration、rollback、version、ChangeLogを再確認する
- current planをhistoryへ移す
- ROADMAPと文書indexを更新する

## Handoff

別sessionや別担当へ移る場合は、直前の結果、重要判断、関連file、未決事項、次の開始点を残す。chat履歴だけを継続情報の正本にしない。

## Archive

archiveは削除ではない。currentでないことを明確にし、current文書から必要な場合にだけ参照する。古い事実を黙って書き換えず、訂正や後継sourceを示す。

## task-workspace

task-workspaceでは、outputとdurable contextを分け、session indexと`SESSION_HANDOFF.md`を更新する。outputを自動的にMASTERへ昇格させず、継続利用する事実だけをreviewして反映する。
