# Cloudflare Workers 実装経験リファレンス

- Imported At: 2026-09-13
- Source Type: Cross-project empirical knowledge
- Authority: Reference, not source of truth
- Volatile Facts: limits, pricing, API, Wrangler behavior, product availability
- Verification Rule: Volatile facts must be checked against current Cloudflare official documentation before adoption

本書は過去プロジェクトの実証知識、失敗例、判断分岐を保持する。プロジェクト固有の採否は `docs/TECHNOLOGY/ADOPTION.md`、拘束力のある共通原則は同ディレクトリの `GUIDELINE.md`、変動するplatform仕様はCloudflare公式文書を正本とする。

---

外部リクエストを受け、検証・変換して後続へ連携するサービスを Cloudflare Workers で実装する際の設計・実装・運用ガイドライン。2 つの production 運用プロジェクトの実証結果を統合し、両者で結論が分かれた論点は「分岐条件つきの判断枠組み」として記述する。

## 出典タグ

| タグ | 意味 |
|---|---|
| **[実証A]** | プロジェクト A（credential-bearing な MCP サーバ。OAuth token・暗号化鍵を扱う。production 運用中）で実装・実機検証済み |
| **[実証B]** | プロジェクト B（Webhook 受信 → フィルタ → 転送の中継。利用者向け配送記録 GUI を持つ。無償枠運用）で実装・実機検証済み |
| **[分岐]** | 両プロジェクトで結論が分かれた論点。前提条件によって正解が変わる。分岐条件を併記 |
| **[一般]** | どちらにも実績はないが一般に推奨される補完事項。採用前に一次ドキュメントで検証すること |

---

## 0. 本書の使い方 — 採否は「前提 3 点」との突き合わせで決まる

本書の項目を新プロジェクトに適用する前に、まず自プロジェクトの以下 3 点を確定させること。同じノウハウでも前提が違えば逆の結論になる（プロジェクト B が A 由来の「早期 413」「wide event ログ」を意図的に不採用にした実例がある）。

1. **per-request 記録の正本はどこか** — アプリログか、DB のテーブルか、platform ログか。正本が決まると、ログの責務は「正本との差分（エラー・異常）」に絞れる。
2. **コストの逼迫資源はどれか** — 例: D1は読み取りと書き込みでquotaや課金特性が異なり得る。利用時点の公式条件を確認し、逼迫していない資源の節約を目的とした最適化は避ける。
3. **可視化・記録は要件か努力目標か** — 利用者・運用者が「受信の問題・内部エラー・リトライ発生」を把握できることがマスト要件なら、記録を犠牲にする最適化（早期拒否・ログ削減）は不採用になる。

また、各原則は **本質** と **適用形** を分けて読むこと。例:「安価な検証から並べる」の本質は資源保護（巨大 body をメモリに載せない）であり、応答の順序そのものはプロジェクトの記録要件が決める（§1.1）。

**構造的対策は本番適用前が最安** [実証B]: redaction・スキーマの構造的対策（自由文カラムの廃止・列挙型への転換など）は、実データと利用者が付く前なら migration 1 本で理想形を選べる。本番後は互換とデータ移行のコストが乗り、サニタイズ等の弱い形で妥協しがちになる。「本番適用前」という時間資産があるうちに §2.3 / §3 の構造的対策を入れること。

**「論証済みの省略」の作法** [実証B]: 本書の項目（や外部レビューの指摘）が一般論として正当でも、プロジェクト実態との突き合わせで無効なら省略してよい — 過剰対応の回避も規律のうち。ただし 2 条件を守る: ①省略理由をその場（規約・作業記録）に記録し、「確認漏れ」と区別できるようにする。②論証が「現在時点の状態」（未デプロイ・未構築・経路が存在しない等）に依存する場合、その状態は将来静かに偽になり得るため、**状態が変わる時点（migration 適用時・環境構築時など）に検証を移設する**。時点依存の論証は、適用手順への 1 行のチェックで時点非依存の保証に変えられる。

