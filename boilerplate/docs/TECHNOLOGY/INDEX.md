# Technology Profiles Index

- Status: Active
- Scope: Global
- Source of Truth: Yes
- Owner: Engineering
- Owner WBS: 0.1
- Promotion Target: Retain-in-Work
- Supersedes: N/A

本書は、このプロジェクトで選択したTechnology Profileと参照先の索引である。

## 1. 選択済みprofile

<!-- technology-profiles:start -->

選択済みprofileはない。

<!-- technology-profiles:end -->

## 2. 参照方法

1. 設計・実装・レビュー対象に関係するprofileを本書で確認する
2. `docs/TECHNOLOGY/ADOPTION.md` でプロジェクト固有の採否と差異を確認する
3. 対象profileの `GUIDELINE.md` を読む
4. 必要な場合だけ `REFERENCE.md` を読む
5. limits、pricing、API、設定仕様など変動する事実は公式一次情報で再確認する

## 3. 優先順位

- 変動するplatform仕様と利用可否は、利用時点の公式一次情報を優先する
- プロジェクト固有の採否と許容リスクは `ADOPTION.md`、`SPEC`、`ADR` を正本とする
- profileの `GUIDELINE.md` は、選択した技術に関する共通の実装原則として扱う
- `REFERENCE.md` は経験知と判断材料であり、全項目を機械的に採用しない

## 4. profile追加

WORK/0.1や実装・運用の途中で技術を追加する場合は、project-bootstrap-kitのcheckoutで実行する。

`docs/BOOTSTRAP_STATE.json`がschema 2の場合は、選択の登録をpreviewする。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --update-technology-profiles --add <profile-id> \
  --reason "追加する理由"
```

確認後に同じcommandへ`--apply`を付ける。登録はstateの一覧と履歴だけを更新し、文書・skillの配置や受入は行わない。AI surfaceはstateの設定を使う。複数追加は`--add`を繰り返す。

続いてscanし、新profileの文書・skillと本書 / `ADOPTION.md`の差分をreviewする。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo --scan \
  --plan-output /tmp/profile-addition/plan.json
```

`NEW_UPSTREAM_PATH`は内容を確認して`--accept-path-decision <plan> --path <path> --decision add --reason "追加理由" --confirm`で承認する。既存の独自編集は1ファイルずつ統合し、`manual-merged`で受け入れる。既に存在する未登録ファイルも`manual-merged`で内容を保持できる。同一内容の既存ファイルは`add --confirm`または`manual-merged`で受け入れるとkit-managedとなる。本書 / `ADOPTION.md`がkit-managed / managed-merge / project-ownedの`UPSTREAM_CHANGED`で、localが受入済みupstreamとhash / kind / mode一致なら、`safe-update --confirm`を使える（ownershipは保持）。固有編集を含むmanaged-mergeはmanual-mergedで統合し、project-ownedはmanual-mergedでも保持する。scanのallowedDecisionsとownership復帰候補を確認し、不一致の復帰をstate手編集で代替しない。全判断後に`--apply-plan <plan>`を実行し、別pathへの再scanでprofileの追跡を確認する。詳細はkitの`docs/guides/upgrading.md`を参照する。

追跡外profileも同じ登録→scan→review→applyで修復する。stateは手編集しない。登録前のplanは再生成する。schema 1は先に通常scanでmetadata移行する。profile削除はこのCLIの対象外とする。

stateがない旧projectだけ、従来のfeatureをdry-run / diffして確認後に`--apply`を使う。state移行を行う場合はscanに`--technology-profile`を指定してadoption planへ含める。

```bash
node scripts/upgrade-project.mjs \
  --target /path/to/repo \
  --feature technology-profiles \
  --technology-profile <profile-id> \
  --ai-surface <codex|rovo|claude|both> \
  --diff
```
