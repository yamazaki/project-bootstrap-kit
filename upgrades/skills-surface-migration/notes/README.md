# skills-surface-migration/notes

この feature は、既存プロジェクトに `skills/` が残っている場合に、

- `.agents/skills/`
- `.claude/skills/`

へ移行し、旧 `skills/` はバックアップ退避する。

初版では安全性のため、旧 `skills/` は `.migration-backup/skills/` へ退避する。
