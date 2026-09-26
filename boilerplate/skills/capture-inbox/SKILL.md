---
name: capture-inbox
description: Use when the user wants to quickly capture an idea, issue, missed consideration, change candidate, bug, or question during project work without immediately changing specs, WBS, or implementation.
---

# capture-inbox

## 目的

作業中の気づきを失わず、かつ現在の作業や仕様を不用意に変更しない形で一時捕捉する。

正本は `AGENTS.md`、`docs/DEVELOPMENT_GUIDELINE.md`、`docs/DOCUMENTATION.md`。本 skill は補助である。

## 起動条件

ユーザーが次のように指示した場合に使う。

- `/capture-inbox`
- `/memo`
- 「気づいたことをメモしたい」
- 「あとで検討する課題として残したい」
- 「今すぐ反映しないが、忘れないようにしたい」

## 分類

`type` は次の 3 種に限定する。

- `idea`
  - 思いつき、改善案、将来やりたいこと
- `issue`
  - 課題、仕様変更候補、バグ、考慮漏れ、リスク
- `question`
  - 疑問、確認事項、判断待ち

迷う場合は、実装や仕様に影響しうるものを `issue`、判断材料が不足しているものを `question`、将来の改善候補を `idea` とする。

## 保存先

新規 capture は必ず `open` に作成する。

```text
docs/WORK/inbox/open/capture_yyyymmdd_hhmm_<slug>.md
```

状態変更時は、配置フォルダと frontmatter の `status` を同時に更新する。

## テンプレート

```md
---
type: idea | issue | question
status: open
created_at: YYYY-MM-DD HH:mm
source: session | implementation | review | test | user-feedback
related_wbs:
related_docs:
priority: low | medium | high
---

# <短いタイトル>

## 気づき

## 背景

## 影響しそうな範囲

## 次に判断すること

## 棚卸し結果

- decision:
- moved_to:
- resolved_at:
```

## 標準手順

1. ユーザーの内容を短く要約する
2. `type` を `idea / issue / question` から選ぶ
3. 関連 WBS、関連文書、優先度を分かる範囲で埋める
4. `docs/WORK/inbox/open/` に 1 件 1 ファイルで保存する
5. 現在作業を止めるべき重大リスクがあれば、保存後にユーザーへ報告する

## 禁止事項

- capture しただけで `SPEC / ADR / REF / PLAN / WBS / 実装` を変更しない
- `type` を増やさない
- 状態をファイル名に含めない
- `open` 以外の状態へ移す場合、frontmatter の `status` 更新を忘れない

## 棚卸し

棚卸しは、WBS マイルストーン切り替え時、WBS の大きな組み替え時、フェーズ終了と次フェーズ計画策定時に行う。WBS マイルストーン切り替え時とは、例えば `1.1` の完了後に `1.2` を開始する前のような区切りを指し、必要に応じて実施する。

棚卸しは、必ず仕様や実装へ反映することではない。各 capture の扱いを判断し、状態を更新することである。
