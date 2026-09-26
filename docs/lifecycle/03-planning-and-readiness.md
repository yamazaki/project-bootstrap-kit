# 03 Planning and Readiness

## 目的

projectの到達点をPhaseへ分け、現在Phaseを実行可能なWBSへ落とす。

## ROADMAPとcurrent plan

- ROADMAP: Phaseの順序、各到達点、依存関係、長期backlog
- Current plan: 現在Phaseのscope、WBS、impact、migration、rollback、version、test、受入条件

ROADMAPは詳細task一覧にせず、current planは抽象的な目標だけにしない。

## Implementation readiness

実装前に少なくとも次を確認する。

- 目的とscope
- 正本となるSPEC / ADR / REF
- 変更面と対象file
- 既存利用者へのmigration
- rollback
- version / ChangeLog影響
- testと利用者review
- external writeや費用の境界

## 完了の目安

- WBSの各taskに観測可能な完了条件がある
- 重要な設計判断が未確定のまま実装へ移っていない
- 失敗時の回復方法がある
- AI側完了と利用者受入が区別されている

小規模projectではPhaseを1つにできる。省略方針は[Small Project Tailoring](../concepts/tailoring-small-projects.md)を参照する。
