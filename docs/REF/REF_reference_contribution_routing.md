# Contribution Routing Reference

## Intake

Issue / PR受領時は、外部writeを行う前にduplicate、version、再現性、Model、security / private情報、rights、third-party license、AI支援、changed path ownershipをread-onlyで確認する。

securityまたはprivate riskがある場合はpublic discussionを増やさず、非公開経路へ移す。

## State

- needs-triage: 初期確認前
- needs-info: reporterの追加情報待ち
- accepted: scopeとして受入済み
- duplicate: 既存Issueへ集約
- blocked: 外部条件または重要判断待ち
- private-route: security / privacyのためpublic処理を停止

## Work-line routing

| Intake | Private route |
| --- | --- |
| 新能力、大きなModel / profile追加 | Epic |
| リリース済み機能のbug、compatibility、軽微なdocs | MNT |
| release、公開運用、障害調査 | OPS |
| 利用方法 | Q&A。通常は案件化しない |
| 一般化済み適用知識 | feedback inboxで検査後に昇格 |

## Knowledge feedbackとの境界

一般GitHub feedbackはpublic productの問題・提案を扱う。knowledge feedbackは、適用先で得た知識を匿名化・一般化し、成立条件とevidenceを付けて移送する。同じ論点はlinkしてもcontentを無条件コピーしない。

## Response

best effortで対応し、SLAを設けない。情報不足では必要項目を具体化し、duplicateはcanonical Issueを示す。inactivityだけで自動closeしない。

comment、label変更、transfer、close / reopen、mergeはそれぞれexternal writeであり、初期運用ではexact previewとaction-time approval後に実行する。
