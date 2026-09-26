# Contributing

`project-bootstrap-kit`への質問、問題報告、documentation改善、機能提案、Pull Requestを歓迎します。

## 1. 受付先

- 利用方法の質問: Question form
- 再現可能な不具合: Bug report form
- 文書の問題: Documentation form
- 一般機能: Feature proposal form
- Project Model: Project Model proposal form
- Technology Profile: Technology Profile proposal form
- Security問題: public Issueへ書かず、[SECURITY.md](SECURITY.md)に従う

一般のIssue / PRと、適用先projectから匿名化・一般化したknowledge feedbackは別のworkflowです。

## 2. Issueを作る前に

- 同じ内容のIssueがないか確認する
- 利用中のkit version、Project Model、AI surfaceを確認する
- Secret、credential、個人情報、会社の非公開情報を除く
- 最小の再現手順とexpected / actual resultを整理する

## 3. Pull Request

大きな機能や契約変更は、先にIssueでscopeを確認してください。小さなbug fixやdocumentation改善は直接PRを作成できます。

PRには次を含めます。

- 目的とscope
- 関連Issue
- 変更内容
- 実行したtest
- migration / compatibility / rollback
- documentationとChangeLogへの影響
- security / privacyへの影響
- third-party素材とlicense
- AI支援の有無と、人が確認した内容

private sourceとpublic repositoryは独立しているため、path ownershipによってはmaintainerがprivate sourceやgeneratorへ変更を移し替える場合があります。その場合も元PRとauthor attributionを追跡します。

## 4. Rights and license

PRを提出することで、次を確認してください。

- contributionを提供する権限がある
- contributionをprojectのMIT Licenseで提供する
- third-party code、文章、画像、assetを含む場合は出典とlicenseを申告した
- employerその他の権利を侵害しないことを確認した
- Secret、個人情報、会社の非公開情報を含めていない

初回運営ではCLA、DCO sign-off、暗号学的commit署名を必須にしません。署名commitは任意です。

## 5. AI-assisted contributions

AIをmaterialに使用した場合は、利用範囲と人が確認した内容をPRへ記載してください。tool名、全prompt、会話全文の公開は不要です。

contributorは次を確認します。

- behaviorとtestを人が確認した
- third-party contentとlicenseを確認した
- Secretやprivate情報を不適切に外部AIへ入力していない
- AI出力を未確認のまま提出していない

## 6. Development and verification

変更前に関連するSPEC / ADR / REFを確認します。変更後は少なくとも次を実行します。

```bash
node scripts/verify-kit-repository.mjs
git diff --check
```

配布内容、Model、profile、init、upgradeを変更した場合は、影響するfresh initやupgrade fixtureも確認します。

## 7. Communication

respectfulでconstructiveなやり取りをお願いします。harassment、個人攻撃、差別的表現、脅迫、他者のprivate情報公開を認めません。

maintainerはprojectを安全に運営するため、不適切なIssue、comment、PRを編集、lock、closeできるものとします。初回公開では正式な`CODE_OF_CONDUCT.md`と非公開のconduct reporting窓口を設けません。community規模と運営体制に応じて再検討します。

## 8. Maintainer decisions

すべての提案を採用・mergeすることは保証しません。scope、再現性、互換性、security、保守cost、既存contractとの整合を確認し、追加情報、別実装、部分採用、保留、closeを判断します。
