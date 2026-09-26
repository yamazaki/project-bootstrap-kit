---
name: feedback-preparation
description: Prepare a privacy-safe question, bug, documentation, feature, Project Model, Technology Profile, or security report for project-bootstrap-kit before any public submission.
---

# Feedback Preparation

公開Issue、Pull Request、security reportの下書きを、送信せずにreview可能な形へ整える。

## Workflow

1. 報告種別をquestion / bug / documentation / feature / project-model / technology-profile / securityから選ぶ。
2. repositoryからkit version、Project Model、AI surface、関連pathをread-onlyで確認する。
3. expected / actual、最小再現手順、確認済みevidenceを整理する。
4. Secret、credential、個人・会社情報、private URL / path、実在顧客・tenantを除去する。
5. 匿名化によって再現性が失われる場合は、公開用下書きを完成扱いにせず停止する。
6. security、credential、private情報の可能性があればpublic Issue用下書きを作らず、SECURITY.mdのprivate routeを案内する。
7. 投稿先templateに合わせたMarkdown previewを提示する。
8. 利用者が内容と公開範囲を確認するまで外部送信しない。

入力がJSONとして整理できる場合は`scripts/prepare-feedback.mjs <input.json>`で決定的なpreviewを生成する。scriptがprivacy errorまたはsecurity routeを返した場合は値を表示せず停止する。

## Boundaries

- Issue、PR、comment、emailを作成・送信しない。
- 推測したversion、identity、email、URLを記載しない。
- raw logやchat全文を貼らず、必要な最小evidenceだけを使う。
- knowledge feedbackは、適用先知識を一般化してkitへ移送する別workflowである。通常のbug reportをknowledge feedbackへ変換しない。
- security reportの詳細をpublic previewへ出さない。

## Output

- Report type
- Public-safe title
- Context: version / Model / AI surface
- Expected / actual
- Reproduction or proposal
- Public-safe evidence
- Removed or generalized informationの分類だけ（raw valueは記録しない）
- Suggested intake route
- External action: not performed
