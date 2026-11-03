---
name: project-bootstrap-kit-ui-design
description: project-bootstrap-kitの共通UI基準とプロジェクト索引を使い、新規・追加UI対象の要求、比較モック、採用方針、対象別ガイドラインを整える。既存方針内の通常実装では新しいデザイン探索を要求しない。
---

# UI設計と方向性の具体化

文書の分類はprojectのDOCUMENTATION、初期構想はproject-bootstrap、作業線・承認・完了は既存AGENTS等を正本とする。手順を重複定義しない。

## 対象を押さえる

1. `docs/UI_DESIGN_BASELINE.md`、既存UI索引、関連SPEC、対象実装を確認する。索引の既定は`docs/REF/REF_ui-guideline_project.md`。既存DESIGN.md等も探し、正本を複製しない。
2. 対象ID・path・route・用途から一意に特定し、brand・方針・媒体・利用者・中心課題を読む。共有変更は利用先へ広げる。曖昧なら共通調査を進め、依存する部分だけ質問する。
3. UIがない・今回UIを扱わない場合は固有文書を作らない。新しい対象は理由と範囲を明示し、依頼内で必要な登録を行う。

## 具体案を作る

- 既存`interaction_design.md`の要求・未決を引き継ぎ、同じ聞き取りをやり直さない。今の設計に不要な詳細確定を待たない。
- 未確定なら実際に近い日本語・データ・代表状態を使い、通常2〜3案の表示可能なモックを作る。構図・文字・密度・navigationに意味のある違いを持たせ、意図と弱点を示す。
- 画像やデザインsystemは参照する属性と採用条件を明確にする。外部tool・画像生成を必須にしない。既存方針内の小変更は採用済み資産を使う。
- 初回提示では全案とcaptureを示す。未選択の方向性を本実装へ広げない。案の選択待ちなら、比較できる成果物、選ぶ点、次の作業を示す。

## 判断を残す

- 採用判断から共有brand・対象方針・token / componentの対応を整理する。数値の正本は実装へ置く。
- 新設時だけ[project雛形](assets/project-guideline.md)・[対象雛形](assets/target-guideline.md)を使う。単一対象はproject文書内でよい。複数UIを機械的に全生成しない。
- 比較・採否・captureは現在の作業線のWORKに置く。[記録項目](assets/design-record.md)を必要な範囲で使う。計画・WBSは既存正本を参照し、別WBSを作らない。
- 製品の要件・受入条件はSPECへ接続し、文書分類はdoc-governance、技術採否はTECHNOLOGY/ADOPTIONに従う。

完了時は対象集合、採否・未決、成果物、実装・検証の次手を示す。AI側の準備と利用者の受入を区別する。描画・操作の確認はproject-bootstrap-kit-ui-reviewの手順へ接続する。
