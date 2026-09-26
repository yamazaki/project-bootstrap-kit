# Public Repository Layout Reference

最終更新: 2026-09-23

本書は`SPEC_007_public_distribution_contract.md`に従うpublic treeの配置、ownership、変換境界を示す。path一覧は実装時manifestの代替ではない。

## 1. Target layout

```text
project-bootstrap-kit/
├── AGENTS.md                 public-transformed
├── CHANGELOG.md              public-transformed
├── GETTING_STARTED.md        direct
├── LICENSE                   generated
├── NOTICE.md                 generated
├── PUBLIC_SOURCE.json        generated
├── README.md                 direct
├── UPGRADE_GUIDE.md          direct
├── VERSION                   direct
├── boilerplate/              direct exact files
├── docs/
│   ├── ADR/                  direct / transformed
│   ├── REF/                  direct / transformed
│   ├── SPEC/                 direct
│   └── public governance     transformed
├── profiles/                 direct exact files
├── scripts/                  direct exact files
└── upgrades/                 direct exact files
```

`docs/WORK`、session、private history、private `.agents`は含めない。

## 2. Direct public baseline

直接公開候補はP1.1 classificationを正本にexact pathへ展開する。

- root product entrypoints
- `boilerplate/`
- `profiles/`
- `scripts/`
- `upgrades/`
- public-safe ADR / SPEC / REF

directory名は説明用であり、manifestでdirectory recursionを許可しない。

## 3. Public-transformed baseline

| Private source | Public target intent |
| --- | --- |
| `AGENTS.md` | public contributor / AI向け指示 |
| `CHANGELOG.md` | Distributionと公開可能governance履歴 |
| `docs/ADR/README.md` | public ADR index |
| `ADR_002` | public maintainer governanceへ一般化 |
| `ADR_003` | private事例名を一般化しProject Model判断を保持 |
| `ADR_004` | private repository名、owner、local pathを除きarchitectureを保持 |
| `docs/DEVELOPMENT_GUIDELINE.md` | public contribution workflowへ置換 |
| `docs/DOCUMENTATION.md` | public docs / contribution責務へ置換 |
| `docs/INDEX.md` | public treeに存在するlinkだけで再構成 |
| `docs/VERSIONING.md` | private / public version一致とpublic release契約 |
| `docs/WORK_LINE_ROUTING.md` | GitHub intakeからmaintainer routingへの契約 |
| change impact REF | public contributionとprivate implementationの影響判定 |

Transform ruleはnetwork、current time、local pathへ依存せずversion固定する。

## 4. Private-only baseline

- `.agents/**`
- `docs/WORK/**`
- `docs/agent_sessions/**`
- `docs/history/**`
- private export manifest
- private release ledger
- scan raw output
- secret finding
- local review plan

必要なpublic代替はPhase 4 / 5でREADME、CONTRIBUTING、SECURITY、Issue / PR template、public AGENTSとして作る。

## 5. Generated public assets

### `LICENSE`

- 標準MIT全文
- `project-bootstrap-kit contributors` notice

### `NOTICE.md`

- license概要
- generated project attribution
- 実在third-party attribution
- `PUBLIC_SOURCE.json`への案内

### `PUBLIC_SOURCE.json`

- kit version
- export contract version
- manifest digest
- exporter version
- public tree digestとscope ID
- private URL / SHA / local pathは含めない

## 6. Public-owned and platform state

publicOwned exact fileはmanifestへ明示する。Issue、PR、Discussion、Release、settings、Actions historyはGit tree外のplatform stateであり、exporterは変更しない。

Phase 5で追加する`.github`配下fileは、private sourceからexportするかpublicOwnedにするかをfile単位で決める。directory全体を暗黙にpublicOwnedにしない。

## 7. Link policy

- repository内はrelative linkを優先する
- public treeに存在しないtargetへのlinkを禁止する
- clone、Issue、security、Release等だけcanonical public URLを使用する
- private repository URL、local path、private adopter名を公開しない
- badgeはpublic canonical URLから生成する

## 8. Ownership transitions

- direct ↔ transformed
- transformed ↔ generated
- publicOwned → exporterOwned
- exporterOwned → publicOwned

上記transitionはmanifest変更、理由、migration、stale public target確認を必要とする。暗黙にownershipを切り替えない。

## 9. Generated project attribution

利用projectではroot licenseを変更せず、次へkit MIT全文を置く契約案をPhase 2へ渡す。

```text
.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt
```

`docs/BOOTSTRAP_ADOPTION.md`からkit versionとlicense pathを参照する。

## 10. Review checklist

- exact path manifestと一致する
- public link targetが存在する
- transformed fileにprivate固有名がない
- generated assetがdeterministicである
- private pathがtarget treeにない
- publicOwnedを上書きしない
- LICENSE / NOTICE / provenanceが整合する
