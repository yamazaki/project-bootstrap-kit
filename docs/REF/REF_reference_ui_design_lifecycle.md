# UIデザインの利用と更新

## 1. 入口

契約は[SPEC_010](../SPEC/SPEC_010_ui_design_lifecycle.md)、配布する基準のsourceは`boilerplate/docs/UI_DESIGN_BASELINE.md`。以下のスキルは適用先のAI surfaceのskill rootに配置される。

| 依頼 | 主な入口 | 戻す先 |
| --- | --- | --- |
| 新規UI・追加対象・大きな再設計 | `project-bootstrap-kit-ui-design` | 表示可能な案、採否、REF、現在タスク |
| UI変更後・受入前・review-only | `project-bootstrap-kit-ui-review` | 実画面・操作・媒体別の未確認と証跡 |
| 採用判断の反映・節目の棚卸し | `project-bootstrap-kit-ui-guideline-maintenance` | brand / 対象REF・関連SPEC・実装の整合 |

初期構想の主担当は引き続き`project-bootstrap`。UIの具体化が必要な箇所だけを引き継ぐ。文書の分類をUIスキルが独自に変更せず、`doc-governance`とDOCUMENTATIONへ従う。

実作業は、[新規projectの準備](#6-新規projectで使い始める)、[既存projectの準備](#7-既存projectで使い始める)、[具体案からガイドラインを決める](#8-具体案からガイドラインを決める)、[開発中に拡充する](#9-開発中に拡充する)の順に参照する。以下のプロンプトは適用先projectでAIへ送る例であり、kit自体へUIを実装する指示ではない。対象ID・path・内容・端末は自分のprojectに置き換える。

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

## 6. 新規projectで使い始める

### 6.1 kitを適用する

UI機能を含むv0.15.0以降のcleanなkit checkoutと、`.git`以外が空の適用先を用意する。[新規開発projectのguide](../guides/new-development-project.md)に従い、kitのrootから実行する例:

```bash
git init /path/to/my-service
node scripts/init-project.mjs \
  --target /path/to/my-service \
  --project-model development \
  --project-name "予約サービス開発" \
  --project-slug my-service \
  --ai-surface codex
```

Claudeなら`--ai-surface claude`、両方を使うなら`both`を選ぶ。空でない適用先には通常initを実行せず、次節の既存projectの経路を使う。

生成後、適用先をAIの作業projectとして開き、次を確認する。

- `docs/UI_DESIGN_BASELINE.md`とAGENTSからの参照
- Codexでは`.agents/skills/`、Claudeでは`.claude/skills/`配下の名前空間付き3スキル。bothは両方
- UI設計skill内の`assets/`、UI review skill内の`references/`

この時点でproject・brand・対象別ガイドラインがなくても正常である。UIが必要になった時に、既存文書を確認して最小限を作る。スキルが認識されない場合は配置先・name・現在の作業projectから参照できるかを確認し、globalへ同名skillを重ねて解決しない。

### 6.2 製品の要求がまだ曖昧なら初期構想から始める

```text
$project-bootstrap を使って、予約サービスの初期構想を整理してください。
利用者が相談を予約し、次回予約を確認・変更できるサービスです。
まず誰が何を達成するかと、初期提供範囲を整理したいです。
UIが必要な対象を洗い出し、具体化が必要になったところで
project-bootstrap-kit-ui-designへ接続してください。
既に答えた要求を繰り返し質問せず、未決事項と推奨案を示してください。
```

製品定義・主要操作・今回の対象がすでに決まっていれば、この聞き取りを繰り返さず、第8節の最初のプロンプトへ進む。全UIの詳細や配色を決め終えることを開始条件にしない。

## 7. 既存projectで使い始める

### 7.1 配布文書・skillを安全に受け入れる

先にkit更新とUI文書の改訂を分け、更新前の復元点を確保する。更新途中で対象文書を並行編集するとplanがstaleになり得る。導入経路は次のとおり。

| 適用先の状態 | 先に行うこと |
| --- | --- |
| kit適用済み・state schema 2あり | 通常scan / planで追加・変更を確認する |
| state schema 1あり | 既存手順でmetadata移行を完了し、再scanする |
| kit適用記録あり・stateなし | scanが案内するlegacy migration / adoption planを使う |
| kit未適用・既存fileあり | [既存project adoption](../guides/existing-project-adoption.md)で導入する |
| v0.15.0相当の文書・3スキルが受入済み | 再導入せず、既存UIの棚卸しから始める |

`project-bootstrap-kit-upgrade`が使える適用先では、例えば次のように依頼する。古いprojectに同skillがまだない場合は、通常の文章で同じ依頼を伝え、[更新guide](../guides/upgrading.md)に従う。

```text
$project-bootstrap-kit-upgrade を使って、UIデザイン支援を導入したいです。
適用先のstate・適用履歴・既存編集と、使用するkitのversionを確認してください。
共通UI基準、3スキル、AGENTS・初期構想・文書運用との接続差分を含む
planと判断案を提示してください。既存DESIGN.mdや独自skillを保持し、
更新中はUI設計文書を並行編集しないでください。
この依頼では、まだplanのapplyやUIの再設計は行わないでください。
```

kit rootからscanだけ行う例（planとbundleの保存先は未使用のpathにする）:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/my-service --scan \
  --plan-output /tmp/my-service-ui-upgrade/plan-001.json
```

AIとplanの`operation`・対象path・判断を確認し、適用する判断を受け入れた後でapplyする。人向け名称がslugとして使えない旧記録には、更新guideの該当経路で`--project-slug`を明示する。

```text
提示されたplanのうち、確認済みの追加・統合を進めてください。
独自の正本と既存skillは保持してください。手動統合は1fileずつ
編集→対応するCLIで受入→次fileの順で行い、全判断を確認してapplyしてください。
その後、別の保存先へ再scanし、受入内容と意図して保留した項目を報告してください。
UIの見た目の変更は、更新完了後の別タスクで扱います。
```

applyのCLIは`node scripts/upgrade-project.mjs --apply-plan /tmp/my-service-ui-upgrade/plan-001.json`。`adopt-existing`と`state-upgrade`では判断受入CLIが異なるため、判断・逐次統合の詳細は更新guideを正本とし、全fileの一括上書きやstate JSONの直接編集で代用しない。

### 7.2 既存UIの判断を棚卸しする

導入完了後、初回のUI作業として以下を依頼する。

```text
$project-bootstrap-kit-ui-design を使って、現在のUI設計の入口を整えてください。
既存の画面、DESIGN.md、関連SPEC、token・componentを調べ、
どれが採用済みの正本・判断で、どれが実装にあるだけの仮の判断かを整理してください。
テナント管理・会員マイページ・運営管理を対象として識別し、
既存正本を参照する最小のUI索引を整えてください。
今回は棚卸しと索引までとし、見た目の変更・正本の複製・全面再設計は行わないでください。
```

既存実装をすべて承認済みデザインと見なさない。継続する方針と改善候補を利用者が確認してから、第8節へ対象を絞って進む。見た目の変更が不要なら、新しい比較案を作る必要はない。

## 8. 具体案からガイドラインを決める

次の例は、代表のWeb UIを`member-portal`として扱う。各プロンプトは前の成果物を見てから送る。まとめて送って未確認の案を採用させない。UI対象の登録、比較案、確認記録は既存の作業線・タスクへ接続する。

### 8.1 最初の依頼: 利用目的から具体案へ

```text
$project-bootstrap-kit-ui-design を使って、member-portalの初回UI案を作ってください。
利用者は会員で、次回予約をすぐ確認し、必要なら変更できることが目的です。
主な利用端末はスマホですが、desktopでも使います。
対象のpath・routeは既存実装から確認し、未確定なら候補として示してください。
既存のproduct definition・interaction design・SPECと共通UI基準を引き継いでください。

目指す印象は落ち着きと親しみやすさです。配色や書体はまだ決めていません。
参考画像はありません。判断に必要な不足だけを少数の質問にまとめ、推奨案も示してください。
条件が揃ったら、代表画面を構図・文字・情報密度の異なる2〜3案で具体化してください。
実際に近い日本語・予約情報・長い名称を使い、表示できるモックとcapture、
各案の狙い・弱点・確認できた範囲を提示してください。
今回は未選択の比較案までとし、他UIや本実装へ広げないでください。
```

最初に伝えるのは利用者、達成したいこと、主要内容・操作、端末、既存の制約、今回の範囲。書体・色・数値を利用者がすべて指定する必要はない。既存brandがあればその参照を伝え、未決ならAIの仮定と提案を事実から分けてもらう。新しい外部toolの導入や大量の比較試行を通常の開始条件にしない。

### 8.2 見た結果を言葉にして、案を絞る

```text
案Bをベースにしたいです。次回予約と変更操作がすぐ見つかる点がよいです。
ただし、お知らせの存在感が強すぎ、文字の詰まりも気になります。
文字組みは案Aの読みやすさを参考に、優先順位と余白を調整してください。
何を変えるかを具体的に示し、修正版を確認できる形にしてください。
この段階ではまだ最終採用にせず、member-portalの代表画面だけを修正してください。
```

「好き／嫌い」の感想だけでも開始できるが、AIには対象箇所・利用上の問題・調整する変数へ翻訳してもらう。色だけを変える案を増やすより、同じ代表画面の構図・文字・密度を絞る。判断が難しければ、違いを並べて説明してもらい、全画面を一度に作り直さない。

### 8.3 採用した見た目を具体的な規則へ落とす

修正版を見て採用を判断した後で依頼する。

```text
この修正版を、member-portalの今回の方向性として採用します。
$project-bootstrap-kit-ui-guideline-maintenance を使い、採用理由と適用範囲を残してください。
共有brandに含める事項と、会員画面に限る事項を分け、未決・例外も記録してください。
既存正本を再利用し、必要な場合だけproject索引・対象別ガイドラインを雛形から作ってください。
モックから読み取れる具体的な規則を整理し、まだ合意していない細部は提案として区別してください。
token・componentの値は既存実装の正本を参照し、文書と二重管理しないでください。
```

ガイドラインの細部は、次を確認しながら決める。最初から全componentを網羅せず、代表画面で必要なものを具体化する。

| 論点 | AIに具体化してもらう内容 |
| --- | --- |
| 情報階層・構図 | 最初に見せる内容、主要/補助操作、column・grid・並び順 |
| 文字組み | 日本語を含む書体、見出し/本文/補助の役割、size・weight・line-height、折返し |
| 色 | brand・本文・補助・成功/注意/失敗等の意味、組合せとcontrastの確認 |
| 余白・密度 | spacing scale、行・領域の間隔、幅、一覧と日常操作画面の密度差 |
| 共通部品 | button・form・一覧・dialog等の役割、使い分け、状態・エラー・focus |
| 媒体・画面幅 | レイアウトの変化、入力方法、拡大、長文・空・読込・失敗の扱い |
| 継続運用 | 根拠・採用者、対象ID、例外、実装正本、capture・検証条件、未決 |

未実装段階の値は設計案として扱い、実装を正本化したら参照先をつなぐ。拘束的な製品要件はSPEC、比較案や確認結果はWORKへ分ける。ガイドラインの更新だけで実装も受入済みになったとは扱わない。

### 8.4 本実装へ反映し、実画面を確認する

```text
採用したmember-portalの方針で、現在タスクの対象画面へ反映してください。
既存token・componentを再利用し、必要な共通化の範囲を示してください。
反映後は $project-bootstrap-kit-ui-review を使い、代表的なdesktop/スマホ幅、
長い日本語、予約あり/なし、変更操作・入力エラーなど該当する状態を確認してください。
captureと実操作の結果、修正・再確認、未確認条件を現在タスクへ残してください。
他UIの見た目は今回変更しないでください。共有資産を変える必要があれば先に影響を示してください。
```

先にreview-onlyで確認したい場合は「sourceと正本文書は変更せず、問題・根拠・修正案だけ報告してください」と明示する。実画面を確認できない環境では、静的確認・モック確認と未確認範囲を分け、確認済みとは報告させない。

## 9. 開発中に拡充する

### 9.1 次の画面・componentを作る

通常実装では、採用済み方針と関連する正本を読むように依頼する。方向性を変えない追加で、毎回初期探索から始める必要はない。

```text
member-portalに予約履歴の詳細画面を追加してください。
UI索引から対象別ガイドライン・関連SPEC・既存token/componentを確認して再利用してください。
既存方針で決められる部分は進め、新しいpatternが必要な部分だけ推奨案を示してください。
実画面確認の結果、繰り返し使うと採用した判断があれば
project-bootstrap-kit-ui-guideline-maintenanceで既存の記述へ統合してください。
```

### 9.2 指摘を再利用する判断へ変える

```text
今回、長い会員名で操作buttonが押し出される問題を修正し、修正版を確認しました。
$project-bootstrap-kit-ui-guideline-maintenance を使い、既存規則・componentとの関係を確認してください。
同じ問題を防ぐため、どの対象・部品で再利用する判断かを整理し、
今回採用した範囲だけ反映してください。全UIの文字数制限には一般化しないでください。
根拠、例外、実装先、再確認した条件を残し、既存規則があれば重複追記せず統合してください。
```

一度の調整をルール化すべきか不明なら、候補としてWORKや既存inboxへ残す。規則がすでにある場合は、指示の追加より先に読込・適用・実装の不整合を調べる。

### 9.3 別用途のUIを追加する・共有brandを変える

```text
$project-bootstrap-kit-ui-design を使い、operator-consoleのUI方針を追加してください。
共有brandは維持し、運営者の横断検索・一覧比較を優先する密度と操作を提案してください。
member-portalの構成をそのまま流用せず、対象範囲と代表画面を決めて具体化してください。
共有するもの・対象固有にするものを明示し、既存UIは今回変更しないでください。
```

nativeアプリやHTMLメールも同じように対象を追加し、platform / clientと確認方法を個別に決める。共有brandの変更では、maintenance skillへ「共有tokenを利用する全対象の影響表、媒体別の代替表現、必要な実装・再検証・未確認を示して」と依頼する。単一対象の改善を自動でbrandへ昇格させない。

### 9.4 節目で整理する

```text
$project-bootstrap-kit-ui-guideline-maintenance を使って、今フェーズのUI判断を棚卸ししてください。
重複・矛盾・古い規則、未反映・例外・未確認を確認し、統合・修正・廃止の案を示してください。
採用済みの範囲は既存正本へ反映し、残条件は現在の計画・作業線へ接続してください。
汎用知見は既存knowledge-feedbackの候補とし、外部提出は行わないでください。
```

利用者は、代表画面を見た採否と、他のUIにも適用する範囲を判断する。AIは要求・具体案・規則・実装・確認証跡をつなぎ、未決を確定事項として増やさない。この往復で固有ガイドラインを育てる。