---

## 1. リクエスト処理パイプライン

### 1.1 入口検証の並べ方 [分岐]

原則形（安価な検証から早期 return）[実証A]:

env 検証 → body size cap → rate limit → ルーティング/メソッド → 認証 → payload 構造検証

ただし拒否判定の**位置**は記録要件で変わる:

- **記録要件がない / 正本がログのみ** → 原則形どおり最初期に拒否してよい。
- **per-request 記録の正本（DB）があり、有効な宛先へのリクエストは拒否も記録すべき** → 拒否判定は「記録に必要な解決ステップ（宛先ルックアップ）の後」に置く [実証B]。早期拒否の残存効果が「逼迫していない資源の節約」だけなら、記録可能性を優先する。

分けて判断する 2 つの問い: ①巨大ボディをメモリに載せない仕組みがあるか（§1.2 で必須）、②この拒否は記録すべきか（前提 3 点で判断）。

### 1.2 body size 制御 [実証B で改良]

本質は「上限を超えるデータをメモリに載せない」こと。実現形は 2 段:

1. `Content-Length` 宣言があれば先に確認し、超過は body を読む前に拒否。
2. **宣言の有無にかかわらず、有界ストリーム読み（読みながら上限で打ち切る）を必ず入れる**。

Content-Length 未宣言（chunked）を一律拒否する案 [実証A の原則] は、正当な呼び出し元を壊し得る。有界ストリーム読みがあれば拒否は不要で、互換性と資源保護を両立できる [実証B]。

### 1.3 即レスポンス + `ctx.waitUntil()` 後処理 [実証A/B]

受理判定が済んだら 200/202 を即返し、後処理をレスポンス確定後に回す。実装の型（choke point 集約）:

```ts
export default {
  async fetch(request, env, ctx) {
    const { requestId, finalize } = startObservation(request);

    // 全 return path がこれを 1 回だけ呼ぶ
    const conclude = (obs, afterResponse?: () => Promise<void>) => {
      emit(obs);                                   // 構造化ログ（同期・軽量）
      if (afterResponse) ctx.waitUntil(afterResponse()); // 外部送信・転送は応答後
    };
    // ...検証。各 return の直前で conclude(finalize(...))
  },
};
```

waitUntil の規律:

- **waitUntil 内の例外はレスポンスに影響しない代わりに、握り潰されて見えなくなる**。後処理側に自前の try/catch + 分類済みエラーログを必ず入れ、記録失敗・通知失敗とも可視化する [実証B]。
- 応答後の実行継続時間には上限がある（世代・プランで異なるため一次ドキュメントで確認）。リトライを waitUntil 内に置く場合は合計時間を上限内に収める設計にする（実例: 間隔 1 秒 → 5 秒・最大 3 回・合計約 6 秒 [実証B]）。

### 1.4 非同期後処理の 3 段階 [分岐]

| 後処理の性質 | 手段 | 出典 |
|---|---|---|
| 失敗を許容できる fire-and-forget（telemetry・ベストエフォート通知） | `ctx.waitUntil()` | [実証A] |
| 有界の即時リトライつき配送（数秒スケール・at-least-once を受容） | `ctx.waitUntil()` 内リトライ | [実証B] |
| 恒久リトライ・DLQ・分スケール以上の耐障害が必要な配送保証 | **Cloudflare Queues**（料金・利用条件は要一次確認。producerでenqueue → 202即返し → consumerで配送） | [一般] |
| 順序保証・状態を持つ集約 | Durable Objects | [一般] |

