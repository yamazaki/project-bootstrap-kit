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

詳細なplan fieldは[Existing Project Adoption Contract](../SPEC/SPEC_005_existing_project_adoption.md)を参照する。
