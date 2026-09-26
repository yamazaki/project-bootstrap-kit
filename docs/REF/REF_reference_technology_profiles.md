# Technology Profiles Usage and Lifecycle

## 1. 目的

複数のruntime、integration、storage、framework、toolingに関する制約と経験知を、必要なプロジェクトへ組み合わせて適用する。

単一 `PLATFORM_GUIDELINE.md` は使用せず、選択済みprofile、プロジェクト固有の採否、実証reference、公式一次情報を分離する。

## 2. profileの構造

```text
profiles/<profile-id>/
├── profile.json
├── GUIDELINE.md
├── REFERENCE.md              # 任意
├── skills/                   # 任意
└── history/<version>/        # profile更新時の旧snapshot
```

- `profile.json`: profile metadata、version、category、配布物、公式一次情報
- `GUIDELINE.md`: 長期的に有効な実装原則と制約
- `REFERENCE.md`: 実証知識、失敗例、分岐条件
- `skills/`: 設計、実装、レビュー、公式仕様確認の実行手順
- `history/`: 既存プロジェクトへ安全に更新するための旧version

## 3. 適用先の構造

```text
docs/TECHNOLOGY/
├── INDEX.md
├── ADOPTION.md
└── <profile-id>/
    ├── profile.json
    ├── GUIDELINE.md
    └── REFERENCE.md
```

- `INDEX.md`: 選択済みprofile、version、category、参照先
- `ADOPTION.md`: プロジェクト固有の採用、不採用、例外、後続検討、一次検証

## 4. 選定タイミング

profileは `init-project.mjs` 実行時に未指定でもよい。

推奨タイミング:

1. WORK/0.1で要求と技術候補を整理する
2. runtime、integration、storage等の採用技術を利用者が判断する
3. 対応profileの有無を確認する
4. 実装着手判定までにprofileを追加する
5. 未収録技術は公式一次情報で制約を確認し、profile候補として記録する

## 5. 初期化時の指定

```bash
node scripts/init-project.mjs \
  --target /path/to/repo \
  --project-name "Example Project" \
  --project-slug example-project \
  --product-name "Example" \
  --ai-surface both \
  --technology-profile cloudflare-workers \
  --technology-profile slack
```

## 6. 初期化後の追加

dry-run:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --technology-profile cloudflare-workers \
  --ai-surface both \
  --diff
```

apply:

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --technology-profile cloudflare-workers \
  --ai-surface both \
  --apply
```

legacy `docs/PLATFORM_GUIDELINE.md` がある場合は、対応するprofileを指定する。同一内容なら削除し、独自編集されていればprofile配下の `LEGACY_PLATFORM_GUIDELINE.md` へ移動して保全する。安全に対応付けできない場合はapplyを停止する。

## 7. 参照優先順位

- limits、pricing、API、設定仕様、利用可否: 利用時点の公式一次情報
- プロジェクト固有の採否と許容リスク: `ADOPTION.md`, `SPEC`, `ADR`
- 安定した共通原則: profileの `GUIDELINE.md`
- 実証知識と判断材料: profileの `REFERENCE.md`

単一の一律優先順位で上書きせず、事実、プロジェクト判断、共通原則、経験知の責務を分ける。

## 8. プロジェクト内で育てるもの

profileの共通文書を直接変更せず、次を `ADOPTION.md` に継続記録する。

- 採用した原則と実装形
- 不採用理由と再検討条件
- 後続フェーズで検討する事項
- 公式文書または実機で確認した事実と確認日
- profileと異なるプロジェクト固有判断
- production運用、障害、性能、コストで得た結果

技術選定ADRを確定した場合は、恒常的な実装規約を `CODING_GUIDELINE.md`、プロセス規律を `DEVELOPMENT_GUIDELINE.md` へ昇格する。

## 9. kitへのfeedback

WBSマイルストーンまたはフェーズのクローズ時に `knowledge-feedback` skillを使用する。

`knowledge-feedback` はTechnology Profile専用ではなく、文書運用、WORK/0.1、WBS、セッション、Runbook、versioning、skill、scriptなどkit全体の改善を対象とする。

```text
docs/WORK/<phase>.<milestone>/kit_feedback_internal_yyyymmdd_<slug>.md
docs/WORK/<phase>.<milestone>/kit_feedback_export_yyyymmdd_<neutral-slug>.md
```

internal版は元プロジェクト内に留める。export版では元文書パスと固有名詞をEvidence IDと匿名化した根拠概要へ置き換え、利用プロジェクト側の機械検査とユーザー確認を通す。利用プロジェクトからkitへ自動書き込み、commit、pushは行わない。

kit側では、受領したexport版へ次を再実行する。

```bash
node scripts/verify-feedback-export.mjs /path/to/kit_feedback_export_yyyymmdd_<neutral-slug>.md
```

再検査を通過したexport版だけを private maintainer records へ持ち込む。

## 10. profile更新

- feedback採用時はprofile versionを更新する
- 直前versionの配布文書を `history/<version>/` へ残す
- 既存プロジェクト文書が旧snapshotと一致する場合だけ自動更新する
- 独自編集された文書は `SKIP(KEEP)` として保全する
- `CHANGELOG.md` と必要な `UPGRADE_GUIDE.md` を更新する

## 11. Cloudflare Workers profile

- 共通原則: `profiles/cloudflare-workers/GUIDELINE.md`
- 実証知識: `profiles/cloudflare-workers/REFERENCE.md`
- 実行補助: `cloudflare-workers-guidance` skill
- 公式一次情報: `profile.json#officialSources`

Cloudflareのlimits、pricing、Wrangler、runtime仕様は変動するため、REFERENCE内の数値をそのまま採用しない。
