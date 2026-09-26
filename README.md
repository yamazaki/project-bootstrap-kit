# project-bootstrap-kit

`project-bootstrap-kit` は、プロジェクトの立ち上げ時に、開発の進め方、文書体系、AIエージェントの行動規範、変更・リリース運用をまとめて導入するためのbootstrap kitです。

アプリケーションの実装雛形を配るだけではなく、「何を正本として判断するか」「いつ実装へ進めるか」「変更をどこへ記録するか」「どの操作に利用者の承認が必要か」をリポジトリ内の文書とskillで明示し、人とAIが同じルールで継続的に開発できる状態を作ります。

## 適用するとできること

| 制御する領域 | 適用後の状態 |
| --- | --- |
| AIエージェントの行動 | `AGENTS.md` を正本として、必読文書、実装前の確認、承認が必要な操作、作業完了時の報告を統一します。Codex、Claude Code、Rovo向けのskill配置を選択できます。 |
| 構想から実装までの入口 | idea、product definition、interaction design、phase definition、実装準備チェックを順に整理し、前提が不足したまま実装へ進むことを防ぎます。 |
| 仕様と意思決定の管理 | `SPEC / ADR / REF / WORK / history / agent_sessions` を役割と寿命で分け、現在の正本、設計判断、作業中の記録、過去資料を混在させません。 |
| 計画と進捗 | `ROADMAP.md` と `PLAN_PHASE_CURRENT.md` を中心に、WBSの開始、レビュー待ち、受入完了を区別します。AIの作業終了だけでタスクを完了扱いにしない運用を導入します。 |
| 作業の振り分け | 計画開発をEpic、リリース済み機能の保守をMNT、運用調査をOPS、経験を活用する助言をADVへ振り分け、入口と記録先を明確にします。 |
| 途中で生じた論点 | 思いつき、課題、疑問をcapture inboxへ一旦分離し、その場で仕様やWBSへ無断反映せず、後で採否を判断できます。 |
| 技術固有のルール | runtime、integration、storageなどの知識をTechnology Profileとして選択・併用し、共通ルールと技術固有ルールを分離します。 |
| 品質とリリース | シナリオベースのテスト、E2E・実機確認、ChangeLog、version判断、phase移行の確認事項を開発プロセスへ組み込みます。 |
| セッション継続 | 作業記録と再開情報を残し、別セッションや別のAIエージェントでも判断根拠と次の作業を追跡できるようにします。 |
| 導入と更新の安全性 | 空の新規repoへの初期化に加え、既存repoではADDを含むpath判断、適用済みrepoではstate・baseline・3-way比較、stale判定、preflightを使って更新を制御します。 |

これらはプロジェクトの判断を自動的に決める仕組みではありません。判断基準、記録場所、承認境界、検証手順をリポジトリへ導入し、利用者が確認可能な形で開発を進めるための仕組みです。

## 全体像

```text
project-bootstrap-kit
├── models/             用途別Project Modelのcatalog、manifest、固有asset
├── boilerplate/        共通の文書体系、行動規範、skill
├── profiles/           選択した技術に固有のguideline、reference、skill
├── scripts/            新規導入、既存repoへのadoption、検証、upgrade
└── upgrades/           既存適用先へ追加できるfeature定義
          │
          ▼
適用先プロジェクト
├── AGENTS.md           AIエージェントの行動規範
├── CHANGELOG.md        利用者に意味のある変更履歴
├── docs/               仕様、判断、計画、作業、技術採否、履歴
└── .agents/skills/     Codex / Rovo向けskill
    または
    .claude/skills/     Claude Code向けskill
```

初期化時にはProject Modelを1つ選び、対応するasset、Technology Profile、AI surfaceを順序付きで合成します。`development`は製品・service・tool開発向けの既定Model、`task-workspace`は文書・調査・継続業務向けのpreview Modelです。kit自身の管理文書や開発履歴は適用先へコピーしません。

## 主な利用方法

用途に合う構成を先に選ぶ場合は、[Project Models](docs/project-models/README.md)と[Model選択guide](docs/guides/choosing-a-project-model.md)を参照してください。kitの判断原則は[Design Philosophy](docs/concepts/design-philosophy.md)にまとめています。

### 新しいプロジェクトへ導入する

空のGitリポジトリに共通構成を展開します。事前準備、詳しい導入手順、初期化後に確認するファイルは [GETTING_STARTED.md](GETTING_STARTED.md) を参照してください。

