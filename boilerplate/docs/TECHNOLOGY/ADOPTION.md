# Technology Profile Adoption

- Status: Active
- Scope: Global
- Source of Truth: Yes
- Owner: Product / Engineering
- Owner WBS: 0.1
- Promotion Target: Retain-in-Work
- Supersedes: N/A

本書は、選択したTechnology Profileについて、プロジェクト固有の採用、不採用、後続検討、例外、一次検証を継続記録する正本である。

## 1. 運用原則

- profile追加時点では前提と初期採否だけを記録し、実装経験に応じて更新する
- guidelineの項目を不採用にする場合は、理由と再検討条件を記録する
- 時点依存の判断には、再検証するイベントまたは時期を持たせる
- platform仕様の数値や挙動を記録する場合は、確認日と一次情報を付ける
- 実secret、実URL、個人情報、テナント固有値を記録しない

## 2. profile別採否

<!-- technology-adoption:start -->

選択済みprofileはない。

<!-- technology-adoption:end -->

## 3. 更新タイミング

- WORK/0.1で技術を選定または変更した時
- profileを追加または更新した時
- 技術選定ADRを確定した時
- profile前提と異なる実装判断を行った時
- E2E、production運用、障害対応で新しい知見を得た時
- WBSマイルストーンまたはフェーズをクローズする時

## 4. ガイドラインへの昇格

- コードを書くたびに従う恒常的なルールは `docs/CODING_GUIDELINE.md` へ反映する
- 開発、検証、deployなどのプロセス規律は `docs/DEVELOPMENT_GUIDELINE.md` へ反映する
- 背景、比較、決定理由はADRに残し、ガイドライン側から参照する
- 他プロジェクトにも通用する知識はknowledge feedbackとして抽出する

## 5. 変動制約の確認形式

limits、pricing、API、quota、設定継承、runtime仕様などは、設計・実装時点の公式一次情報を確認して次の形式で記録する。

| 制約 | 確認日 | 一次情報 | 確認結果 | 設計への影響 | 再確認条件 |
| --- | --- | --- | --- | --- | --- |
| <constraint> | YYYY-MM-DD | <official source> | <current fact> | <decision impact> | <event or date> |
