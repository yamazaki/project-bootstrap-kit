# Bootstrap State Reference

## 正本

- Human-readable history: `docs/BOOTSTRAP_ADOPTION.md`
- Machine-readable state: `docs/BOOTSTRAP_STATE.json`
- Upstream baseline: `.project-bootstrap/baselines/sha256/`
- Generated kit license: `.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`

state manifest自身はpath stateへ含めず、`integrity`を除いたsorted JSON payloadのSHA-256で改変を検出する。

`project.snapshotAppliedAt`はexpected snapshotの再現値であり、初回導入日時の正本ではない。人間向けの初回導入・migration・upgrade履歴は`docs/BOOTSTRAP_ADOPTION.md`とstate `history`を参照する。

## Adoption plan schema 2

ADDとCONFLICTは既定で未解決となる。利用者が編集できるのはresolution、reason、ownership、mapping、confirm flagであり、path、status、hash、snapshot evidenceはtargetとbundleから再計算する。

v0.7.0 plan schema 1は再利用せず、最新kitで再生成する。

## Mature adoption commands

```bash
node scripts/init-project.mjs \
  --target /path/to/existing \
  --project-name "Example Project" \
  --project-slug example-project \
  --product-name "Example Product" \
  --ai-surface codex \
  --adopt-existing \
  --plan-output /tmp/example-adoption/plan.json
```

```bash
node scripts/init-project.mjs \
  --accept-adoption-manual-merge /tmp/example-adoption/plan.json \
  --path AGENTS.md \
  --reason "project固有規則と最新kit規則を統合"
```

```bash
node scripts/verify-project-init.mjs \
  --target /path/to/existing \
  --adoption-plan /tmp/example-adoption/plan.json
```

## State upgrade commands

stateがない旧adopterでも同じscan commandを使用する。upgrade scriptはadoption記録からmetadataを復元し、state migration planを生成する。不足または変更がある場合は`--project-name`、`--product-name`、`--ai-surface`、`--technology-profile`を明示する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted \
  --scan \
  --plan-output /tmp/example-upgrade/plan.json
```

旧adopter migration planのsafe-onlyとmanual mergeもupgrade scriptから実行できる。

```bash
node scripts/upgrade-project.mjs --apply-plan /tmp/migration/plan.json --apply-safe-only
node scripts/upgrade-project.mjs --accept-adoption-manual-merge /tmp/migration/plan.json --path AGENTS.md --reason "既存規則へ最新kit規則を統合"
```

v0.8.2でstate migration済みかつhuman recordへ`2000-01-01 00:00:00Z`が表示されるprojectは、通常の`--scan`で`CORRECTION`を確認する。applyはstate `history`の実migration時刻を使用し、Technology Profile baselineも同時に更新する。stateの手動編集は行わない。

## State schema 1から2

schema 1 stateを検出すると、通常のfile upgradeではなくmetadata-only migration planを生成する。人向けProject Nameは旧Product Nameを候補表示するだけで自動確定しない。owner確認後、明示名を指定してplanを再生成する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted \
  --scan \
  --project-name "Confirmed Project Name"

node scripts/upgrade-project.mjs \
  --apply-plan /path/to/state-schema-migration-plan.json
```

applyはstate schema、Project Model identity、adoption metadataを更新し、通常contentを変更しない。scan後のstate/adoption変更、plan改変、kit HEAD差異はstaleとして拒否する。同じplanの再applyは一致時だけ`SKIP(SAME)`となる。

```bash
node scripts/upgrade-project.mjs \
  --accept-path-decision /tmp/example-upgrade/plan.json \
  --path docs/DEVELOPMENT_GUIDELINE.md \
  --decision manual-merged \
  --reason "project規則を維持し最新upstreamを統合"
```

decisionは`manual-merged / accepted-deviation / deferred / safe-update / add / skip`を使用する。safe-updateとaddは`--confirm`を必須とする。

## Ownership transition

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted \
  --update-path-state \
  --path docs/PLAN_PHASE_CURRENT.md \
  --ownership project-owned \
  --reason "Phase計画をproject正本として作成"
```

mapped reference変更には`--satisfied-by`または`--superseded-by`を指定する。

feature stateもmanifest直接編集ではなく明示操作で更新する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted \
  --update-feature-state \
  --feature work-line-routing \
  --feature-state accepted-deviation \
  --reason "既存routingを正本として維持" \
  --evidence docs/WORK_LINE_ROUTING.md
```

## Limits

- baseline object: 4 MiB以下
- 1 operation baseline total: 64 MiB以下
- size超過、hash不一致、欠落、path traversalはfail-closed
- orphan baselineは自動削除しない
- reasonへSecret、token、credential、個人情報を記載しない