```bash
node scripts/init-project.mjs \
  --target /path/to/new-repo \
  --project-name "My Project" \
  --project-slug my-project \
  --product-name "My Product" \
  --ai-surface codex \
  --technology-profile cloudflare-workers \
  --technology-profile slack
```

`--project-model`を省略すると`development`です。`--project-name`は人向け名称、`--project-slug`はlowercase kebab-caseの機械識別子です。developmentの`--product-name`は任意で、省略時はproject nameを使用します。Technology Profileはdevelopmentで任意かつ複数指定できます。

公開版はprivate sourceと同じrelease version・利用者向け機能を持ちますが、private履歴や内部運用fileは含みません。詳細は[Public / Private Repository Boundary](docs/reference/public-private-boundary.md)を参照してください。

文書・調査用workspaceは次のように生成します。task-workspaceでは`--product-name`とTechnology Profileを指定しません。

```bash
node scripts/init-project.mjs \
  --target /path/to/task-repo \
  --project-model task-workspace \
  --project-name "調査ワークスペース" \
  --project-slug research-workspace \
  --ai-surface codex
```

### 既存の未適用プロジェクトへ導入する

既存ファイルを持つrepoでは、直接上書きせず `--adopt-existing` でread-onlyのplanを作成します。`ADD / SKIP(SAME) / CONFLICT / EXTRA` を確認し、ADDを含むmanaged pathごとの方針を決めてから適用します。planの確認方法とapply手順は [GETTING_STARTED.mdの「既存ファイルを持つ未適用project」](GETTING_STARTED.md#既存ファイルを持つ未適用project) を参照してください。

```bash
node scripts/init-project.mjs \
  --target /path/to/existing-repo \
  --project-name "Existing Project" \
  --project-slug existing-project \
  --product-name "Existing Product" \
  --ai-surface codex \
  --adopt-existing
```

### 適用済みプロジェクトを更新する

適用済みprojectは、直前に受け入れたupstream baselineと現在のkit/projectを3-way状態判定し、保存されたplanをレビューしてから適用します。基本方針、versionごとの移行事項、個別featureの注意点は [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) を参照してください。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --scan
```

個別featureはdry-runと想定差分を確認して適用できます。独自編集、手動判断が必要な項目、scan後に変更されたtargetは自動適用しません。

## Project lifecycle

導入後は、discovery、planning、implementation、release readiness、production運用、archiveへ進みます。production公開後はすべてを同じPhase計画へ入れず、機能開発、保守、障害・運用調査を分けます。全体像は[Project Lifecycle](docs/lifecycle/README.md)を参照してください。

## Technology Profile

現在は次のprofileを同梱しています。

- `cloudflare-workers`
- `gas`
- `questetra`
- `slack`

各profileは、長期的な実装原則、確認すべき公式情報、実証済みの知識、必要に応じた専用skillを提供します。プロジェクト固有の採否や例外は、適用先の `docs/TECHNOLOGY/ADOPTION.md` に記録します。

## このkitが対象にしないこと

- アプリケーションの業務仕様や完成済み実装を自動生成すること
- 採用技術、設計、費用、セキュリティ要件を利用者に代わって確定すること
- productionへのdeployや外部サービスの設定を無承認で実行すること
- 既存プロジェクトの独自文書や独自ルールを一律に上書きすること

適用後は、プロジェクト固有の目的、要件、採用技術、version正本などを初期文書へ記入し、利用者の判断を反映して使います。

## 次に読むドキュメント

- [GETTING_STARTED.md](GETTING_STARTED.md): 新規repoへの導入手順、既存repoのadoption、初期化後に確認するファイル
- [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md): 適用済みプロジェクトの更新方針、versionごとの移行事項、upgrade featureの使い方
- [docs/reference](docs/reference/README.md): 公開向けFAQ、用語、制約、support範囲
- [docs/reference/FAQ](docs/reference/faq.md): よくある質問
- [docs/reference/Troubleshooting](docs/reference/troubleshooting.md): 停止理由と回復方法
- [docs/reference/Known Limitations](docs/reference/known-limitations.md): preview・非目標・未対応範囲
- [CONTRIBUTING.md](CONTRIBUTING.md): Issue・Pull Request・rights・AI支援の方針
- [SECURITY.md](SECURITY.md): 脆弱性を非公開で報告する方法

初めて利用する場合は [GETTING_STARTED.md](GETTING_STARTED.md) から、既に導入済みの場合は [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) から進めてください。
