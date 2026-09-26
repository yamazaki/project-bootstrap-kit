# Start a New Development Project

## 1. 前提

- cleanな`project-bootstrap-kit` checkout
- `.git`以外が空のGit repository
- 人向けProject Nameとlowercase kebab-caseのProject Slug
- 使用するAI surface

## 2. 初期化

```bash
node scripts/init-project.mjs \
  --target /path/to/example-project \
  --project-model development \
  --project-name "Example Project" \
  --project-slug example-project \
  --product-name "Example Product" \
  --ai-surface codex
```

`--project-model development`は省略できる。Product NameもProject Nameと同じなら省略できる。採用技術が確定している場合だけ`--technology-profile`を追加する。

## 3. 生成後に確認するもの

- `AGENTS.md`
- `docs/WORK/0.1/`
- `docs/ROADMAP.md`
- `docs/PLAN_PHASE_CURRENT.md`
- `docs/TECHNOLOGY/`
- `docs/BOOTSTRAP_ADOPTION.md`
- `docs/BOOTSTRAP_STATE.json`
- `.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`

## 4. 最初の作業

1. ideaと対象利用者を整理する
2. product definitionと非機能要件を整理する
3. Technology Profileの採否を決める
4. ROADMAPを作る
5. current PhaseのWBSと着手条件を具体化する
6. 利用者review後に実装へ進む

## 5. 停止条件とrollback

- targetが空でない場合は通常initを続行しない。既存adoptionへ切り替える
- unknown Model、invalid slug、非対応profile、dirty kit checkoutでは停止する
- 初期化した空repoをまだcommitしていない場合は、生成fileを確認してrepoごと作り直せる
- commit後は履歴を破壊せずrevertする
