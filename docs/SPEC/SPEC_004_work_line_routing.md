# SPEC 004: Work-line Routing Contract

## 1. 目的

計画開発と運用中の後続作業が並行するプロジェクトで、Epic / MNT / OPS / ADVの判別、記録、線間遷移を再現可能にする。

## 2. 起動契約

- 利用者は対応skillを明示してMNT / OPS / ADVを指定できる
- 明示指定がなくても、AIは依頼内容と対象の状態から作業線を判別する
- 両経路は同じskillと記録規則へ収束する
- 指定と実態が矛盾する場合は、実質的な作業へ入る前に相違点を共有する

## 3. 判別契約

- Epicは現在フェーズの計画開発、新しい能力、重要な設計変更を扱う
- MNTはリリース済み・運用中のbaselineへの修正・調整を扱う
- OPSはアラート、ログ、停止、閾値超過、不審事象などの運用上の確認・調査・判断を扱い、障害や修正を前提にしない
- ADVは本プロジェクトの経験を、他プロジェクト、別の取り組み、プロジェクト化前の企画へ活用する助言を扱う
- 規模やセッション数ではなく、作業の起点と対象を主な判別軸とする

## 4. 配布契約

新規bootstrapには次を標準で含める。

- `docs/WORK_LINE_ROUTING.md`
- `docs/WORK/maintenance/`, `operations/`, `advisory/`
- `maintenance-work`, `operations-work`, `experience-advisory` skills
- `AGENTS.md` とguidelineから正本への導線

skillはAI surfaceに応じて `.agents/skills/` または `.claude/skills/` へ配置する。

## 5. Upgrade契約

- 既存プロジェクトには単一の `work-line-routing` featureで導入する
- 専用文書・skillが存在しない場合だけ追加する
- 同名の独自文書・skillがある場合は上書きせず `WARN(KEEP)` とする
- 既存guidelineには専用正本への短い導線だけを冪等に追加する
- 既存案件の分類、外部操作、git操作は自動実行しない

## 6. 記録と正本

- 索引のstatusと主要リンクは更新可能とする
- 件別記録の経過は日付付きで追記する
- 作業線記録を仕様・設計・Runbookの正本にしない
- 恒久的な変更や知識は `SPEC / ADR / REF / TECHNOLOGY / VERSIONING` へ反映する
