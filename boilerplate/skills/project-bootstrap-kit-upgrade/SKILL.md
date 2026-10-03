---
name: project-bootstrap-kit-upgrade
description: Update projects already using project-bootstrap-kit, including legacy state migration, reviewed decisions, and sequential manual merges with the user and AI.
---

# project-bootstrap-kit-upgrade

## 対象と正本

project-bootstrap-kit適用済みのdevelopment projectを更新する。未適用repoの初回導入はkitのexisting-project-adoption guideを使う。task-workspaceへのdevelopment資産導入やModel変更は扱わない。

適用先の `AGENTS.md` と変更承認規則を優先する。コマンドは**更新元kit checkoutのroot**で実行し、kit自身をtargetにしない。詳細はそのcheckoutの `docs/guides/upgrading.md` と `docs/guides/existing-project-adoption.md` を必要な経路だけ読む。

「手動統合」は人が全作業を行う意味ではない。AIが差分と統合案を提示し、利用者の判断または承認済み方針に沿って編集する。機械的な上書きと区別し、統合結果を明示CLIで受け入れる。

## 前提とscan

kit version/commitとclean状態、適用先のGit差分・rollback点・適用記録を確認する。既存編集を戻さない。フェーズ終了や計画改訂などmanaged pathを編集する作業が並行するなら、kit更新を先に終えるか、その作業後にscanするかを決める。更新を必ず先にする規則にはしない。

```bash
node scripts/upgrade-project.mjs --target /path/to/project --scan --plan-output /tmp/project-bootstrap-update/plan.json
```

stateなしの旧adopterで改名している場合だけ、scanへ `--project-name "現在の名称" --project-slug current-project` を追加する。slugはlowercase kebab-case。stateありprojectのidentityをこの引数で改名しない。planとbundleはsnapshotやproject内容を含み得るため、保管先と共有範囲を確認する。

## 経路判別

生成planの `operation` を正本にする。

| operation | 判断・受入 | 適用 |
| --- | --- | --- |
| adopt-existing | legacy migration。判断表と `--accept-adoption-manual-merge` | `--apply-plan`、safe-only可 |
| state-upgrade | `--accept-path-decision` | `--apply-plan`、safe-only不可 |
| bootstrap-state-schema-migration | 名称を確認し `--project-name` 指定で再scan | `--apply-plan`、metadataのみ |

schema migration適用後は再scanし、次のoperationを読み直す。

## legacy migrationの判断

ADD/CONFLICTごとに必要性、差分、project固有責務、代替pathを確認する。Git履歴と確認済みkit適用commitは補助証拠にできるが、履歴欠落・squash・rename・未commit編集を考慮し、「変更commitなし」だけでreplaceを決めない。旧upstreamを推測で復元しない。

AIが判断表JSONをファイルとして用意し、利用者と判断を共有する。pathは実planの値へ合わせる。

```json
{
  "schemaVersion": 1,
  "decisions": [
    {"path": "docs/ROADMAP.md", "resolution": "keep", "reason": "projectの計画を正本として維持"},
    {"path": ".agents/skills/project-bootstrap-kit-upgrade/SKILL.md", "resolution": "add", "confirmAdd": true, "reason": "kit更新手順を追加"}
  ]
}
```

ADDはadd/skip、CONFLICTはkeep/replace。replaceには差分確認と `confirmReplace: true`、skipには理由と必要に応じて `satisfiedBy` または `supersededBy` を付ける。全ADDや全CONFLICTを暗黙に承認しない。

```bash
node scripts/upgrade-project.mjs --set-adoption-decisions /tmp/project-bootstrap-update/plan.json --decisions /tmp/decisions.json
node scripts/upgrade-project.mjs --set-adoption-decisions /tmp/project-bootstrap-update/plan.json --decisions /tmp/decisions.json --apply
```

最初はpreview、次はplanだけの保存でありtarget適用ではない。unresolved一覧を読み、残すものが手動統合予定pathか確認する。hashやmanual-mergedを判断表に書いて受入を代替しない。

必要なら承認済みADDだけを先行する。

```bash
node scripts/upgrade-project.mjs --apply-plan /tmp/project-bootstrap-update/plan.json --apply-safe-only
```

## 逐次統合とstate upgrade

**1ファイル編集→受入→次のファイル編集**の順にする。複数managed pathを先に編集すると、最初の受入で指定外pathの変更を検出し停止する。

legacy migrationの受入:

```bash
node scripts/upgrade-project.mjs --accept-adoption-manual-merge /tmp/project-bootstrap-update/plan.json --path AGENTS.md --reason "固有規則を保ちkit規則を統合"
```

state-upgradeの受入:

```bash
node scripts/upgrade-project.mjs --accept-path-decision /tmp/project-bootstrap-update/plan.json --path AGENTS.md --decision manual-merged --reason "固有規則を保ち新upstreamを統合"
```

state-upgradeではbundleのU0/U1/L1、ownershipとpath stateを確認し、manual-merged / accepted-deviation / deferred / safe-update / add / skipを選ぶ。safe-updateとaddには `--confirm` が必要。accepted-deviationには適切なownershipを確立する。schema間で語彙を混ぜず、状態に合わない判断を無理に通さない。

`--update-path-state` などでownershipやstateを更新した場合は、その後に再scanして新planを使う。state更新前のplanへ判断を追加するとstaleになるため、順序を混在させない。

stale、kit不一致、検証失敗では停止する。編集を保存して原因を確認し、新planで判断を再確認する。fingerprintやhashを書き換えて検査を回避しない。受入後の再編集も再確認が必要。

## 完了適用と記録

```bash
node scripts/upgrade-project.mjs --apply-plan /tmp/project-bootstrap-update/plan.json
node scripts/upgrade-project.mjs --target /path/to/project --scan --plan-output /tmp/project-bootstrap-update/check.json
```

適用記録・state・baseline、backup、project固有規則の保持と新規則の矛盾、現行参照を確認する。確認scanもplan/bundleを生成する。全件CURRENTを一律の完了条件にせず、deferred、feature pending-review、意図的な残差と利用者レビュー待ちを明示する。

使用中/保留中planとbundleは保持する。不要な確認用・stale planは、判断記録とrollback資料を確保した後、対応bundleとともに破棄できる。backup、state、baselineまで削除しない。判断理由・残差を適用先の活動記録へ残し、必要な場合だけknowledge feedbackを作る。

commitの要否・単位は適用先の承認規則に従う。更新依頼やskillの使用だけをcommit/push/外部共有の許可とみなさない。
