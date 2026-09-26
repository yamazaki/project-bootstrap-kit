# SPEC 001: Bootstrap Contract

## 1. 目的

`project-bootstrap-kit` が、新規プロジェクトに対して何を展開し、どのような契約で初期化を行うかを定義する。

## 2. 配布対象

`node scripts/init-project.mjs` は、原則として `boilerplate/` 配下の内容を適用先リポジトリへ展開する。

## 3. AI エージェント指示ファイルの取り扱い

- `boilerplate/_AGENTS.md` は、適用先では `AGENTS.md` として配置される
- kit 自体の `AGENTS.md` と、配布対象の `AGENTS.md` は別物として扱う
- `boilerplate/_CLAUDE.md` は、`--ai-surface claude|both` の場合だけ適用先で `CLAUDE.md` として配置される
- `CLAUDE.md` は `AGENTS.md` を読み込む Claude Code 用の入口であり、行動規範の正本にはしない
- `--ai-surface codex|rovo` の場合は、配布用 `_CLAUDE.md` を適用先に残さない
- 初期化処理は、ユーザー環境の `~/.claude/CLAUDE.md` と `~/.claude/rules/*.md` を操作しない

## 4. Technology Profile

- `--technology-profile` は任意かつ複数回指定できる
- 未指定時も `docs/TECHNOLOGY/INDEX.md` と `ADOPTION.md` を配置する
- 指定時は `profiles/<id>/` の文書とprofile固有skillを追加する
- `--platform-profile` は受け付けず、`--technology-profile` に統一する
- 初期化後も `technology-profiles` upgrade featureでprofileを追加できる

## 5. 生成記録

初期化実行後、適用先には `docs/BOOTSTRAP_ADOPTION.md` を生成し、適用日時、bootstrap kit名、version、Technology Profiles、AI surface、条件付き生成ファイルを記録する。

### 5.1 作業線ルーティング

新規bootstrapには、計画開発と運用中の後続作業を Epic / MNT / OPS / ADVへ振り分ける文書、記録場所、MNT・OPS・ADVのskillを標準で配置する。明示skill起動とAIによる自動判定は同じ手順へ収束させる。

## 6. 初期化後の検証

- 初期化後は、期待されるファイル構成とプレースホルダ残存状況を検証できること
- `--ai-surface claude|both` の場合は、`CLAUDE.md` の存在と `@AGENTS.md` の import を検証すること
- 検証は再実行可能な独立スクリプトで提供すること
- 検証結果は、利用者が次に行うべき作業を示すこと

## 7. 上書き方針

- 既存ファイルの上書きは、初期化スクリプトの挙動として明示されるべきである
- 通常initは空Gitリポジトリだけを対象とする
- 非空targetへの`--force-overwrite`は拒否する
- 既存の非空リポジトリへ適用する場合は`--adopt-existing`でplanを生成し、`SPEC_005_existing_project_adoption.md`に従う
- 同名fileは`CONFLICT`として保持し、path単位の明示判断なしに上書きしない
