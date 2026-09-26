# ADR 001: Composable Technology Profiles

- Status: Accepted
- Date: 2026-09-13
- Scope: project-bootstrap-kit

## 1. Context

単一 `docs/PLATFORM_GUIDELINE.md` は、一つのruntimeまたはplatformだけを選ぶ前提になっていた。しかし実際のプロジェクトでは、Cloudflare Workers上のSlack連携のように、runtime、integration、storage、framework、toolingを組み合わせる。

また、`init-project.mjs` 実行時には採用技術が未確定で、WORK/0.1の要求・技術検討後に確定することがある。プロジェクト進行中に得た採否、例外、実証知識を継続記録し、他プロジェクトへ還元する動線も必要である。

## 2. Decision

- 単一 `PLATFORM_GUIDELINE.md` を廃止し、複数選択可能なTechnology Profile方式を採用する
- profileは `profile.json`、`GUIDELINE.md`、任意の `REFERENCE.md` と `skills/` で構成する
- 適用先では `docs/TECHNOLOGY/INDEX.md` と `ADOPTION.md` を正本とする
- `--technology-profile` は任意かつ複数回指定可能とする
- WORK/0.1中または完了後に `technology-profiles` featureでprofileを追加できる
- 実証referenceと変動する公式仕様を分離し、変動事実は利用時点の一次情報を優先する
- プロジェクト固有の差異はprofile文書ではなく `ADOPTION.md` に記録する
- マイルストーン・フェーズのクローズ時にknowledge feedbackを抽出し、kit側で再検証して取り込む

## 3. Alternatives

### 3.1 単一ファイルへ複数platformを結合する

不採用。出典、profile version、関係するタスク、更新責務が混在し、無関係な知識までAIコンテキストへ入る。

### 3.2 skillだけへ知識を置く

不採用。プロジェクト固有の採否と拘束力ある判断を、人間が参照する正本文書として残しにくい。

### 3.3 外部文書だけを参照する

不採用。公式仕様は現在事実の正本になるが、過去プロジェクトの成功・失敗・分岐条件を保持できない。

## 4. Consequences

- profileを必要なタスクだけで読み込めるため、AIコンテキストを抑制できる
- 複数技術を合成でき、初期化後の追加にも対応できる
- guideline、reference、adoption、skill、公式一次情報の責務管理が必要になる
- profile更新時はversionと旧snapshotを管理する必要がある
- legacy `PLATFORM_GUIDELINE.md` の移行処理が必要になる

## 5. Compatibility

- 新規CLIは `--technology-profile` に統一し、旧 `--platform-profile` の互換aliasは設けない
- legacy guidelineがprofileと同一なら削除する
- 独自編集されている場合は `LEGACY_PLATFORM_GUIDELINE.md` へ移動して保全する