- **at-least-once の明文化**: 結果不明の失敗（タイムアウト）後に再送する設計は、下流への重複配送が起こり得る。受容するならその旨を記録仕様に明文化し、「重複が観測されたときにバグか仕様か即答できる」状態にしておく [実証B の教訓]。
- Queues 採用時 [一般]: `max_retries` + dead letter queue を必ず設定し DLQ 到達をアラート対象に。consumer は冪等に（event id または payload hash + TTL で dedup）。enqueue するメッセージは生 payload でなく最小の抽出結果 + 参照（大きい body は R2 に置いて key を渡す）。
- Queuesの料金・利用条件を確認し、現在の利用条件で採用できない場合は**利用条件変更の判断ゲート**として扱う。実運用の失敗観測（リトライ枯渇の頻度）も判断材料にする [実証B の運用]。

### 1.5 受信認証の選択 [分岐]

| 前提 | 方式 |
|---|---|
| 送信元サービスが署名を提供する（GitHub 等） | HMAC 署名を**ヘッダで**受け、`crypto.subtle` で検証 [一般] |
| 送信元が任意の外部システムで署名を強制できない | **推測不能な URL（エンドポイント ID をパスに）+ 共有シークレットヘッダ** [実証B] |

共通の規律:

- 比較はタイミングセーフに。**SHA-256 でダイジェスト化してから `timingSafeEqual`** にすると、長さ差の漏えいも同時に防げる [実証B]。
- **secret・署名・トークンを URL query に載せない**（§5.4: platform invocation log が query ごと捕捉する）[実証A で実測]。パスに載る秘密（エンドポイント ID 等）は §5.4 の受容判断を明示的に行う。
- 補助層: 送信元 IP allowlist・rate limit [実証A]。エンドポイント ID 総当たり対策としての rate limit は将来判断としてバックログ化してよいが、§8 の予算監視は先に入れる [実証B]。

---

## 2. ログ・記録・可視化の責務分割

### 2.1 記録の正本を最初に決める [実証B で確立]

可視化は最大 3 層になる: ① platform invocation log（無設定で全リクエスト捕捉）、② アプリ構造化ログ、③ DB の per-request 記録（利用者向け参照の土台）。**全層に同じ情報を書くと重複とコスト増になる**。

- ③ を持つなら、② は**エラー系事象のみ**に絞る選択肢がある [実証B]。
- ③ を持たないなら、② を「1 リクエスト = 1 行の wide event」にする [実証A]。

### 2.2 構造化ログの規律（層の選択によらず適用） [実証A/B]

- **単一 choke point**: ログ出力関数（`emit()`）を 1 箇所に限定し `console.*` を散在させない。redaction の適用点と検証対象が 1 つになる。
- **語彙の列挙固定 + 生値連結禁止**: event / errorClass / reason は列挙型 + 数値 + 内部 ID のみ。`` `invalid: ${userInput}` `` のようなリクエスト生値の文字列連結は redaction の迂回路になるため禁止。**型で強制する**（enum union を受ける signature にする）[実証B]。
- route/path は既知の列挙値に畳む（未知は `"other"`）。raw pathname を出さない [実証A]。

### 2.3 Error の扱い [実証A/B + B の教訓]

