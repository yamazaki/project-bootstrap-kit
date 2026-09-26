---
name: knowledge-feedback
description: Use when extracting any reusable improvement for project-bootstrap-kit, including documentation governance, bootstrap planning, workflows, templates, skills, scripts, technology profiles, testing, or operations.
---

# knowledge-feedback

## 目的

プロジェクト内で得た成功、失敗、設計判断、運用知識、文書運用上の気づきを、project-bootstrap-kit全体の改善に利用できるfeedbackへ変換する。

Technology Profileは対象の一部であり、本skillはprofile専用ではない。

## 実行タイミング

- WBSマイルストーンのクローズ時
- フェーズ移行時
- production導入または重要なE2E完了時
- 障害対応や重大な設計変更で再利用可能な知識を得た時
- `docs/TECHNOLOGY/ADOPTION.md` にprofileとの差異が蓄積した時
- 文書構成、WORK/0.1、WBS、セッション運用、Runbook、versioning、skill、scriptに改善余地を発見した時

## 抽出対象

- platformやtechnology固有の実装・テスト・運用ノウハウ
- 成功した構成と成立条件
- 失敗した方式、原因、再発防止
- 一般論と異なる分岐条件
- guideline、template、skill、scriptの不足または不具合
- ADRから恒常ガイドラインへ昇格すべき規律
- 公式仕様との不一致または陳腐化した記述
- 文書分類、昇格、セッション、WBS、完了判定の改善
- bootstrap、verify、upgrade、versioningの不足や再発しやすい問題

## 標準手順

1. 対象マイルストーンまたはフェーズの成果物、ADR、Runbook、session、capture inbox、ガイドラインを確認する
2. 関係する場合は `docs/TECHNOLOGY/ADOPTION.md` の採用、不採用、後続検討、一次検証を確認する
3. プロジェクト固有事情を除いても成立する知識を抽出する
4. 前提、適用条件、反例、証拠レベル、確認日を記録する
5. プロジェクト内だけで使う `kit_feedback_internal_yyyymmdd_<slug>.md` を作成する
6. internal版から、source側の参照パスと固有名詞を除き、kit targetと再現性情報を保持した `kit_feedback_export_yyyymmdd_<neutral-slug>.md` を作成する
7. `scripts/verify-feedback-export.mjs --mode pre-review` でexport版の匿名化と再現性を検査する
8. ユーザーがexport版だけを確認する
9. `scripts/verify-feedback-export.mjs --mode final` でユーザー確認済みを含む最終検査を行う
10. 承認されたexport版だけをproject-bootstrap-kit側のfeedback inboxへ持ち込む

## feedbackの必須項目

- 概要
- 発見したプロジェクト内の文脈
- 一般化した知識
- 成立条件と適用しない条件
- 成功または失敗の証拠
- 影響するTechnology Profile
- kit側の反映候補
- Kit Target Map、Proposed Semantic Diff / Required Change、Reproduction Steps、Acceptance Criteria
- 通常より強いredactionが必要な場合のRedaction Exceptions / Rationale
- 変動しうる事実と一次確認先
- 機密情報を除去したことの確認
- export版では元プロジェクト内の参照パスをEvidence IDと匿名化した根拠概要へ置き換える

## internal版とexport版

- internal版
  - 元プロジェクト内だけに保管する
  - ADR、Runbook、session等の参照パスをEvidence IDへ対応付けてよい
  - project-bootstrap-kitへ渡してはならない
- export版
  - project名、product名、組織名、顧客名、tenant情報、repository名、ローカルパス、元文書ファイル名を含めない
  - 根拠は `E1`, `E2` のようなEvidence IDと概要だけにする
  - source evidenceとkit targetを別sectionに分ける
  - kit targetのrepository-relative path、section、schema key、CLI flag、semantic diff、再現手順、受入条件は再現性情報として残す
  - kit target pathはKit Target Map内だけに記載し、source project pathと混在させない
  - 公式一次情報URLは、プロジェクト固有URLと区別して残してよい

## export前検査

```bash
node <skill-dir>/scripts/verify-feedback-export.mjs --mode pre-review \
  docs/WORK/<phase>.<milestone>/kit_feedback_export_yyyymmdd_<neutral-slug>.md
```

`pre-review` はユーザー確認欄が未チェックでも、匿名化と再現性を検査する。ユーザー確認後は同じcommandを `--mode final` で再実行する。mode未指定は後方互換のため `final` とする。

source project側でkit treeを参照できない場合、target pathの存在確認はkit側の最終検査へ送る。機械検査は固有名詞を完全には検出できないため、最終検査後も人間による残存識別リスクと一般化妥当性の確認を必須とする。

## kit側での扱い

- feedbackは提案であり、受領時点でkitの正本へ直接反映しない
- kit管理者は受領時に `node scripts/verify-feedback-export.mjs --mode final <export-file>` を再実行し、Kit Target Mapのpathがkit treeに存在することも確認する
- kit側で匿名化、再現性、汎用性、現行公式仕様、既存ルールとの矛盾をレビューする
- 採用する場合はguideline、reference、profile、skill、template、script、文書運用のいずれかへ分類する
- 反映後はprofile version、CHANGELOG、UPGRADE_GUIDE、必要なupgrade featureを更新する

## 禁止事項

- 他リポジトリへ自動書き込み、commit、pushしない
- internal版をproject-bootstrap-kitへ渡さない
- export版へ実secret、credential、実URL、絶対パス、元文書パス、project名、product名、組織名、個人情報、顧客情報を含めない
- 単一プロジェクト固有の都合を汎用ルールとして断定しない
- 時点依存の数値やAPI仕様を一次確認なしに恒久ルールへ昇格しない
