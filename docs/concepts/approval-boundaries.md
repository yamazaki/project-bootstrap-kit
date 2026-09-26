# Approval Boundaries

## 1. 操作を分けて承認する

次の操作は同じ承認として扱わない。

1. fileを変更する
2. Gitへstageする
3. commitする
4. pushする
5. Pull RequestやReleaseを作成する
6. deploy、送信、共有、投稿、削除等の外部操作を行う

たとえば「修正してよい」は、通常pushやproduction deployの承認を含まない。

## 2. Previewに必要な情報

重要な操作の前に、次を確認できるようにする。

- exact target
- 変更内容
- 影響範囲
- costや外部利用の有無
- verification
- rollback
- 操作後のread-back方法

## 3. External action

外部systemを変更する操作は、可能な限り直前のexact previewに対して承認を得る。結果が不明な場合は自動retryせず、外部状態をread-backしてから次を決める。

## 4. 段階的承認と集約

初期運用では操作を分けて確認する。同じworkflowが安定し、exact preview、conflict検査、rollback、idempotency、read-backが成立した場合は、利用者が明示的に選べる範囲で承認を集約できる。利便性のために承認境界を暗黙に拡大しない。
