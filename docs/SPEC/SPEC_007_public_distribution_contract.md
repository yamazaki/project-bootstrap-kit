# Public Distribution Contract

最終更新: 2026-09-23
Status: Accepted

## 1. 目的

private source repositoryから、private履歴とprivate情報を持ち込まない独立public repository用treeを、再現可能かつreview可能に生成する契約を定義する。

## 2. Scope

本契約は次を扱う。

- source pathのpublic / transformed / private分類
- public export manifest
- path、asset、collisionの検証
- scan、plan、materialize
- deterministic public tree
- private / public provenanceとversion対応
- LICENSE / NOTICE / generated project attribution
- public contributionのprivate sourceへの還流
- Git commit、push、merge等の承認境界

本契約はexporter実装、GitHub repository作成、Project Model実装、secret scanner選定を完了させるものではない。

## 3. Authority

- kit versionの唯一の正本はprivate `private source repository`の`VERSION`
- 対応するpublic `project-bootstrap-kit` releaseは同一versionを使用する
- public専用SemVer suffixを設けない
- full export manifestとprivate release ledgerはprivate source repositoryの正本とする
- public treeはpublic provenance、public Git commit、tag、Releaseで追跡する
- path分類の設計根拠はEPIC-4 Phase 1 evidenceを参照する

## 4. Source classification

source commitの全tracked pathは、次のいずれか一つに一致しなければならない。

1. `direct`
   - source bytesを変更せずpublic targetへ置くexact file mapping
2. `transformed`
   - version固定のdeterministic transformerでpublic専用assetを作るmapping
3. `private`
   - publicへ出さないexact pathまたはprefix

Rules:

- directとtransformedはexact source pathで列挙する
- public directory globと暗黙recursive includeを禁止する
- privateだけprefix ruleを許可する
- unclassifiedまたは複数分類pathが1件でもあればBLOCKED
- manifest作成時のHEAD全pathでcoverageを再計算する

## 5. Public target ownership

public targetは次へ分類する。

- `exporterOwned`
  - direct、transformed、generatedから生成するfile
- `publicOwned`
  - public repositoryだけで管理すると明示したexact file
- `platformState`
  - Issue、PR、Discussion、Release、repository settings、Actions history等の非file state

Rules:

- 同一targetを複数ownershipへ登録しない
- exporterはpublicOwnedを更新・削除しない
- exporterはGitHub APIを呼ばずplatformStateを変更しない
- exporterOwnedがpublicで手動変更されている場合はCONFLICTとする

## 6. Manifest requirements

manifestはversioned schemaとして少なくとも次を持つ。

- schema version
- contract version
- direct entries
- transformed entriesとtransformer version
- private exact / prefix entriesとreason
- generated entriesとgenerator version
- publicOwned exact paths
- forbidden targets

full manifestはprivate情報を含むためpublicへexportしない。public provenanceへはkit version、contract version、manifest digest、exporter version、public tree digestだけを出す。

## 7. Path validation

source / target pathはrepository rootからのrelative POSIX pathとし、次を禁止する。

- absolute path
- 空path
- `.` / `..` segment
- NUL
- backslash separator
- target root外への正規化
- exact target重複
- case-insensitive collision
- Unicode normalization後のcollision
- file / directory prefix collision
- forbidden target

source path欠落、rename、削除はmanifest staleとしてBLOCKEDにする。

## 8. Asset policy v1

v1で許可するasset:

- explicit entryを持つregular file mode `100644`
- explicit entryを持つempty regular file

v1でdefault BLOCKEDとするasset:

- executable `100755`
- symlink
- submodule / gitlink
- Git LFS pointer
- binary
- archive
- device / FIFO / socket

許可typeを増やす場合は、scanner、copy semantics、digest、rollbackを契約へ追加する。

## 9. Deterministic export

public treeは次だけで決定する。

- source commit tree bytes
- manifest bytes
- exporter / transformer / generator version
- 固定したencoding、mode、sort、digest規則

wall clock、local path、username、hostname、mtime、network response、secret、GitHub stateへ依存してはならない。

public tree digestはtarget path、mode、content SHA-256をpath順にcanonical連結してSHA-256を計算する。provenance file自身はdigest循環を避けるためscopeから除外し、そのscope IDをpublic provenanceへ記録する。

## 10. Scan / plan / materialize

### Scan

- source commit treeをread-onlyで検査する
- coverage、asset、path、collision、transformer availabilityを確認する

### Plan

少なくとも次の状態を扱う。

- `ADD`
- `UPDATE`
- `DELETE(EXPORTER-OWNED)`
- `SKIP(SAME)`
- `KEEP(PUBLIC-OWNED)`
- `CONFLICT(PUBLIC-MODIFIED)`
- `BLOCKED`

planはsource commit / tree、manifest digest、tool version、target fingerprintを固定する。

### Materialize

- clean source checkoutを必須とする
- untracked fileがあれば既定BLOCKEDとする
- `HEAD == sourceCommit`とmanifest / tool一致を確認する
- empty staging directoryへ生成する
- arbitrary non-empty directoryやpublic checkoutへ直接書かない
- stale planを拒否する
- Git commit / pushを行わない

## 11. Provenance and version

Private ledgerはsource commit / tree、manifest digest、tool version、public tree digest、public commit / tagを保持する。

Public provenanceはprivate URL、private commit SHA、local path、private reasonを含めない。

Rules:

