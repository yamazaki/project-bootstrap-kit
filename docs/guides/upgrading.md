# Upgrade an Adopted Project

## 1. Scan

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted-project \
  --scan \
  --plan-output /tmp/adopted-project-upgrade/plan.json
```

scanはtargetを変更せず、accepted upstream `U0`、current upstream `U1`、accepted local `L0`、current local `L1`から状態を判定する。

## 2. 状態

- `CURRENT`: upstream / localとも変化なし
- `UPSTREAM_CHANGED`: upstreamだけ変化
- `LOCAL_CHANGED`: localだけ変化
- `DIVERGED`: 両方変化
- `NEW_UPSTREAM_PATH`: 新しいkit path

ownershipと状態に応じ、safe-update、manual merge、accepted deviation、deferred、add、skipを選ぶ。自動上書きではなくplanへ判断を記録する。

## 3. Schema 1から2

schema 1 stateではmetadata-only migration planを生成する。人向けProject Nameを確認し、明示して再scanする。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/adopted-project \
  --scan \
  --project-name "Confirmed Project Name" \
  --plan-output /tmp/state-schema-migration/plan.json
```

migrationは通常contentを書き換えず、stateとadoption metadataへname、slug、product、development Model identityを追加する。

## 4. Apply

```bash
node scripts/upgrade-project.mjs \
  --apply-plan /tmp/adopted-project-upgrade/plan.json
```

apply前にtargetのrollback可能なcommitまたはbranchを確保する。plan後のtarget、baseline、kit HEAD、manifest変更はstaleとして停止する。

## 5. Model境界

upgrade snapshotはstateに記録されたModelのasset setから生成する。development専用featureをtask-workspaceへ適用しない。Model変更は通常upgradeではなく、別のreview可能なmigrationを必要とする。

version別の注意事項は[Upgrade Guide](../../UPGRADE_GUIDE.md)、state詳細は[Bootstrap State Reference](../REF/REF_reference_bootstrap_state.md)を参照する。
