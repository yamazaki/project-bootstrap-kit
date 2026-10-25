# セキュリティ確認

コード監査はCloudflare security-audit-skill、依存関係の既知脆弱性はOSV-Scannerで確認する。Mantisは利用者が明示的に選んだ追加調査に限り、通常の処理では導入を促さない。報告窓口を示すSECURITY.mdとは役割が異なる。

## 実施時期

| 時期 | 確認 |
| --- | --- |
| 新規開始 | 標準tooling profile、外部tool、owner、保存先、予算、実行capabilityの準備 |
| 認証・認可、tenant、入力、file / command、webhook、AI tool権限の変更 | 関連経路と設定を含むCloudflare監査。依存変更があればOSVも実行 |
| 依存・lockfile変更 | OSV検査と公開範囲への影響判断 |
| milestone / phase受入 | 未実施、未検証、古い結果と残riskの棚卸し |
| 初回公開・一般配布 | 対象全体のコード監査と依存検査。secret・private情報、公開履歴、license、実artifactも別途確認 |
| 通常release / deploy | 全体baselineと今回差分、依存情報の鮮度、artifact・設定との一致 |
| 公開後CVE・incident・権限変更 | 影響をOPS / MNTで再評価 |

## 準備と導入

共通`security-gate` skillは外部toolがなくても不足を案内できる。tooling profile `security-audit-cloudflare`と`security-dependencies-osv`の選択は任意のままで、未選択なら既存のprofile追加・state登録→scan→plan受入を使う。profile配置と外部toolのinstallを混同しない。

不足時は、固定版・取得先・変更先・差分・実行範囲・network送信情報・費用上限・private出力先・戻し方を提示する。承認を得た後、エージェントが導入・実体確認・監査・結果検証へ進める。範囲が同じ既存承認は再確認しない。保留や失敗は未実施のまま残す。無関係な設計作業を止めず、必要な受入・公開判断は保留する。

init / upgrade applyから外部取得や有料監査を起動しない。global skill、MCP、system package managerを暗黙変更しない。Cloudflareの実行には独立agentと必要に応じたOS隔離が要る。skillを置いただけでは実行可能としない。

## 実行による再現確認

コードを動かす必要がある場合は、利用中のAIと実際の実行場所に合わせて環境を提示する。projectで受入済みの隔離環境を優先し、なければCodexではCodex Cloud、Claude CodeではClaudeのcloud sessionを候補として確認する。Claude側で利用できない場合は専用VM・コンテナ・CIを比較する。別のAIを使う場合も実行能力で判断し、Codexへの切替や別契約を標準要件にしない。

Cloudやローカルsandboxを使えるだけでは安全確認済みにならない。対象の通信・書込み・credential分離・資源上限を自己診断し、成功後だけダミーデータで再現と修正対照を確認する。環境・費用・持込情報・承認を照合してから進め、未確認は未検証として残す。詳細は利用中の`security-gate` skillの`references/execution-environments.md`を読む。環境の自動作成機能ではなく、agentによる案内・準備・引継ぎの手順である。

## project policyと結果

`docs/SECURITY_ASSURANCE.json`はproject固有の方針。ownerを設定し、初期推奨値の全体baseline 30日・依存情報24時間、監査900秒・32agent以内をriskと実際のprovider要件に照らしてreviewする。Cloudflareの検証・critic予約を削らない。費用上限と実際の実行権限も監査計画で示す。生のreportは原則repository外のアクセスを限定した場所へ保存する。

両検査の実施状態を分け、未実施・中断・不正JSON・DB不足・scope不足を「0件」にしない。Cloudflare confirmed high / criticalとOSVのhigh / critical該当はBLOCKED、medium以下と不明severityはREVIEW_REQUIRED。必要な境界の未検証も解消まで止める。自動の例外受容・finding却下は行わない。ownerが理由・代替策・期限を示した明示的な受容は、対象resultとfindingへ束縛して記録できる。high / criticalと未確認境界、実行・coverage失敗はこの操作で免除しない。

READYは現在のscopeに対応する証跡が揃う状態。脆弱性不存在や公開承認の保証ではない。code・依存・設定・artifact変更で古い結果を再評価し、差分監査を全体baselineと扱わない。公開操作・CI強制は別の仕組みと判断になる。
