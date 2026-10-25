# 動的検証の実行環境

対象プログラムを実行して候補の成立や修正対照を確認する場合だけ読む。ソース監査と通常のOSV検査のためにCloud環境を要求しない。ここで扱うのはagentが行う環境選択・準備・引継ぎであり、CLIによるCloud自動作成ではない。

## 利用環境に合わせた提示

利用者の指定とprojectで受入済みの検証環境を優先する。そのうえで、現在監査を担当するAI、実行場所、OS/CPU、利用可能な機能を確認する。`plan.surface`や配置済みdirectoryは手掛かりであり、現在のagentやCloud契約の証明ではない。`both`なら今回の担当に合わせ、不明で選択が変わる場合だけ確認する。案内は利用者の言語で行う。

| 今回の担当 | 既存の検証環境がない場合の候補 | 提示上の注意 |
| --- | --- | --- |
| Codex | 利用可能なCodex Cloud環境を第一候補として確認する | 対象用の隔離・自己診断が必要。Cloudという名称だけで安全条件を満たしたとしない |
| Claude Code | Claude Codeのcloud sessionを候補として確認する。利用不可または条件不足なら専用Linux VM・コンテナ・CIを提案する | Codex契約やCodex Cloudへの切替を標準要件にしない。ローカルに受入済み隔離環境があれば再利用する |
| Claudeの通常チャットのみ | 実行toolと必要な独立agentがなければ、Claude Codeまたは承認された実行担当への引継ぎを案内する | チャットの契約だけでClaude Codeの実行能力があると扱わず、未実施を保持する |
| その他のAI | 接続済みの専用VM・コンテナ・CI等をcapabilityで比較する | 製品名からCloudの有無・安全性・契約を推定しない |

他社のCloudは、利用者が選んだ場合だけ追加候補にする。希望する環境が条件を満たす場合は既定候補より優先する。利用枠、追加課金の設定、組織方針、source持出し可否を確認し、別製品の契約・支払方法変更や権限制限の解除を暗黙に求めない。

## Claude Codeの場合

1. `.claude/skills/`の共通gateとCloudflare skillが実際に認識され、必要な独立agentを利用できるか確認する。配置確認と実監査の受入を区別する。
2. ローカルCLI/IDE/DesktopのLocal、cloud session、Remote Controlを区別する。Remote Controlはローカル作業を遠隔操作する仕組みで、Cloudへの移動とは扱わない。
3. cloud sessionを使える契約・組織権限・source取扱条件を確認する。対応する版の公式UIで対象環境を選ぶか、公式CLIの`claude --cloud`による**新規session**作成を計画する。既存ローカルsessionがそのまま移るとは説明しない。accountや接続の設定は承認範囲に含まれる場合だけ進める。
4. ネットワークの既定Trustedを通信遮断と扱わない。実行時はNone等を検討するが、GitHub proxy、MCP connector、network secret宛先、Anthropic制御通信など別経路もある。対象の隔離側で外部通信・proxy継承・管理socketへの到達を防ぎ、実測する。必要なtoolchainの準備と対象実行を分離する。
5. Dockerが利用できる場合も、対象を動かす子環境の制限を確認する。Claudeの認証情報、home、実データ、Docker socket、制御通信の認証情報を対象へ渡さない。agentを動かす開発containerと、未信頼の対象を動かすcontainerの境界を分ける。
6. ローカルの`/sandbox`は確認手段の一つ。macOSのSeatbelt、Linux/WSL2のbubblewrapによる保護だけで、read-only対象・環境変数・全資源上限等の監査要件を満たしたとしない。通常のdevcontainerも同様に個別確認する。Windows native等で必要機能がなければ対応する専用実行環境を案内する。

不足時にsandbox無効化、`--dangerously-skip-permissions`、広い`excludedCommands`やDocker socket許可、弱いnested sandboxへの変更を解決策として案内しない。管理操作が拒否された場合は停止理由を保持し、管理者が承認した信頼済みlauncherや別の専用環境を選ぶ。対象codeは常に隔離内で実行する。