- private / publicの対応release versionを一致させる
- public tagは `v<kit-version>`
- 同じversionへ異なるpublic treeを割り当てない
- private Self-managementだけが変わりpublic treeが同一なら新しいpublic releaseを作らない
- public treeが観測可能に変わる場合はprivate側でversion / ChangeLog判断を行う

## 12. License and attribution

Public rootへ次を置く。

- `LICENSE`
  - 標準MIT全文
  - `Copyright (c) 2026 project-bootstrap-kit contributors`
- `NOTICE.md`
  - license概要
  - generated attribution方針
  - 実在するbundled third-party asset
  - public provenanceへの案内

Generated projectではroot `LICENSE`を作成・上書きしない。kitのfull MIT textを次へ置く契約案をPhase 2へ引き継ぐ。

```text
.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt
```

`docs/BOOTSTRAP_ADOPTION.md`からkit versionと上記noticeを参照する。

## 13. Public Git boundary

- public repositoryはparentを持たないroot commitから開始する
- private commit、author history、message、branch、tag、Git notesを持ち込まない
- default branchは`main`
- commit identityは利用者承認済みpublic GitHub noreply identityを使用する
- force pushとtag移動は原則禁止する
- repository作成、commit、push、tag、Releaseはmaterializeと別工程とする

## 14. Public contribution sync

public PR changed pathはmanifest ownershipへ照合する。

- direct: U0 / U1 / L1 3-way判定後にclean patch候補
- transformed: private source / transformerへmanual translation
- generated: generator / input変更として再実装
- publicOwned: public側で処理しprivate import不要
- unknown / forbidden: BLOCKED

Clean patch bundleはPR URL / number、base / head SHA、author public identity、patch digest、ownership、mapped source、decision、status historyをprivate側で保持する。

PR head、manifest、private pathが変わった場合はstaleとして再planする。同じbundle / digestを二重適用しない。

## 15. Contribution status and completion

少なくとも次の状態を扱う。

- `RECEIVED`
- `REVIEWED`
- `IMPORT_PLANNED`
- `IMPORTED`
- `PRIVATE_COMMITTED`
- `EXPORTED_MATCH`
- `PUBLIC_MERGED`
- `CLOSED_INCORPORATED`
- `REJECTED`
- `PARTIAL`
- `BLOCKED`

元PRをmergeできるのは、review済みheadが変わらず、private importと再exportが一致し、rights / security / CI / action-time approvalを満たす場合に限る。

manual translation、partial adoption、追加修正がある場合は、取り込み先を説明してincorporated closeできる。comment / merge / closeは外部writeとして個別承認を必要とする。

## 16. Approval boundaries

- read-only scan / intake: 調査として実行可能
- private plan作成: read-only
- private working tree apply: scopeとplan reviewが必要
- private commit: 明示承認が必要
- public comment / review: action-time approvalが必要
- public merge / close / push / PR作成: action-time approvalが必要
- GitHub repository / tag / Release: action-time approvalが必要

一つの承認を他の操作へ流用しない。

### 16.1 Initial granular approval profile

初期運用では、private apply、private commit、public comment / review、public merge / close、public push、tag、Releaseを別操作としてpreviewし、段階的に承認する。

目的は確認回数を増やすことではなく、実際のdiff、commit、comment、tag、Release notesが確定する前に広い承認を取らないことである。

### 16.2 Future grouped approval profile

反復運用で個別承認を分ける実益がないと確認できた場合、利用者の明示判断により1〜3個のapproval bundleへ集約できる。

集約条件:

- bundle内の全操作、target、content、commit SHA、tag、Release notesが確定している
- unknown、REVIEW、BLOCKED、CONFLICT、outcome unknownがない
- 各操作が同じ論理目的とrollback / recovery手順を共有する
- idempotencyと実行後read-backがある
- 一部成功時の停止点と再開方法がある
- 利用者がbundle単位の承認を明示している

集約候補:

1. private integration: apply、test、diff確認、commit
2. public contribution resolution: comment / review、mergeまたはclose、read-back
3. public release: push、tag、GitHub Release、read-back

一つのbundleへさらにまとめる場合も同じ条件を満たす必要がある。成功回数だけを理由に自動で承認範囲を拡張しない。

## 17. Compatibility and migration

- 本SPEC追加だけでは既存adopterを変更しない
- generated attributionはPhase 2でNew distribution / Existing adopters / Distribution engineへの影響を設計する
- public export実装はPhase 6で本SPECとacceptance scenarioへ適合させる
- public contribution workflowはPhase 5 / 7で実装・実証する
- manifest reviewとprivate→public展開のRunbookをPublic Export Operations REFで管理する
- Phase 6でdeterministic scriptとprivate maintainer用`public-release-sync` skillを実装する

## 18. Acceptance

実装は少なくとも次を検証する。

- full path coverageとunknown path BLOCKED
- private prefix exclusion
- path traversal / collision拒否
- unsupported asset拒否
- deterministic materialize
- stale / dirty / untracked拒否
- publicOwned保持とexporterOwned conflict
- private provenanceとpublic provenanceの対応
- private identity非露出
- version / tag / Release一致
- LICENSE / NOTICE / generated attribution
- direct contribution 3-way
- transformed / generated manual route
- stale PR / double import拒否
- fixture PR round-trip

具体例と運用手順はpublic repository layout REFとpublic contribution sync REFを参照する。
