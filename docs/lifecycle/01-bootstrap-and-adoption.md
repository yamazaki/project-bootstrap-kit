# 01 Bootstrap and Adoption

## 目的

用途に合うProject Modelを選び、既存資産を壊さずにprojectへ管理骨格を導入する。

## 開始前に決めること

- 主成果がdevelopmentかtask workspaceか
- 人向けProject Nameと機械識別用Project Slug
- developmentの場合のProduct Name
- AI surface
- developmentで採用済みTechnology Profileがあるか
- 新規の空repoか、既存fileを持つrepoか

## 新規project

空のGit repositoryへ`init-project.mjs`を実行する。生成後は`AGENTS.md`、利用者向け入口、adoption記録、bootstrap stateを確認する。

## 既存repository

直接上書きせず`--adopt-existing`でread-only planを作る。`ADD / SKIP(SAME) / CONFLICT / EXTRA`を確認し、pathごとにadd、keep、replace、manual merge、意図的不追加を判断する。

## 完了の目安

- 選択Modelと生成物が一致する
- placeholderや一時値が残っていない
- 既存fileの扱いがplanへ記録されている
- `docs/BOOTSTRAP_ADOPTION.md`と`docs/BOOTSTRAP_STATE.json`が成立する
- 次に読む正本が分かる

具体的な操作は[Getting Started](../../GETTING_STARTED.md)と[Existing Project Adoption](../guides/existing-project-adoption.md)を参照する。