- `Error` オブジェクトを直接 log しない。`message` / `stack` は non-enumerable で scan から漏れやすく、外部 API のエラーメッセージには secret・URL・レスポンス断片が混入し得る。**`classifyError()` で列挙型に変換してから emit** し、回帰テストで「message キー不在」を検証する [実証B]。
- **raw な Error.message を「どこかに」残す場合、その出力先も sink として ruling する**（§3.1）。「ログには出さないが DB には残す」は redaction 判断の終わりではなく、新しい sink への出力決定である。fetch 失敗の message には転送先 URL（それ自体が secret のことがある — Slack Incoming Webhook 等）が含まれ得る [実証B で発見された穴]。
- **自由文の入れ物を作らない（redaction の最強形は構造的不在）** [実証B]: エラー情報の格納先に自由文カラム / フィールドを設けず、**分類 enum + 数値（HTTP status・試行回数）で完備させ、例外の内容をどの出力先にも取り込まない構造**にする。「message という名前の自由文カラムが残ること自体が、将来の生メッセージ混入の構造的な罠」。サニタイズは漏えいをフィルタで防ぐが、構造的不在は漏えいを不可能にする。
  - **拡張規約を同時に固定する**: 分類が不足した場合の拡張手段は「列挙値の追加」または「安全な派生フィールド（`error.name` のような enum 性の値、cause チェーンの分類など DERIVED-ONLY）の追加」に限り、**自由文の再導入は行わない**。この規約がないと、未知の障害対応中に「原因が見えないから一時的に raw を出そう」という退行圧力に負ける。
  - **`unknown` 分類の比率を列挙の健全性指標として観測する**。unknown が増えたら、raw を log するのではなく再現環境で分類を増やすのが正規ルート。
  - **migration の残置に注意**: 自由文カラムを列挙カラムへ RENAME する migration は列名を変えるだけで、既存行の旧自由文（secret を含み得る）はそのまま残る。既存行の purge / 既定値 backfill まで**同一 migration で**行うこと。canary 回帰テストは新規発生分しか検証しないため、残置データは検出できない。加えて、**migration 適用手順に事後チェック（列挙外値 0 件の確認クエリ）を置く**と、規約遵守が適用のたびに機械的に検証される。残置値を確認・報告する際は値そのものを貼らない（件数のみ — redaction 規律は作業記録にも適用）[実証B]。

---

## 3. Redaction — 「注意」ではなく「構造」で守る

小規模プロジェクトでも choke point 化 + 列挙型 + テストの三点セットは初期から入れる価値がある（後からの付け替えはコスト増）[実証B の総括]。

### 3.1 sink モデル — 全出力先を列挙してから許容度を決める [実証A、B で拡張]

許容度は「出力先」で決まる。**新しい出力先を作る変更は、sink 一覧への追加と ruling を同一 commit で行う**。

| Sink | 説明 |
|---|---|
| **S-LOG** | Workers logs / `wrangler tail` / 構造化ログ行 |
| **S-RESULT** | HTTP レスポンス body / エラーレスポンス |
| **S-DB** | DB に書く per-request 記録。**参照 API / GUI まで含めて 1 つの sink**（B で ruling 漏れが起きた箇所） |
| **S-NOTIFY** | 運用通知（Slack 等）。外部サービスに残る |
| **S-METRICS** | 外部メトリクス sink。一度出たら redact 不能 |
| **S-REPO** | リポジトリに commit される文書・fixture |
| **（射程外）** | platform invocation log — 自前 redaction では塞げない。設計で対処（§5.4） |

### 3.2 分類モデル [実証A]

| クラス | 意味 | 例 |
|---|---|---|
| **FORBIDDEN** | どの sink にも raw 値を出さない | 共有シークレット / API key / `Authorization` raw 値 / 受信 body 全文 / 転送先 URL（secret 性がある場合）/ Cookie / Workers Secrets の値全般 / raw `Error.message` |
| **DERIVED-ONLY** | 派生形のみ可（length / hash / prefix / count / 構造 signature） | body = バイト数 + hash / Authorization = scheme + length |
| **CONDITIONAL** | sink 限定で raw 可 | 送信元 IP（S-LOG のみ、repo は octet 伏せ） |
| **ALLOWED** | 全 sink 可（size 上限内） | requestId / route / status / durationMs / 列挙 reason / env ラベル |

識別子の派生形: 低感度 ID は先頭 8 文字 prefix + length、**個人特定性の高い ID は一方向 hash（SHA-256 hex prefix 8 文字）**、組織・テナント表示名は全 sink 禁止 [実証A]。

運用規律: 新しい log/result/DB field の追加は policy 表の更新と同一 commit。誤検知が出ても key rename で回避せず、表を根拠付きで更新してから guard を変える。

