# UIデザインの利用と更新

## 1. 入口

契約は[SPEC_010](../SPEC/SPEC_010_ui_design_lifecycle.md)、配布する基準のsourceは`boilerplate/docs/UI_DESIGN_BASELINE.md`。以下のスキルは適用先のAI surfaceのskill rootに配置される。

| 依頼 | 主な入口 | 戻す先 |
| --- | --- | --- |
| 新規UI・追加対象・大きな再設計 | `project-bootstrap-kit-ui-design` | 表示可能な案、採否、REF、現在タスク |
| UI変更後・受入前・review-only | `project-bootstrap-kit-ui-review` | 実画面・操作・媒体別の未確認と証跡 |
| 採用判断の反映・節目の棚卸し | `project-bootstrap-kit-ui-guideline-maintenance` | brand / 対象REF・関連SPEC・実装の整合 |

初期構想の主担当は引き続き`project-bootstrap`。UIの具体化が必要な箇所だけを引き継ぐ。文書の分類をUIスキルが独自に変更せず、`doc-governance`とDOCUMENTATIONへ従う。

## 2. 単一UIから始める

例えば「会員マイページの初回案を整える」依頼では、既存の要求と実装資産を読み、対象と方向性を押さえる。方向が未確定なら構図・文字・密度等の異なる具体案を表示して比較し、採用した判断だけを固有ガイドラインへ残す。

UI索引・共有brandは`docs/REF/REF_ui-guideline_project.md`を既定の入口とする。単一対象なら同じfile内で扱い、後から必要な対象文書へ分割できる。既存DESIGN.md等があれば、それを正本として参照し、新しい文書の作成を強制しない。

## 3. 複数UIを扱う

テナント管理、会員マイページ、運営管理、スマホアプリ、HTMLメールなどを、利用者・用途・媒体に応じて対象IDと適用範囲で区別する。スマホ向けWebはviewportの一つとして扱える。

共通brandは印象・意味・asset等を共有し、対象別の情報密度・navigation・部品・媒体表現は独立して決める。共有tokenの変更では利用先を調べ、各対象への影響あり / なし、反映・再確認・未確認を残す。対象固有の改善を全対象へ自動で広げない。

## 4. 運用中に育てる

観察→試行→採否→適用範囲の判断→正本・実装反映→再確認→統合・修正・廃止を扱う。規則が既にあるのに同じ問題が起きた時は、規則の追加前に読込漏れ・実装不整合・適用条件の違いを確認する。

未採用の候補はWORKまたは既存capture-inbox、他projectにも成立する知見は既存knowledge-feedbackへ接続する。feedbackの固定保存先・匿名化・利用者確認は既存手順を維持する。

## 5. 既存projectへの導入

- stateあり: 新しいclean kitで通常scan / planを生成する。baseline・3スキル・assets / referencesの追加と、既存AGENTS・開発/文書運用・初期構想・skillの差分をpathごとに確認する。
- stateなし: 通常scanが案内する既存のlegacy state migration / adoption planを使う。ADDを確認して追加し、独自文書・同名skillのCONFLICTは保持・手動統合等を判断する。
- 旧記録のproject名が人向けの名称でslugとして使えない場合は、既存CLIの`--project-slug`で初期slugを明示する。名称からの曖昧な推定をしない。
- 手動統合は既存契約どおり1file編集→受入→次fileの順。既存固有規則をまとめて上書きしない。
- 既存のUI索引・DESIGN文書を調べて再利用する。kitの雛形を更新しただけで、育てたproject文書を作り直さない。
- CLI・引数・state操作は適用先の`project-bootstrap-kit-upgrade` skillと[Bootstrap State](./REF_reference_bootstrap_state.md)に従う。本機能専用のstateやCLIはない。

rollbackは更新前のcontent・state・baseline・adoption履歴を同じ退避点へ復元し、project固有文書を保持して再scanする。公開・メール送信・外部tool導入はこの文書配布に含まれない。
