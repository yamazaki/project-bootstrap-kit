# Project Models

Project Modelは、Common Coreを用途に合う文書、skill、lifecycleへ具体化する。1つのprojectは同時に1つのModelを使用する。

| Model | Status | 主な用途 | 主要な管理対象 |
| --- | --- | --- | --- |
| [development](./development.md) | stable | product、service、tool、library開発 | discovery、planning、implementation、test、release、production運用 |
| [task-workspace](./task-workspace.md) | preview | 文書、調査、継続業務、案件成果物 | durable context、outputs、sessions、handoff、external action |

選択に迷う場合は[Choosing a Project Model](../guides/choosing-a-project-model.md)を参照する。

Project ModelとTechnology Profileは別の軸である。現在のtask-workspaceはTechnology Profileに対応しない。Model変更は通常upgradeではなく、別のreview可能なmigrationとして扱う。
