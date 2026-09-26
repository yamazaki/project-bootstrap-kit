---
name: maintenance-work
description: Use when fixing, tuning, or making a bounded compatible change to behavior that is already released or operating. Also use when the user explicitly identifies the request as MNT or maintenance work. Do not use for planned current-phase development or incident diagnosis alone.
---

# maintenance-work

リリース済み・運用中のbaselineに対する変更を、MNTとして安全に受付、実装、検証、記録する。

skillの起動だけを、依頼範囲外のファイル変更、外部操作、commit、pushへの承認とみなさない。相談または診断だけを求められた場合は、記録作成や修正へ進まず、判定と提案に留める。

## 入口

1. `docs/WORK_LINE_ROUTING.md` と `docs/WORK/maintenance/README.md` を読む
2. 索引で重複・関連MNT、関連OPSを確認する
3. 変更対象の運用中baselineと、現在フェーズの計画開発を区別する
4. 関連する `SPEC / ADR / REF / TECHNOLOGY / VERSIONING` を必要な範囲で読む
5. MNTとして扱うこと、影響範囲、実装・検証・ロールバック方針を示す

明示起動された場合も、実態が障害調査だけならOPS、未提供の新能力や重要な設計変更ならEpicが適切でないか確認する。

## 実行

- 次の `MNT-N` を採番し、索引と件別記録を作る
- 実装中に仕様や設計の正本と乖離を見つけた場合は、コードだけでなく正本も更新対象に含める
- 必要なテスト、受入手順、migration、rollback、version影響を確認する
- OPSから発展した修正は、原因説明を複製せずOPSへリンクする
- scopeが新しい能力、ADR改訂、複数マイルストーンへ拡大した場合はEpic化を提案する

## 終了

- 件別記録に変更ファイル、検証結果、省略した検証と残リスク、正本更新、関連IDを残す
- 利用者確認やリリースが残る場合は `✅` にせず、確認待ちを明記する
- リリース確定時だけ `version-governance` の対象とする
