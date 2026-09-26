# Known Limitations

## Initial public scope

- Project Modelはdevelopmentとpreview task-workspaceの2つ
- 1 projectにつき1 Model
- Model変更は自動化していない
- task-workspaceはTechnology Profile非対応
- 既存upgrade featureはdevelopment向け
- task-workspaceのstable昇格は初回公開範囲外

## Distribution

- public repositoryはprivate sourceからclean exportする設計であり、private Git履歴を共有しない
- full public exporter、scanner、Release Candidate検証は公開準備Phaseで実装する
- public repository作成、push、tag、Releaseはlocal生成とは別の承認が必要

## Assets

初回export contractではregular text fileを中心とし、executable、symlink、submodule、LFS pointer、binary、archive等は既定BLOCKEDとする。

## Language

日本語文書を唯一の完全正本とする。初回英語は短いsummary / navigationに限定し、英語全文の同期を保証しない。

## Compatibility

`0.x`期間中は、移行手段を伴う契約変更をMINORで行う場合がある。Upgrade Guideとstate migrationを確認する。

## No automatic product decisions

業務要件、採用技術、費用、security、production公開、project licenseをkitやAIが自動決定しない。
