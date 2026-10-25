# ADR 005: 共通ゲートと標準セキュリティproviderを分離する

- Date: 2026-10-25
- Status: Accepted
- Related: EPIC-8 / SPEC_009

公開前のチェックをskill設置だけに依存すると、未導入、古い対象、途中終了を取りこぼす。kitは実施時期・scope・証跡・公開判断への接続を担当し、探索手法は外部providerへ委ねる。

利用者確認済み方針に従いCloudflare security-audit-skillを標準コード監査、Google OSV-Scannerを既知依存脆弱性検査に採用する。結果は別roleとして保持し、相互に代用しない。Mantisは追加調査の選択肢だが、通常の未導入確認から外し、明示指示なしにinstallを促さない。

共通assetはdevelopmentへ配布し、tooling固有assetは任意の2profileへ置く。providerの外部取得と監査は具体preview・人の承認後にエージェントが進める。init / upgrade自体へnetworkを追加しない。global install、上流全文のvendor、自動修正、常時scan、Mantis必須化、CI保護自動変更は採らない。

Cloudflareは固定commitの完全bundleとlicenseをfile別Git blob hashで検証し、OSVはrelease APIで確認した固定SHA-256とprovenanceを保持する。後者の取得・hash一致と、SLSA署名の独立検証を同一視しない。pin更新には差分と互換試験が必要。

代償として、agent / sandboxの実行能力や外部DB準備を必要とし、全環境で同じ監査を約束できない。capability不足と未実施を明示し、実連携の受入はmock回帰から分けて記録する。

## 追補: AI別の実行環境案内（2026-10-26）

監査providerと実行基盤を別軸として扱う。CloudflareとOSVの役割はAI製品によって変えず、動的検証の候補は現在の担当と利用可能な環境へ合わせる。projectで受入済みの隔離環境を優先し、ない場合はCodexにCodex Cloud、Claude CodeにClaudeのcloud sessionと専用VM・コンテナ・CIを提示する。他社Cloudは利用者が選んだ追加候補とし、Codex契約を全利用者の前提にしない。

Cloudやbuilt-in sandbox自体を安全要件の達成とみなさず、対象側の制限を実測する。Claudeの経路は公式仕様に基づく案内として採用するが実動作の受入とは分離する。個人専用の環境名・task ID・fixture runnerは配布しない。詳細はSPEC_009と配布skillの実行環境referenceを正本とする。
