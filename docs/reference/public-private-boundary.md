# Public / Private Repository Boundary

## Authority

- private source repository: 継続的な開発、内部検査、Release Candidate生成の正本
- public repository: review済みdistributionとcommunity受付
- 対応するreleaseは同じkit versionを使用する
- public repositoryはprivate repositoryのforkやmirrorではなく、独立したroot historyを持つ

## Functional parity

同じversionでは、public利用者が使う次の機能をprivate sourceの受入結果と一致させる。

- development / task-workspace Project Model
- Codex / Claude / Rovo skill placement
- fresh init、existing adoption、bootstrap state、upgrade
- Technology Profile
- generated MIT attribution
- community templateとpublic verification

public candidate自身から同じacceptance testを実行し、private sourceだけでtestが通る状態をparityとはみなさない。

## Intentional differences

両repositoryのfile setとGit historyは同一ではない。

Private only:

- internal work records、session、history
- full export manifest、deny dictionary、scanner raw report、release ledger
- exporter、transformer、Release Candidate tooling
- public contributionをprivate sourceへ取り込むtoolとmaintainer skill

Public transformed / generated:

- public contributor向けAGENTS / governance / index
- private事例を匿名化したADR / distribution contract
- public向けChangeLog
- LICENSE、NOTICE、PUBLIC_SOURCE

この差異は機能欠落ではなく、private情報とmaintainer内部操作を公開しないための境界である。

## Sync lifecycle

1. private sourceで変更・test・version判断を行う
2. full manifestからpublic treeを生成する
3. secret、private情報、metadata、license、functional testを実行する
4. local RCを利用者がreviewする
5. 承認後にpublicへ反映する
6. public contributionはattribution付きbundleとしてprivateへ取り込み、次回exportで反映する

privateの最新HEADとpublic releaseは常時一致するとは限らない。対応関係はrelease versionとPUBLIC_SOURCEで判断する。

## Current publication state

Phase 6ではlocal RCまでを作成する。GitHub上のpublic repository作成、push、visibility変更、tag、ReleaseはPhase 7の個別承認後に行う。
