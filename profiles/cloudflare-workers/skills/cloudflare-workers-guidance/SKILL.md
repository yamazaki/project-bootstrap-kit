---
name: cloudflare-workers-guidance
description: Use when designing, implementing, reviewing, testing, deploying, or operating a project that has selected the cloudflare-workers technology profile.
---

# cloudflare-workers-guidance

## 目的

Cloudflare Workersの実装時に、プロジェクト固有判断、実証知識、利用時点の公式仕様を組み合わせ、過去の失敗を繰り返さない。

## 参照順序

1. `docs/TECHNOLOGY/INDEX.md`
2. `docs/TECHNOLOGY/ADOPTION.md`
3. `docs/TECHNOLOGY/cloudflare-workers/GUIDELINE.md`
4. 必要な論点に対応する `docs/TECHNOLOGY/cloudflare-workers/REFERENCE.md`
5. limits、pricing、API、Wrangler、binding、secretに関するCloudflare公式文書

## 実施手順

1. 対象WBSとCloudflare Workersが担う責務を確認する
2. 記録の正本、逼迫資源、可視化要件、sink、配送保証を確認する
3. GUIDELINEの関連項目を適用する
4. REFERENCEの実証知識と分岐条件を確認する
5. 数値、料金、API、設定継承、runtime仕様は公式文書で再検証する
6. 変動制約ごとに確認日、一次情報、確認結果、設計への影響、再確認条件を `ADOPTION.md` に記録する
7. 採用、不採用、後続検討、現在実装との一致を `ADOPTION.md` に記録する
8. 恒常的な実装規約は `CODING_GUIDELINE.md`、プロセス規律は `DEVELOPMENT_GUIDELINE.md`、背景と比較はADRへ反映する
9. 新しい汎用知識または既存profileとの差異はknowledge feedback候補として捕捉する

## 禁止事項

- REFERENCE内の数値や料金を利用時点の確認なしに仕様へ固定しない
- kit取込時点の最新値を、新規プロジェクトの既定値として扱わない
- プロジェクト前提と突き合わせず、全項目を機械的に採用しない
- 実secret、実URL、テナント名、個人情報を採否記録やfeedbackへ含めない
- 公式文書との不一致を黙ってローカル修正だけで閉じない
