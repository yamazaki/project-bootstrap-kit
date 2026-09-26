# cleanup-migration-backup/notes

この feature は、`skills-surface-migration` 後に残る `.migration-backup/skills/` を削除する。

前提:
- `.agents/skills/` または `.claude/skills/` の内容確認が終わっていること
- 既存 skill の移行が正しく完了していること

注意:
- バックアップ削除後は、自動では元に戻せない
