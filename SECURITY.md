# Security Policy

## Supported versions

原則としてlatest public releaseを対象に確認します。過去versionはbest effortで評価し、修正またはbackportを保証しません。

## Reporting a vulnerability

脆弱性、credential、Secret、private情報の混入可能性をpublic Issue、Pull Request、Discussionへ投稿しないでください。

public repositoryのSecurity画面から`Report a vulnerability`を選び、GitHub Private Vulnerability Reportingを使用してください。この機能はPhase 7の公開設定で有効化します。

機能が利用できない場合は、脆弱性の詳細を書かず、public Issueでpreferred private contactを問い合わせてください。

## Include in a report

- 影響するkit version
- 影響するpathまたは機能
- 想定するimpact
- synthetic dataだけを使った再現手順
- 可能であれば修正または緩和案
- disclosureに関する希望

実credential、個人情報、会社の非公開情報、第三者systemへの無断アクセス結果を含めないでください。

## Response policy

- best effortで確認する
- 初回応答時間、修正、backport、公開日を保証しない
- 影響と再現性を確認し、対象外の場合を含めてstatusを返すよう努める
- reporterと調整し、必要な修正・緩和・coordinated disclosureを判断する
- 修正前に詳細を公開しないよう依頼する場合がある

Private Vulnerability Reportingを有効にすること自体はSLAを設けるものではありません。

## Scope notes

次はsecurity reportではなく通常Issueの候補です。

- documentationの誤記
- Secretを含まない通常のinit / upgrade error
- 対応外環境のfeature request
- security impactを持たない使い方の質問

判断に迷う場合は、詳細を伏せてprivate reportingを選んでください。
