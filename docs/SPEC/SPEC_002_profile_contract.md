# SPEC 002: Technology Profile Contract

## 1. 目的

Technology Profileが持つ責務、複数profileの合成、適用後の知識更新、project-bootstrap-kitへのfeedback契約を定義する。

## 2. profile の責務

profileは、runtime、integration、storage、framework、toolingなど、プロジェクトで採用する技術要素の制約と実践知を提供する。

各 `profiles/<id>/` は、次を持つ。

- `profile.json`
  - id、表示名、profile version、category、配布文書、profile固有skill、公式一次情報
- `GUIDELINE.md`
  - 長期的に有効な実装原則、制約、禁止事項、確認事項
- `REFERENCE.md`
  - 任意。過去プロジェクトの実証知識、失敗例、分岐条件
- `skills/`
  - 任意。profile適用、公式仕様確認、設計・実装・レビューを補助するskill

## 3. profile の非責務

profileは、共通の文書分類やWBS運用を上書きしない。それらは `docs/DEVELOPMENT_GUIDELINE.md` と `docs/DOCUMENTATION.md` の責務とする。

profile内の過去実証値は、limits、pricing、API、設定仕様の正本ではない。変動する事実は利用時点の公式一次情報を優先する。

## 4. 展開先

適用先では、次の構造へ配置する。

```text
docs/TECHNOLOGY/
├── INDEX.md
├── ADOPTION.md
└── <profile-id>/
    ├── profile.json
    ├── GUIDELINE.md
    └── REFERENCE.md
```

`INDEX.md` は選択済みprofileの索引、`ADOPTION.md` はプロジェクト固有の採用、不採用、例外、後続検討、一次検証の正本とする。

## 5. 優先順位

- platformの現在仕様は公式一次情報を優先する
- プロジェクト固有の採否と許容リスクは `ADOPTION.md`、`SPEC`、`ADR` を優先する
- profileの `GUIDELINE.md` は選択技術の共通原則として扱う
- `REFERENCE.md` は判断材料であり、機械的な全採用を禁止する

## 6. 選択と追加

- `--technology-profile` は任意かつ複数回指定できる
- profile未指定でも新規プロジェクトを開始できる
- WORK/0.1で採用技術が確定した時点または実装着手判定までに、必要なprofileを追加できる
- 新規CLIは `--technology-profile` に統一し、`--platform-profile` は受け付けない
- profile追加は `technology-profiles` upgrade featureでも実行できる

## 7. 継続更新

- profileの共通文書をプロジェクト固有事情で直接変更せず、差異は `ADOPTION.md` に記録する
- 技術選定ADR、E2E、production運用、障害対応で得た採否と一次検証を `ADOPTION.md` へ反映する
- ADRのうち恒常的な実装規約は `CODING_GUIDELINE.md`、プロセス規律は `DEVELOPMENT_GUIDELINE.md` へ昇格する
- kit側でprofile versionを更新する場合は、直前versionの配布文書を `profiles/<id>/history/<version>/` にsnapshotとして残す
- 既存プロジェクトの文書が旧snapshotと一致する場合だけ自動更新し、独自編集されている場合は `SKIP(KEEP)` とする

## 8. knowledge feedback

- `knowledge-feedback` はTechnology Profile専用ではなく、project-bootstrap-kit全体の改善を対象とする
- マイルストーンまたはフェーズのクローズ時に、他プロジェクトにも通用する知識を抽出する
- feedbackはproject内のinternal版と、kitへ移送可能な匿名化済みexport版を分離する
- internal版だけが元プロジェクトの参照パスを持ち、export版はEvidence IDと匿名化した根拠概要だけを持つ
- export版は機械検査とユーザー確認を通過してからkitへ移送する
- 実secret、実URL、個人情報、顧客・テナント固有値を除去する
- feedbackは提案としてkit側で再検証し、profileへ直接自動反映しない
- 他リポジトリへの自動書き込み、commit、pushを禁止する
