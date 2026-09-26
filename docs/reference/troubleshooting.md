# Troubleshooting

## Target repository is not empty

原因: 通常initを非空repoへ実行している。

対応: `--force-overwrite`を使わず、[existing adoption](../guides/existing-project-adoption.md)でplanを作る。

## Invalid project slug

原因: `--project-slug`がlowercase kebab-caseでない。

対応: `example-project`の形式で明示する。Project Nameから暗黙推定しない。

## Legacy naming arguments are no longer accepted

原因: 旧CLIの`--project-name <slug> --product-name <display>`だけを指定している。

対応: 人向けProject Nameを`--project-name`、機械識別子を`--project-slug`へ明示する。

## Technology Profile is not applicable

原因: 選択Modelがprofileに対応しない。現在のtask-workspaceはprofile非対応。

対応: Model選択を確認する。非対応profileを黙って無視したり、manifestを直接編集したりしない。

## Fresh init requires a clean kit checkout

原因: kit checkoutに未commit変更またはuntracked fileがある。

対応: diffとstatusを確認し、変更を適切にcommit、退避、または除外してcleanな固定HEADから再実行する。

## Plan is stale

原因: scan後にtarget、kit HEAD、manifest、baseline、plan evidenceが変わった。

対応: 古いplanを編集して回避せず、現在状態から再scanする。

## Bootstrap state integrity does not match

原因: stateが手動変更されたか、書込みが不完全な可能性がある。

対応: stateを直接修正せず、Git履歴とadoption記録を確認する。必要なら既知の正常commitへ戻し、対応するmigrationまたはupgradeを再実行する。

## Baseline object is missing or mismatched

原因: `.project-bootstrap/baselines/`が欠落または破損している。

対応: Gitで管理されたbaselineを正常な履歴から復元する。別projectや別versionのbaselineで置き換えない。

## Upgrade feature is not applicable to the Project Model

原因: development専用featureをtask-workspaceへ実行している。

対応: stateのProject Modelを確認する。Model変更が必要なら通常upgradeとは分けて計画する。

## Verification shows template warnings

初期生成直後のROADMAPやplanに未記入templateが残ると警告される。失敗ではないが、実装開始前にproject固有内容へ更新する。
