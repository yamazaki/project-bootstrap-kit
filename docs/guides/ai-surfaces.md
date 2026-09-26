# Choose an AI Surface

Project ModelとAI surfaceは別の軸である。同じModelの文書契約を維持し、skillの配置先と`CLAUDE.md`の有無を切り替える。

| `--ai-surface` | Skill target | `CLAUDE.md` |
| --- | --- | --- |
| `codex` | `.agents/skills/` | なし |
| `rovo` | `.agents/skills/` | なし |
| `claude` | `.claude/skills/` | あり |
| `both` | `.agents/skills/`と`.claude/skills/` | あり |

`CLAUDE.md`は`AGENTS.md`を読み込む入口であり、行動規範を重複定義しない。Rovoはkit内ではCodexと共通の`.agents/skills/`配置を使う。

複数surfaceを使う場合は`both`を選ぶ。後からsurfaceを変更する場合は、既存skillの独自編集と不要pathを確認し、暗黙削除しない。