### 3.3 検証ハーネス — 段階導入 [実証A、B で段階形]

| 段階 | 内容 | 適する時期 |
|---|---|---|
| 最小 | choke point + 列挙型（型で強制）+ 個別回帰テスト（例: 出力に `message` キーが存在しないこと） | 初期実装から [実証B] |
| 本格 | **二層ハーネス**: forbidden-key scan（正規化後完全一致で FORBIDDEN key を再帰検出）+ canary value scan（synthetic canary を注入し、出力のどこにも現れないことを検査。truncate 部分漏洩も検出） | production 前 [実証A] |

- canary は synthetic のみ（実 secret・実 URL をテストに書かない。実在しないドメインを使う）。
- **violation report / drop log 自体も redact**（テスト失敗出力・CI ログを漏洩経路にしない）。
- canary の注入先には「DB に書かれる値」「通知 payload」も含める（S-DB / S-NOTIFY の検証）[B の教訓の一般化]。
- 汎用 FORBIDDEN key と正当 field の衝突（例: `error.code`）は **path-scoped allowlist を scan 有効化の前に設計**。広い key allowlist は作らない [実証A]。
- entropy ベースの汎用検出はハーネスの責務外（誤検知 0 を保つ）。repo の secret scan は gitleaks 等が補完。

---

## 4. メトリクス・使用量分析

### 4.1 送信経路の選定 [実証A]

- **Cloudflare Analytics Engine が第一候補**。`writeDataPoint` の実行特性、quota、料金は利用時点の公式文書で確認する。イベントベースでtemporality問題を避けやすく、集計はSQL API / Grafanaを利用できる。
- **OTLP/HTTP → Grafana Cloud (Mimir) は不成立の実測あり**: stateless な Workers は DELTA temporality でしか送れず、Mimir は DELTA を拒否（400）。中間に stateful 集約（Collector 常駐）を挟まない限り成立しない。**serverless から外部 APM へ push する場合、送信先が DELTA を受けるかを最初に確認する**。
- 使用量の日次レポート用途なら **Cron + Cloudflare GraphQL Analytics API**（pull 型）も選択肢 [実証B で計画中]。push 型（AE）とは補完関係。
- **カウントはメトリクス基盤、ログは人間用** [実証A の運用実感]: 警報・集約報告の根拠となるカウントをWorkers Logs / ログ検索系だけに置かない。sampling、保持期間、イベント上限、集計精度は利用時点の公式仕様を確認する。ログは人間が文脈を読む調査証跡、countingは要件に合うメトリクス経路を正本とし、必要に応じて二重証跡として併存させる。
- percentile（p95/p99）は backend 集計。isolate は短命なので client 側 bucket 集計をしない。CPU time は isolate 内で取れない（wall-clock のみ。`duration_ms` の定義を文書化する）[実証A/B]。

### 4.2 metric label の統制 [実証A]

- registry で各 metric の許可 label key を**完全列挙**（低カーディナリティ enum のみ）。raw な requestId / userId / テナント ID を label に載せない。
- runtime でも sink 到達前に validate して drop。drop を知らせるログは code のみで raw 値を含めない。
- 識別子が必要な利用分析は**専用 dataset に隔離**（carve-out）し、一方向 HMAC で擬似化した key を使う。通常 metrics 経路の不変条件は緩めない。

### 4.3 fail-safe 既定 [実証A/B]

外部送信系（メトリクス sink・運用通知）は **設定未投入 = 何も送らない** を既定にする（NoopSink / 通知 URL 未設定 = 通知なし）。設定 parse 失敗時も値を log せず当該 sink を skip。記録とログは常に残す側に倒す [実証B]。

---

## 5. プラットフォーム制約（設計に効く実測値）

本節の数値は過去プロジェクトで確認した時点の履歴であり、新しい設計の入力値にはしない。各プロジェクトで実装・設計する時点の公式一次情報を確認し、確認日、結果、設計への影響、再確認条件を `docs/TECHNOLOGY/ADOPTION.md` に記録する。

