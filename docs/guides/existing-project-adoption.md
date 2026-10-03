# Adopt an Existing Repository

## 1. 原則

既存fileを持つrepositoryへ直接上書きしない。最初にread-only planを作り、pathごとの判断後に適用する。

## 2. Plan作成

```bash
node scripts/init-project.mjs \
  --target /path/to/existing-project \
  --project-model development \
  --project-name "Existing Project" \
  --project-slug existing-project \
  --ai-surface codex \
  --adopt-existing \
  --plan-output /tmp/existing-project-adoption/plan.json
```

この操作はtarget fileを変更しない。planとbundleの保存先、kit commit、target fingerprintを確認する。

## 3. 状態の読み方

- `ADD`: kit側にありtargetにない
- `SKIP(SAME)`: 内容が一致する
- `CONFLICT`: 同じpathに異なる内容がある
- `EXTRA`: target固有でkit管理対象ではない

ADDも自動承認しない。必要性、代替path、ownershipを確認する。

## 4. Path判断

- add: `confirmAdd: true`
- skip: 理由と、必要なら`satisfiedBy`または`supersededBy`
- keep: project側を保持する理由
- replace: `confirmReplace: true`
- manual merge: fileを統合後、専用CLIでcurrent hashを受け入れる

判断表JSONを保存し、公式CLIから一括記入できる。未適用repoとlegacy migrationのどちらも `operation: adopt-existing` が対象となる。

```json
{
  "schemaVersion": 1,
  "decisions": [
    {"path": "docs/ROADMAP.md", "resolution": "keep", "reason": "projectの計画を正本として維持"},
    {"path": ".agents/skills/project-bootstrap-kit-upgrade/SKILL.md", "resolution": "add", "confirmAdd": true, "reason": "kit更新手順を追加"}
  ]
}
```

pathは実planにある値を使う。ADDはadd/skip、CONFLICTはkeep/replace。全行に1行reasonが必要で、addは `confirmAdd: true`、replaceは `confirmReplace: true` が必要。skipには `satisfiedBy` または `supersededBy` を付けられる。判断表に未記載のpathは既存判断を維持し、全件の暗黙承認はしない。

```bash
node scripts/upgrade-project.mjs --set-adoption-decisions /tmp/existing-project-adoption/plan.json --decisions /tmp/decisions.json
node scripts/upgrade-project.mjs --set-adoption-decisions /tmp/existing-project-adoption/plan.json --decisions /tmp/decisions.json --apply
```

既定はpreview、`--apply`はplanだけを更新し、targetを変更しない。不明path、重複、状態に合わない判断、確認不足、理由不足、不正mapping、改変evidence、staleは全体拒否する。unresolved一覧で、残るpathが手動統合予定のものか確認する。hash、ownership、`manual-merged`は判断表から設定できない。

手動統合はAIが差分と統合案を提示し、利用者の判断・承認済み方針に沿って編集してよい。**1ファイル編集→受入→次のファイル編集**の順に行う。複数managed pathを先に編集すると、最初の受入で指定外pathの変更を検出し停止する。受入済みpathの再編集も検査対象となる。directory競合はこの受入CLIで解決せず、内容を保全して競合を解消しplanを再生成する。

```bash
node scripts/init-project.mjs \
  --accept-adoption-manual-merge /tmp/existing-project-adoption/plan.json \
  --path AGENTS.md \
  --reason "project固有規則とkit規則を統合"
```

## 5. Apply

安全なADDだけを先行適用する場合:

```bash
node scripts/init-project.mjs \
  --apply-adoption-plan /tmp/existing-project-adoption/plan.json \
  --apply-safe-only
```

全判断後に正式適用する場合:

```bash
node scripts/init-project.mjs \
  --apply-adoption-plan /tmp/existing-project-adoption/plan.json
```

scan後にmanaged path、kit HEAD、plan evidenceが変わった場合はstaleとして停止する。再scanし、古いplanを無理に適用しない。

## 6. Rollback

complete apply前はplanを破棄できる。置換対象のbackupとGit diffを確認し、commit前は対象変更を戻す。commit後はrevertで履歴を維持する。

safe-onlyや手動統合で既に変更したtargetは、plan削除だけでは元に戻らない。使用中・保留中のplan/bundleは保持する。破棄する場合は判断記録とrollback資料を先に確保し、planに対応する `.bundle` だけを対象にする。`.bootstrap-upgrade-diff/adoption-backup/`、state、baselineを巻き込まない。

旧kit適用済みでstateがないprojectのscan入口、Git履歴による確認、並行作業との順序は[Upgrade guide](./upgrading.md)を参照する。

詳細なplan fieldは[Existing Project Adoption Contract](../SPEC/SPEC_005_existing_project_adoption.md)を参照する。
