# Project Model Contract

最終更新: 2026-09-24
Status: Accepted

## 1. 目的

Common Coreを用途別Project Modelへ具体化し、既存development projectとの互換性を維持しながら、task-workspaceを選択・生成・検証・追跡する契約を定義する。

## 2. Models

初期Model:

- `development`
  - status: stable
  - Model version: `1.0.0`
  - 既定Model
- `task-workspace`
  - status: preview
  - Model version: `0.1.0`

1 projectは同時に1 Modelだけを持つ。Model合成はv1対象外。

## 3. Common Core

すべてのModelは用途に合う表現で次を満たす。

- 目的、対象、非対象
- source of truthと必読文書
- 作業開始、status、review、完了条件
- file、commit、external writeの承認境界
- secret、private情報、rollback
- session継続とhandoff
- capture / triage
- project固有知識とknowledge feedbackの分離

Common Coreは同じfile一式を全Modelへ強制しない。

## 4. Source authority

- 現行`boilerplate/`をasset libraryとして維持する
- top-level `models/`をModel catalog / manifestの正本とする
- Model manifestは使用するsource / targetをexact pathで列挙する
- manifestにないboilerplate assetを自動展開しない
- Model固有assetは`models/<id>/files/`へ置ける
- Common exact assetは複数Model manifestから参照できる
- conceptが共通でも表現が違う場合はModel固有sourceを使用する

## 5. Naming CLI

全Modelで必須:

- `--project-name`
  - 人向けproject / workspace名称
  - 日本語・空白を許可
- `--project-slug`
  - machine-readable identifier
  - lowercase kebab-case

Developmentのみ任意:

- `--product-name`
  - 人向け製品 / service名称
  - 省略時はproject-nameを使用

Task-workspaceではproduct-nameを使用しない。`--display-name`は導入しない。

Model省略時はdevelopment。unknown、deprecated、複数Model、slug欠落・invalidはfail-closed。

現行の`project-name <slug> / product-name <display>`から新意味へ曖昧推定せず、migration guidanceを表示する。

## 6. Model registry

CatalogはModel ID、status、version、manifest、defaultを保持する。

Rules:

- IDはlowercase kebab-caseで一意
- defaultはdevelopment 1件だけ
- statusはstable / preview / deprecated
- Model versionはSemVer
- Model versionはkit VERSIONを置き換えない
- missing manifest / duplicate / unknown statusはBLOCKED

## 7. Model manifest

少なくとも次を持つ。

- schema version
- Model ID / version / status
- exact asset mapping
- required / optional paths
- Model-supported AI surfaces
- Technology Profile policy

Modelにないproject独自pathはEXTRAであり、禁止fileではない。

## 8. Composition pipeline

1. Model asset selection / ownership
2. Model direct / transformed mapping
3. Technology Profile applicability
4. Technology Profile defined merge
5. AI surface skill placement / conditional CLAUDE
6. engine-managed adoption / state / attribution
7. full collision / required path verification

暗黙のlast-write-winsを禁止する。同一targetは同一bytes確認または明示merge contractがなければBLOCKED。

Modelはengine-managed pathを書かない。AI surfaceはModel文書の意味を置換しない。

## 9. Technology Profile applicability

- profile metadataへ`supportedProjectModels`を追加できる
- fieldあり: selected Modelを含まなければnot-applicable error
- fieldなしlegacy profile: development-only
- current bundled profiles: development対応として明示migration
- task-workspace: profileなしを正常defaultとする
- unsupported profileを黙って無視しない

## 10. AI surfaces

初期対応:

- development: codex / claude / both / rovo
- task-workspace: codex / claude / both / rovo

RovoはCodexと同じ`.agents/skills`配置契約を使う。Model別required skillsはPhase 3 fixtureで検証する。

## 11. development Model

現行development lifecycleを保持する。

- initial planning / implementation readiness
- ROADMAP / phase WBS
- SPEC / ADR / REF
- coding / test / E2E
- Technology Profile
- VERSION / ChangeLog / upgrade
- release / production / MNT / OPS

Model省略と明示developmentのfresh outputは意図した範囲で一致しなければならない。

## 12. task-workspace Model

必須:

- AGENTS / README
- SESSION_HANDOFF
- context / master
- outputs
- session index / record
- docs index / documentation
- external action approval

Defaultでは生成しない:

- VERSION / ChangeLog / VERSIONING
- ROADMAP / phase WBS
- coding / development guideline
- Technology Profile
- development MNT / OPS / ADV

上記fileがproject独自に存在してもEXTRAとして保持し、拒否しない。

## 13. task-workspace lifecycle

- durable context / masterとcase / period outputを分離
- fact、external evidence、interpretation、hypothesisを区別
- outputからdurable sourceへ自動昇格しない
- session indexとcurrent handoffを更新
- chat / email全文をsession記録へ複製しない
- old factを黙って削除しない
- send / share / apply / post等はexact previewとaction-time approvalを必要とする
- outcome unknownを自動retryしない

## 14. Adoption metadata

人向け記録:

- Project Name
- Project Slug
- Product Name（developmentで使用）
- Project Model
- Project Model Version / Status
- AI Surface
- Technology Profiles

current accepted stateの機械可読正本はBOOTSTRAP_STATE。

## 15. Bootstrap State schema 2

Project sectionへ次を追加する。

- project name
- project slug
- development product name
- Project Model ID / version / status / contract version
- accepted Model manifest digest

これらはintegrity対象。snapshotはselected Model、profiles、AI surfaceの合成結果だけを追跡する。

## 16. Legacy migration

State schema 1 / Modelなしadopter:

1. State / adoption / baseline integrity確認
2. 旧project.nameをslug候補
3. 旧productNameをproduct name候補
4. 人向けproject nameはproduct nameを初期候補として利用者review
5. generated pathsをdevelopment manifestと照合
6. schema 2 / development migration planをpreview
7. 明示applyでmetadata / state / history更新
8. metadata migrationだけを理由にcontent fileを変更しない
9. rerunはSKIP(SAME)

自動applyと意味推定によるtask-workspace判定を禁止する。

## 17. Model change

通常upgradeとして扱わない。v1ではModel変更CLIを実装しない。

将来優先scenarioはtask-workspace → development。

- context / outputs / sessions / handoffを保持
- development assetsを追加
- AGENTS / DOCUMENTATIONをmanual merge
- 不要pathを自動削除しない
- Common concept mapping未解決ではcompleteしない

development → task-workspaceもmanual migration対象だが初期優先度は低い。

## 18. MIT attribution

全Modelでkit MIT全文を追跡可能にする。

```text
.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt
```

- user root LICENSEを変更しない
- BOOTSTRAP_ADOPTIONから参照
- legacy adopterへreview可能なadd / conflict plan
- 削除・変更をsilent successにしない
- engineManagedPaths / integrityの詳細はPhase 3実装設計で確定

## 19. Compatibility

- current development fresh output互換をfixtureで確認
- profile / AI surface matrixを維持
- existing adopter migrationはplan-first
- state schema 1 planをschema 2として再生成
- Model manifest外assetをupstream pathとして扱わない
- Model / profile / AI surface collisionはfail-closed

## 20. Acceptance

Phase 3は少なくとも次を検証する。

- development explicit / default互換
- task-workspace required / default-absent paths
- name / slug / product semantics
- Model catalog / manifest coverage
- collision / required path / unsupported combination
- profile applicabilityとlegacy default
- 4 AI surfaces
- state schema 2
- legacy development migration / stale / integrity / rerun
- task→development manual boundary
- MIT attributionとroot license保持
- private marker不在