| # | 制約 | 設計への影響 | 出典 |
|---|---|---|---|
| 5.1 | **subrequest予算がplanと設定に依存する** | 利用時点の公式上限を確認する。fan-out・バッチ設計に直結するため、予算を設定化してバッチ件数を導出し、予算超過見込みは「分割続行 + resume token」型を検討する | [実証A/B、閾値は要一次確認] |
| 5.2 | **CPU予算がplanと設定に依存する** | 利用時点の公式上限を確認する。重いparseやpayload変換は実測し、plan・構成変更の判断材料にする | [実証A/B、閾値は要一次確認] |
| 5.3 | **CPU time は isolate 内で計測不能** | 自前計測は wall-clock のみ。CPU time は platform 側（Observability / Logpush）+ backend 集計 | [実証A] |
| 5.4 | **platform invocation log が URL を query ごと捕捉**（observability enabled 時） | 自前 redaction の射程外。secret を query に載せない設計で対処。**パスに載る秘密（エンドポイント ID 等）は受容判断を明示的に文書化**する（受容根拠の実例: 閲覧権限者は DB 側で同じ ID を見られるため新たな漏えい面を作らない。Logpush を外部に向ける場合は再評価、を条件に付す） | [実証A 実測 / B 受容] |
| 5.5 | **isolate は短命・stateless** | グローバル変数でのリクエスト跨ぎ集計・キャッシュに依存しない。状態は KV / D1 / DO / Queues へ | [実証A/B] |
| 5.6 | **waitUntil の応答後実行時間に上限** | リトライ合計時間を上限内に収める（§1.3）。分スケールの再送は Queues / cron の責務 | [実証B] |
| 5.7 | **cron trigger** | `scheduled` handler で TTL 削除・カウンタ purge・整合性 audit・日次レポート。ストレージ側 lifecycle（R2 自動削除等)を最終防衛線として重ねる | [実証A] |
| 5.8 | **D1の読み取り・書き込みquotaは非対称になり得る** | 利用時点のquotaと料金を確認し、どちらが逼迫資源かで最適化を判断する。書き込みが正本記録に直結する場合は§8の予算監視を必須にする | [実証B、閾値は要一次確認] |

---

## 6. 設定・環境・デプロイ

### 6.1 wrangler の env 分離 [実証A、B で補正]

- top-level は **local（`wrangler dev`）専用**とし、名前に `-local` 等を付けて deployed 環境と衝突させない。**bare `wrangler deploy` を禁止**し、deploy は環境別 script（`deploy:dev` / `deploy:staging` / `deploy:production`）経由のみ。top-level 名が実環境名と同じだと bare deploy が実環境を上書きする footgun になる [実証A]。既存デプロイ名がある状態でのリネームは互換確認を先に [実証B]。
- **継承の正確な理解**: `vars` / binding（D1・R2・AE 等）は env へ**継承されない**ため環境ごとに明示宣言する [実証A]。一方 `observability` 等 **inheritable なキーも存在する**（wrangler ソースで確認済み — top-level 1 箇所で全環境に適用できる）[実証B]。「全部継承されない」と思い込まず、キーごとに inheritable かを確認する。
- 露出面削減: `workers_dev: false` / `preview_urls: false`、custom domain のみ公開。

### 6.2 secrets [実証A/B]

- `wrangler secret put <NAME> --env <env>` で環境別投入、repo に commit しない。local は `.dev.vars`（gitignored）。
- env var の**名前**は log 可、**値**は FORBIDDEN。**設定不正（parse 失敗）のエラーログにも値を含めない** [実証B で修正実績]。
- rotation 手順を runbook 化。

### 6.3 fail-closed フラグと段階的有効化 [実証A]

