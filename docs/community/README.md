# Community Intake

| Intake | Initial label | Maintainer route |
| --- | --- | --- |
| Bug | `type: bug` | MNT候補。未リリース能力はEpic候補 |
| Documentation | `type: documentation` | MNTまたはEpic |
| Feature | `type: feature` | Epic候補 |
| Project Model | `area: project-model` | Epic候補 |
| Technology Profile | `area: technology-profile` | EpicまたはMNT |
| Question | `type: question` | Q&A。通常はwork lineなし |
| Security / private risk | public処理を止めprivate route | security / privacy response |

すべてのIssueは`status: needs-triage`から開始する。label候補は[github-labels.json](./github-labels.json)、詳細routingは[Contribution Routing](../REF/REF_reference_contribution_routing.md)を正本とする。JSONを追加しただけではGitHub上にlabelは作成されない。
