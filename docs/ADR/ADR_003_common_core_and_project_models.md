# ADR 003: Common Coreと用途別Project Modelを分離する

- Status: Accepted
- Date: 2026-09-22
- Scope: project-bootstrap-kit distribution model
- Related: EPIC-4 / P0.3.01

## 1. Context

現行project-bootstrap-kitは、service、application、tool、integration等の開発projectを対象として、構想、WBS、実装、test、release、production運用、MNT / OPSまでを扱う形で成熟した。

一方、a documentation-oriented workspaceでは、deployable softwareを主成果とせず、恒久情報、案件別成果物、session履歴、handoff、外部送信の承認境界を中心とする運用が成立している。a distribution-oriented projectでは、upstream同期と配布という目的に合わせ、一般開発とは異なる作業taxonomyとsource / decision / distributionの分離が成立している。

これらに共通する原則はあるが、現在のdevelopment向け文書一式をすべてのprojectへ配布すると、不要なWBS、Technology Profile、production運用を強制する。逆に共通部分だけへ抽象化しすぎると、実際に使えるproject lifecycleを失う。

## 2. Decision

### 2.1 Common Core

Project Modelに依存しない契約をCommon Coreとして定義する。

- repository / workspaceの目的、対象、非対象
- root `AGENTS.md` による必読文書、開始・終了、変更境界
- 恒久情報、判断、作業中記録、成果物、履歴の正本分離
- 用途別work routing、status、review gate、線間遷移
- session継続、handoff、未決事項、次の開始点
- file変更、commit、external writeの承認境界
- secret、private情報、stale plan、rollback、検証
- feedbackの捕捉、検査、採否、昇格
- 用途に応じた変更履歴、version、release能力

Common Coreは同じ文書一式を全Modelへ機械的にコピーする層ではない。各Modelが利用者、責務、語彙に合わせて具体化する最小契約とする。

### 2.2 Project Models

初回公開では次の2 Modelを扱う。

- `development`
  - service、application、tool、integration、automation等
  - idea、product definition、ROADMAP、phase WBS、SPEC / ADR / REF
  - coding、test、E2E、release、production、MNT / OPS
  - Technology Profile、ChangeLog、version、upgrade
  - 初回公開時のstable Model
- `task-workspace`
  - 調査、文書制作、キャリア活動、案件管理、継続的な業務支援等
  - durable context、master data、case / period outputs、session index、handoff
  - 事実、外部確認、解釈の分離
  - 外部送信、共有、応募、投稿等のaction-time approval
  - 初回公開時のpreview Model

a documentation-oriented workspaceの個人情報、転職条件、企業名、service固有操作は配布しない。成立している構造と責務だけを一般化する。

### 2.3 Composition

- Project ModelとTechnology Profileは別軸とする
- 初期段階では1 projectにつき1 Project Modelとする
- Model合成と第3の標準Modelは初回公開範囲に含めない
- a distribution-oriented project固有taxonomyを標準Modelとしてコピーしない
- project目的に応じてwork taxonomyを具体化できる契約として取り込む

### 2.4 Compatibility

- Project Model省略時は現行互換の `development` として扱う
- Model情報を持たない既存adopterも `development` として扱う
- Model identityは将来のCLI、adoption metadata、state、baseline、verify、upgrade契約へ記録する
- Model間の自動変換は行わず、必要な場合はreview可能なmanual migrationとする
- 非対応Technology Profile、未知Model、asset collisionはfail-closedで扱う

## 3. Initial audience and language

- Primaryは、AI coding agentと継続的に協働する個人開発者、小規模team、既存repository maintainerとする
- Secondaryとして、codeを主成果としない継続workspace利用者を扱う
- 日本語を仕様・運用文書の正本とする
- public README等に英語overviewと利用入口を段階的に追加する
- full English translationは初回公開のblockerにしない

## 4. Alternatives

### 4.1 `development-bootstrap-kit`へrenameする

不採用。現行機能の説明は明確になるが、task workspace等へ共通原則を展開しにくく、既存のproject-bootstrap-kit identityとadoption metadataも変更する必要がある。

### 4.2 現行development構成をすべての用途へ適用する

不採用。code、WBS、release、productionを主成果としないworkspaceへ不要な構造を強制する。

### 4.3 完全に抽象的なframeworkへ置き換える

不採用。現行の実証済みdevelopment lifecycleを失い、利用者が具体的に導入できない。

### 4.4 a distribution-oriented project型を第3 Modelとして同時追加する

初回公開では不採用。専用taxonomyを許容する根拠にはなるが、標準Modelとして一般化する実証が不足している。

## 5. Consequences

- 現行利用者は `development` として互換維持できる
- task workspaceへ不要なdevelopment文書を配布せずに済む
- Common CoreとModel assetのownership、collision、verify、upgrade契約が必要になる
- Model別fixtureと受入scenarioが必要になる
- preview Modelの制約とstable昇格条件を文書化する必要がある
- 新しいModelを追加する際は、単一事例を過度に一般化せず、実証とnon-goalを確認する必要がある

## 6. Follow-up

- Phase 2でProject Model SPEC、CLI、state、profile applicability、migrationを確定する
- Phase 3で `development`互換と `task-workspace`最小構成を実装する
- Phase 4でModel選択と各lifecycleを利用者向けに説明する
