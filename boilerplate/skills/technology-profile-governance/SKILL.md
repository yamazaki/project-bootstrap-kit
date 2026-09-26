---
name: technology-profile-governance
description: Use when selecting, adding, reviewing, updating, or applying one or more technology profiles during initial planning or ongoing implementation.
---

# technology-profile-governance

## 目的

採用技術が未確定の状態から、複数Technology Profileの選定、後付け、採否記録、継続更新を一貫して扱う。

## 参照先

- `docs/WORK/0.1/product_definition.md`
- `docs/TECHNOLOGY/INDEX.md`
- `docs/TECHNOLOGY/ADOPTION.md`
- 関連する `SPEC / ADR / PLAN`

## 選定手順

1. 実行基盤、連携先、storage、framework、運用サービスの候補を列挙する
2. 各候補がruntime、integration、storage、toolingなどどの責務を持つか整理する
3. 選択済みprofileと利用可能なprofileを確認する
4. profile未収録の技術は、一般ガイドラインと公式一次情報で扱い、profile候補として記録する
5. 利用者の判断後にprofile追加のdry-runコマンドを提示する
6. apply後に `INDEX.md` と `ADOPTION.md` の内容を確認する
7. 変動する制約は、実装時点の公式一次情報を確認して `ADOPTION.md` に確認日、結果、設計影響、再確認条件を記録する
8. 未決事項、PoC、一次検証をWBSへ反映する

## profile追加コマンド

project-bootstrap-kitのcloneで次を実行する。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --technology-profile <profile-id> \
  --ai-surface <codex|rovo|claude|both> \
  --diff
```

確認後に `--apply` を付ける。

## 継続更新

- profileの共通ルールをプロジェクト事情に合わせて直接書き換えず、差異は `ADOPTION.md` に記録する
- platformの数値、料金、API、設定挙動は、利用時点の公式一次情報を確認する
- kitやprofileを更新した時点の最新値を、各プロジェクトの固定値として配布しない
- ADR確定時は、恒常的な実装規約とプロセス規律をガイドラインへ昇格する
- production運用や障害対応で得た知識は、出典、前提、反例、適用条件とともに記録する
- 他プロジェクトでも有効な内容は `knowledge-feedback` skillへ引き継ぐ

## 完了条件

- 選択済みprofileが `INDEX.md` にある
- profileの初期採否と未決事項が `ADOPTION.md` にある
- 必要な一次検証がWBSにある
- 関連するprofile guidelineを実装前に参照できる
- 既存profileと異なる知見がfeedback候補として捕捉されている
