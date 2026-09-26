# ADR 004: private改善元から独立public repositoryを生成する

- Status: Accepted
- Date: 2026-09-22
- Scope: project-bootstrap-kit publication and contribution flow
- Related: EPIC-4 / P0.3.02 / P0.3.03

## 1. Context

rename前の `the former private repository` はprivate repositoryであり、過去のcommit、branch、tag、metadata、作業文書を保持したまま継続的に改善していた。これをそのままpublicへ変更すると、公開対象外file、過去のprivate情報、commit metadata、Issue / Pull Request / Actions履歴を公開する可能性がある。

一方、公開後にIssueやPull Requestを受け付ける場合、privateからpublicへの一方向mirrorだけでは、public contributionが次回同期で失われるか、private側へ反映されない問題が生じる。

## 2. Decision

### 2.1 Repository identity

- private repositoryは2026-09-22に `private source repository` へrenameした
- 新しいindependent public repositoryは `project-bootstrap-kit` とする
- GitHub Fork networkは使用しない
- rename後、current cloneの`origin`とa consuming projectの`bootstrap-kit` remoteを新URLへ更新し、PRIVATE visibilityとremote `main`のread-backを確認した
- rename、public作成、push、tag、Releaseはそれぞれ外部操作として実行時承認を得る

### 2.2 Public export

- private repositoryを当面の継続改善元とする
- public repositoryは審査済み配布先とする
- public対象はallowlistで定義し、未知pathはdefault denyとする
- clean exportから独立した新しいGit historyを開始する
- privateのcommit、branch、tag、Git object、Issue、Pull Request、Actions artifactを持ち込まない
- private branchのmerge、mirror push、履歴を伴うsubtree splitをpublic反映手段にしない
- exportはsource repositoryを変更しないread-only生成、dry-run、diff、stale source検出を備える

### 2.3 Public contribution

- public Issue / Pull Requestを正規のfeedback入口として受け付ける
- public contributionは元PR、author、license attributionを保持したclean patchとしてprivateへ取り込む
- private側の正本、test、docsへ統合した後、次回clean exportでpublicへ反映する
- 二重適用、exportによるpublic変更消失、private未反映を防ぐ状態管理を設ける
- Issue / PR作成、comment、merge、close等のexternal writeをskillが無承認で実行しない
- contribution量が増えた場合、公開資産の正本をpublic側へ移す判断点を設ける

### 2.4 License

- public repositoryの第一licenseをMITとする
- copyright noticeは `Copyright (c) 2026 project-bootstrap-kit contributors` とする
- generated project全体のlicenseは利用者が選択する
- kit template由来部分のMIT attributionを生成先で追跡できるようにする
- 具体的なNOTICE配置とgenerated output契約はPhase 2のSPECで確定する
- contributorからの変更はprojectと同じMIT条件で提供されることをPhase 5の`CONTRIBUTING.md`へ明記する

## 3. Rename constraint

GitHubはrepository rename後の旧URLをredirectするが、旧名称 `project-bootstrap-kit` で新しいpublic repositoryを作ると、private新名称へのredirectへ依存できなくなる。

したがってpublic作成前に、少なくとも次を新しいprivate URLへ更新する。

- private repository local cloneの`origin`
- a consuming projectの`bootstrap-kit` remote
- inventoryで見つかる他clone、automation、document、GitHub Actions参照

local directory `the private local checkout` はrepository renameと同時に変更しない。

## 4. Alternatives

### 4.1 現private repositoryを直接publicにする

不採用。過去履歴とGitHub上の付随情報まで公開対象になり、公開境界をallowlistで制御できない。

### 4.2 private repositoryのGitHub Forkとしてpublicを作る

不採用。Fork networkはvisibilityとGit dataを共有するため、private改善元とclean public履歴の境界に合わない。

### 4.3 private branchをpublicへmergeまたはmirror pushする

不採用。private commit metadataと履歴をpublicへ運ぶ可能性があり、公開前審査をtree単位で閉じられない。

### 4.4 public名称を `project-bootstrap-kit-public` とする

不採用。private renameに伴う作業は減るが、公開product名が冗長で、利用者向けidentityとして劣る。

## 5. Consequences

- private履歴を公開せず、public treeを再現可能に審査できる
- private renameと全依存remote更新をpublic作成前に完了する必要がある
- public contributionをprivateへ取り込む追加運用が必要になる
- publicとprivateのversion、source commit、tree digest、contribution mappingを追跡する必要がある
- public側を独立repositoryとしてsecurity、ruleset、Issue、Release設定する必要がある
- old repository nameをpublicへ再利用した後は、redirectに依存したrollbackができない

## 6. Follow-up

- private rename後に残るold URL参照と外部integrationをPhase 1でも再確認する
- Phase 1でallowlist、public export、provenance、contribution mapping契約を確定する
- Phase 5でIssue / PR / security / knowledge feedbackの受付とtriageを実装する
- Phase 6でclean export、secret / private情報 / license検査、local Release Candidateを作る
- Phase 7で明示承認後にpublic repositoryを作成し、初回同期を実証する