- 危険側の機能（外部書込み・転送の有効化）は **未設定 = disabled** のフラグで守り、環境ごとの意図値と昇格条件を明示する。
- 遮断系（認証・IP gate・rate limit）は **off/observe で deploy → ログで判定結果確認 → enforce へ flip** の 2 段階。判定バグによる全遮断事故を防ぐ。
- deploy 昇格チェーン: dev（実験 + write E2E）→ staging（write なし smoke）→ production。

---

## 7. テスト [実証B 中心]

- **テスト基盤の想定機能は採用前にパッケージの実物で確認する**。実例: vitest-pool-workers の `fetchMock` は版によって存在しない（型定義・実装から確認）→ 同一 isolate 特性を利用した `vi.stubGlobal("fetch")` 方式へ切替。SPEC に書く前に一次確認する。
- 同様に、ラッパーライブラリは採用前に保守状況・用途適合を一次確認する。実例: OTel 系 Workers ラッパーが 13 か月停滞 + トレース用途で metrics にミスマッチ → 依存ゼロの自前実装（数百行）に倒した [実証A]。
- redaction 回帰テストは §3.3 の段階導入。最小形（「出力オブジェクトに `message` キーが存在しない」等のキー不在検証）だけでも初期から入れる。
- waitUntil 内の後処理（リトライ・記録・通知）は、失敗分岐（記録失敗・通知失敗・両方失敗）を明示的にテストする。握り潰し検出はこのテストが最後の砦。

---

## 8. 運用

- **ダッシュボードの JSON Model を repo に保全**。画面手編集は再現不能になる。変更は JSON diff で追う [実証A]。
- **ops ログ**（append-only の索引 1 行 + 事象別詳細ファイル: 事象 / 根本原因 / 対応判断 / 再利用可能な調査手順）。類似アラートの調査はまずここを照合する [実証A]。
- **incident runbook**: どのログ・記録・ダッシュボードをどの順で見るか、遮断・無効化の手順（フラグ off → deploy）を平時に文書化 [実証A]。
- **アラートの最低ライン**: 5xx 率 / rate limit 発火 /（Queues 採用時）DLQ 到達・queue depth / **正本記録ストレージの書き込み予算消費率**（D1 等。予算枯渇 = 記録要件の崩壊を予兆で捕まえる）/ 記録 write 失敗の集約報告 [一般 + B の教訓]。
- **失敗シグナルの独立性原則** [実証B]: **資源 X の障害を知らせる経路は X に依存してはならない**。実例: D1 への記録 write 失敗を数える先を D1 にすると、D1 障害が記録とその警報を同時に沈黙させる。失敗シグナルは失敗した資源から独立した経路に出す — カウントの正本は Analytics Engine（D1 と独立・subrequest 予算も消費しない）、構造化ログのイベント（`record_failed` 等）は調査用証跡として併存（§4.1「カウントはメトリクス基盤、ログは人間用」）。障害時の通知洪水を避けるため、失敗ごとの即時通知ではなく集約報告にする。
- **記録 write 失敗時の挙動（fail-open / fail-closed）を事前に決めて文書化**する。「記録できなかったリクエストを処理継続するか」は障害時にアドリブで決めない [実証B]。判断枠組み（B の決定記録から一般化した 4 観点 + 2 つの明示事項）:
  1. **実行順序**: 記録が本処理（転送）の後なら、fail-closed にしても既送信は取り消せず一貫性は得られない。先行書き込み方式に変えるコスト（逼迫資源の消費倍増）も併せて評価する。
  2. **SPOF 化**: fail-closed は記録ストレージを本処理全停止の単一障害点にする。
  3. **中核価値との優先順位**: サービスの中核価値（届けること）と記録完全性のどちらを上位に置くか、前提 3 点（§0）の可視化要件と突き合わせて決める。
  4. **代替可視化の成立**: fail-open を選ぶなら、記録欠落を把握する代替経路（上記の独立した失敗シグナル）が成立していることを同時に確認する。
  - **適用範囲を明示する**: 本処理**前**の読み取り失敗（宛先ルックアップ等）は宛先が解決できない以上必然的に fail-closed であり、fail-open の決定は「本処理後の記録 write」に限る、と書き分ける。書かないと fail-open が過大に読まれる。
  - **残存リスクを明示する**: fail-open + 集約報告では「欠落した記録の件数は分かるが、どの処理が欠落したかは特定できない」。受容として明記し、個別復元が必要になった場合の二次証跡（platform invocation log / Workers Logs のタイムスタンプ照合）を incident runbook に接続しておく。

