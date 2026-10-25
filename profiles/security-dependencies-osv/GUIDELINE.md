# OSV Dependency Scan

OSV-Scannerの固定release binaryとprovenanceを使うtooling profile。profile配置だけではinstallやscanを行わない。

共通security-gateで対象lockfile / SBOM、直接・間接依存、公開artifact、network modeを示す。承認後に公式releaseの固定hash・sizeを検証し、project-localのversion別領域へ配置する。既存binaryは同じpinを検証できる場合に再利用する。global PATHやpackage managerを変更しない。

onlineはOSV等へのpackage名・version等の送信を説明し、offlineはDBを別工程で準備して取得日時を記録する。完全offlineとoffline-vulnerabilitiesを混同しない。初期adapterはlockfile / SBOM、JSON、通常のscanだけを扱い、fixや実験的解析、container実行は含めない。

0 / 1と有効な全package inventoryを検証し、失敗・未対応・対象なしを0件にしない。severityやCVSSは原本を保持し、不明なseverityはreviewへ送る。該当advisoryは自作codeの悪用成立を証明するものではない。

固定2.7.0の実試行では`OSV_SCALIBR_LOCAL_DB_CACHE_DIRECTORY`と`osv-scalibr/<ecosystem>/all.zip`を使うことを確認した。DBのhashと取得日時をplanへ固定し、更新したら再planする。公開されている他OSのbinaryと、実行を検証済みのOSは区別する。
