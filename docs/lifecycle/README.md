# Project Lifecycle

`project-bootstrap-kit`は、project立上げだけでなく、実装、release、production運用、保守、引継ぎまでを一続きのlifecycleとして扱う。

| Stage | 主な問い | Guide |
| --- | --- | --- |
| 1 | 新規生成か既存adoptionか | [Bootstrap and Adoption](./01-bootstrap-and-adoption.md) |
| 2 | 何を、誰のために作るか | [Discovery and Definition](./02-discovery-and-definition.md) |
| 3 | どの順序で、何を着手条件とするか | [Planning and Readiness](./03-planning-and-readiness.md) |
| 4 | 何を実装し、どう受け入れるか | [Implementation and Acceptance](./04-implementation-and-acceptance.md) |
| 5 | 公開・移行してよい状態か | [Release Readiness](./05-release-readiness.md) |
| 6 | production後の保守・障害・改善をどう扱うか | [Production Operations](./06-production-operations.md) |
| 7 | 完了した計画と知識をどう引き継ぐか | [Transition and Archive](./07-transition-and-archive.md) |

すべてのprojectが各Stageを同じ深さで実施する必要はない。ただし、対象外にする場合は理由を残し、承認、Secret、test、rollback、完了条件は省略しない。

task-workspaceは実装・release中心のStage 3〜6をそのまま適用せず、durable context、output、external action、session handoffを中心に同じ原則を使う。
