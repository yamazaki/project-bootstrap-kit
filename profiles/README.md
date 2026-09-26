# Technology Profiles

runtime、integration、storage、framework、toolingなど、プロジェクトで採用する技術要素の再利用可能なノウハウを管理する。

## 構成

```text
profiles/<profile-id>/
├── profile.json
├── GUIDELINE.md
├── REFERENCE.md              # 任意
├── skills/                   # 任意
└── history/<version>/        # profile更新時の旧snapshot
```

## 責務

- `profile.json`: id、表示名、version、category、配布文書、skill、公式一次情報
- `GUIDELINE.md`: 長期的に有効な実装原則、制約、禁止事項、確認事項
- `REFERENCE.md`: 実証知識、失敗例、分岐条件。現在仕様の正本ではない
- `skills/`: profile適用、設計、実装、レビュー、公式仕様確認の手順
- `history/`: 既存プロジェクトへ安全に更新するための旧version snapshot

## 更新

- feedbackを採用する前に、汎用性、成立条件、反例、現行公式仕様を確認する
- profileを更新する場合はversionを上げ、直前versionの文書を `history/` に残す
- project固有差分はprofileへ直接混ぜず、適用先の `docs/TECHNOLOGY/ADOPTION.md` に残す
- 実secret、実URL、個人情報、顧客名、テナント固有値を含めない
