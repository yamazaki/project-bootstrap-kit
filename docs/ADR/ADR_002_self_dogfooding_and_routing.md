# ADR 002: 自己管理を専用作業線でドッグフーディングする

- Status: Accepted
- Date: 2026-09-19

## Context

project-bootstrap-kitはすでに複数プロジェクトへ適用されており、初期開発フェーズよりも、独立した機能追加、保守、運用確認、適用先からのfeedback取込が中心になっている。一方、配布先へ提供する文書運用は発展してきたが、kit自身の管理には十分適用されていなかった。

配布用 `boilerplate/` をkit自身へ展開すると、自己用 `AGENTS.md` や `docs/` と配布用テンプレートが衝突する。また、継続的な `PLAN_PHASE_CURRENT.md` を置くと、独立案件中心の現状と一致しない。

## Decision

- kit自身は、配布ファイルの自己展開ではなく、同じ運用原則をkit固有文書へ適用する
- Epic / MNT / OPS / ADVにSELFを加え、独立案件として管理する
- SELFは配布能力を変えない自己管理に限定する
- SELFから配布変更が必要になった場合はEpicまたはMNTへ分離する
- 通常運用では `PLAN_PHASE_CURRENT.md` を必須にせず、各作業線の索引と件別記録を使う
- knowledge feedbackは独立した受付経路とし、採用後に適切な作業線へ昇格する
- 変更ごとに6面のimpact matrixを受付時と終了前に評価する
- `verify-project-init.mjs` は配布先検証に限定し、kit自身は `verify-kit-repository.mjs` で検証する
- ChangeLogは `Distribution` と `Self-management` を区別する

## Consequences

- kit自身と配布用テンプレートを混同しにくくなる
- 共通概念には自己用・配布用の複数表現が生じるため、impact matrixと検証で意図的に整合を管理する必要がある
- 大規模な複数フェーズ開発が再び必要になった場合は、対象Epicの中で個別計画を追加する
- SELFは配布先へ追加しない。一般プロジェクトの自己管理は既存のEpic / MNT / OPS / ADVで扱う

## Rejected alternatives

- `init-project.mjs` をkit自身へ実行する: 自己用と配布用の同名ファイルが衝突する
- root `docs/` を `boilerplate/docs/` と自動同期する: 読者、責務、具体的な内容が異なる
- 常設のフェーズWBSを導入する: 現在の独立案件中心の保守形態と一致しない
