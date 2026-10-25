# SPEC 009: Security Assurance Contract

- Date: 2026-10-25
- Status: Accepted for implementation; live audit acceptance remains pending

developmentにはsecurity-gate、SECURITY_ASSURANCE文書・JSON方針を配布する。Cloudflareが標準コード監査、OSVが依存関係検査。Mantisを標準の不足一覧やinstall案内に含めず、利用者の明示指示時だけ導入・実行計画を作る。

tooling固有pinとadapterは2つのTechnology Profileで配布し、profile任意選択・EPIC-7のstate追加契約を維持する。新規・既存projectともprofile配置と外部tool導入を分離する。init / upgrade handlerはnetwork・有料監査・Git書込を行わない。

共通実行契約の正本は配布する`security-gate/scripts/security-lib.mjs`と`providers.mjs`、操作手順はskillの`references/commands.md`。schemaVersion 1のplan / resultをcanonical SHA-256で結び付け、source、policy、adapterが変わればplanはstale。digestは人の承認や実施者を証明しない。actual human authorizationは呼出側のagent / trusted workflowで確認する。

planは対象、surface、trigger、scope、外部private出力先、network、入力hash、policy・provider pin・capability・有限予算を持つ。導入時は具体planをpreviewし、承認後に不足分だけ固定originから取得してhash / sizeを検証する。既存衝突・symlink・特殊file・途中配置を拒否し、勝手な更新やglobal変更をしない。導入成功は実監査の完了ではない。

Cloudflareのcomplete standard/deep report一式と一致するsource_ref・scope、独立agent、必要sandbox条件、両上流validatorを確認する。metadataの`completed_at`には実際の監査完了ISO時刻を記録し、取込・再取込で更新せずresultの`completedAt`へ引き継ぐ。欠落・不正・許容時計差（1分）を超える未来時刻は拒否する。deferred / dangling candidateはcoverage不足とする。OSVは固定binary、全package JSON、source一覧、exit code、DB情報を確認し、0件と対象なし・未対応・API errorを分ける。実行errorのraw情報はprivateに保持する。

両roleの結果を別々に保持し、必須不足・高重大度・必要境界の未確認・証跡不正・古さはBLOCKED、残る所見はREVIEW_REQUIREDとする。READYは証跡の条件を満たす状態であり公開承認ではない。release triggerでは対象全体のbaselineを要求し、scoped audit単独ではREADYにしない。owner reviewによる期限付きのlow/medium等の受容は対象result / findingへ束縛し、high/criticalと未確認境界は自動waiveしない。

runtime tool・raw report・DBはbootstrap baselineに含めない。adapterとpinは通常stateで追跡する。公開exportにはkitのコード・手順・pinだけを含め、利用projectのreport・承認・credentialは含めない。実装の回帰はstubと固定fixture、実tool・独立agentによる監査受入は別に記録し、未実施を完了扱いにしない。

## 実行環境に応じた案内（2026-10-26）

動的検証が必要な場合、共通skillは現在の担当AIと実行場所、利用者の指定、projectで受入済みの隔離環境に応じて候補を示す。既存環境を優先し、なければCodexではCodex Cloud、Claude CodeではClaudeのcloud sessionを候補として確認する。Claudeの契約・組織権限・必要な隔離能力が不足する場合は専用VM・コンテナ・CIを案内する。その他AIも実際のcapabilityで判断し、他社製品への切替を必須化しない。`both`や配置pathだけで担当AI・Cloud利用権を断定しない。

配布手順の正本は`security-gate/references/execution-environments.md`。これはagentによる提案・preflight・引継ぎの契約で、Cloudの自動作成APIや汎用runnerを追加するものではない。plan/result/policyのschemaは変更しない。Cloud設定・built-in sandbox・capability booleanだけでは対象の隔離を証明できず、対象へのOS制限と自己診断を必要とする。Claude実機の動的確認は未受入と明示し、Codexでの固定fixture成功を他環境へ一般化しない。

引継ぎではsource path/mode/hash一覧、scope、候補、provider、承認、予算、実行先の制限と結果を結び付ける。移動先で必要に応じて再planし、元planとの対応を記録する。生の動的結果は完全監査reportの代わりに取込まず、担当監査へ戻して現行のfull workflowと両validatorを満たす。条件不足は`needs_validation`を保持し、既定sandboxや組織の制限を緩めて解決しない。