---

## 9. 付録

### 9.1 立ち上げチェックリスト

- [ ] 前提 3 点（記録の正本 / 逼迫資源 / 可視化要件）を文書化した
- [ ] 入口パイプラインを構成し、拒否判定の位置を記録要件と整合させた（§1.1）
- [ ] 有界ストリーム読みで巨大 body をメモリに載せない（§1.2）
- [ ] 全 return path が構造化ログ emit を 1 回だけ通る（choke point）
- [ ] ログ語彙は列挙 + 数値のみ。型で強制。Error は分類してから emit
- [ ] **エラー情報の格納先に自由文カラム / フィールドがない**（分類 enum + 数値で完備。拡張規約と unknown 比率の観測つき）
- [ ] **sink 一覧（S-DB / S-NOTIFY 含む）** と redaction policy 表を作り、最低限のキー不在回帰テストを入れた
- [ ] secret を URL query に載せる flow がない。パス上の秘密は受容判断を文書化した
- [ ] 後続連携の保証レベルを決めた（waitUntil / Queues）。at-least-once なら明文化した
- [ ] 記録 write 失敗時の fail-open / fail-closed を決めた（適用範囲・残存リスクの明示つき、§8）
- [ ] 失敗シグナルが失敗する資源から独立した経路に出る（§8）
- [ ] 警報・集約の根拠となるカウントの正本がメトリクス経路にある（ログ検索系に置いていない、§4.1）
- [ ] metric label は registry 列挙のみ。外部送信系は未設定 = 送らない
- [ ] wrangler env 分離・bare deploy 禁止・fail-closed フラグ・secrets の env 別投入
- [ ] 遮断系は observe → enforce の 2 段階
- [ ] 予算監視（subrequest 消費 / 記録ストレージ書き込み / CPU）とダッシュボード・runbook・ops ログの置き場

### 9.2 採否記録テンプレート（本書を他プロジェクトへ適用する際）

本書の項目を適用したら、以下の 4 区分で採否記録を残す（プロジェクト B の記録形式を一般化）。**不採用と後回しにこそ理由を書く**。

```markdown
# 採否記録: cloudflare-workers-implementation-guideline の適用

## 1. 判断の前提となった本プロジェクトの特性
（§0 の前提 3 点 + 秘密の所在 + 再送責務 + 運用体制の表）

## 2. 採用（実装・文書化済み） — ガイドライン章 / 採用形 / 反映先
## 3. 不採用（意図的な差異） — 章 / 理由 / 汎用化の学び
## 4. 後続タスクで採用検討 — 章 / 反映先タスク / 判断条件
## 5. 現行実装との一致を確認したもの（変更不要）

## 6. 適用時に行った一次検証
（ガイドラインの記述を鵜呑みにせず実測・ソース確認した項目。
 結果が本書と食い違ったら本書側へフィードバックする）
```

### 9.3 本書の更新規約

- 新プロジェクトでの採否記録・一次検証で本書の記述と食い違う事実が出たら、**本書を出典タグ付きで更新**する（実例: `observability` の継承性は [実証B] の一次検証で補正済み）。
- 実 URL・テナント名・環境固有値・実 secret は本書に載せない（S-REPO 規律の自己適用）。