提示例:

> コードの確認で、他人のデータを取得できる可能性が見つかりました。実行して確かめるため、まず利用できるClaude Codeのクラウド検証環境を確認します。対象コードとダミーデータだけを持ち込み、通信・書込み・資源制限を確認してから再現と修正対照を実行する計画です。利用できない場合は専用VMやCIを候補にします。環境と費用の確認が終わるまで、対象プログラムは実行しません。

## Codexの場合

Codex製品の新規chatでCloudと公開済み環境を選ぶ。ChatGPT/Workの実行場所切替とは区別する。作成したtaskのmetadata、確定版、資材hashを照合し、開始guideを明示的に読ませる。start skillの自動認識を仮定しない。Macのfile・processが自動転送されるとも説明しない。

kitの限定試行では、Codex Cloud内の固定Python fixtureで復元・自己診断・再現・対照・cleanupを確認済み。ただし汎用runnerの配布や任意projectへの対応を実証したものではない。個人の環境名・task ID・固定fixtureを配布先へ埋め込まない。管理操作の承認方式をClaude等へそのまま移植しない。

## 共通の実行・引継ぎ条件

- source snapshotのpath/mode/hash一覧、scope、候補ID/fingerprint、provider固定ref、対象runtime/toolchainと必要依存を固定する。commitだけでdirty・未追跡差分を代用しない。setup scriptも対象実行になり得るため、対象由来scriptを隔離の準備工程で起動しない。
- 外部通信遮断、allowlist環境変数、read-only対象、scratch限定書込み、権限・process/CPU/memory/file/output/時間の有限上限をOSで強制する。信頼済み親と対象を分け、対象を親やMacでimport/compile/実行しない。自己診断で各制限を確認し、不足・不明なら対象を実行せず`needs_validation`を保持する。
- scope、持込データ、場所・access、費用/利用枠、実行回数、時間、出力先、cleanup、停止条件、既存承認の範囲を示す。契約の利用枠内という前回実績を将来の無料保証にしない。push/PR・公開・credential追加は検証実行とは別の操作として扱う。
- 対象と原因を修正した対照や既知の安全な対照へ同じ入力を与え、正常系も確認する。対照の差分と選定理由を保持する。終了時は全process停止・owned object削除と、親によるbounded/no-follow成果物保存・hashを確認する。別担当がsourceと記録を確認し、担当・task/runtime・実行時刻・制限実測・入力/出力・cleanupをprivate証跡へ残す。
- 別環境へ移す場合、元のplan、snapshot一覧、検証計画、承認範囲を渡し、受信側でsourceとpolicy/providerを再照合する。絶対path・capability等が異なる旧planをそのまま実行しない。必要なら実行先で再planし、元planとの対応と追加差分の承認を記録する。
- 動的結果は候補への補足証跡。既存reportを書き換えず、担当監査へ戻してcoverage・finding・両validatorを含むfull workflowを完了させる。`dynamic-validation.json`等を`import-cloudflare`へ直接渡して完全監査としない。戻し先でも現在のsnapshotとplanの整合を確認し、不一致・未検証部分はREADYにしない。

## 一次情報と実証範囲

2026-10-26に公式文書を確認。製品の提供条件・設定・CLIは利用時点で再確認する。Claudeの経路は公式仕様に基づく案内であり、kit側で実アカウントによる動的検証を受入済みとは扱わない。

- [Claude Code cloud sessions](https://code.claude.com/docs/en/claude-code-on-the-web): cloud/Remote Controlの違い、利用条件、sessionの開始。
- [Claude cloud environments](https://code.claude.com/docs/en/cloud-environments): network設定と別通信経路、Docker利用。
- [Claude sandboxing](https://code.claude.com/docs/en/sandboxing): ローカルshellの保護範囲と制限。
- [Claude devcontainers](https://code.claude.com/docs/en/devcontainer): 開発containerと内部credentialの扱い。
- [Codex environments](https://learn.chatgpt.com/docs/environments/modes): CodexでのCloud選択・公開済み環境・taskごとのfile。
