# Security Assurance Operations

共通契約はSPEC_009、採用判断はADR_005。配布後の手順は`docs/SECURITY_ASSURANCE.md`と`security-gate` skillが正本。

新規developmentには共通gateが常に配布される。最初から両adapterを配置する場合は既存のinit CLIへ`--technology-profile security-audit-cloudflare --technology-profile security-dependencies-osv`を追加する。profileなしでも不足を検出して追加経路を案内する。

既存stateありprojectは共通assetの通常scan / plan、次いでEPIC-7の両profile選択登録→再scan→path受入を行う。stateなし旧adopterはadoptionを優先し、限定導入には`--feature security-assurance --ai-surface <surface> --dry-run --diff`をpreviewする。外部toolは別の承認付き工程で取得する。policyの独自編集は保全し、state JSONは直接書き換えない。

scope、owner、private出力先、network / DB、予算・時間を確定し、planを作る。実際に監査するagentのcapabilityを確認してから導入・実行を承認する。Mantisの未導入を通常の不足として出さず、追加調査として明示された時だけ別planへ進む。

動的検証の環境案内は共通skillの`references/execution-environments.md`へ集約する。現在の担当AIと受入済みの環境を確認し、Codex / Claude / その他の候補を使い分ける。Claudeのcloud sessionやローカルsandboxの公式仕様に基づく案内と、kitでの実動作受入を区別する。Cloud自動作成や他社契約の追加を通常upgradeに含めない。sourceと承認・実行先を結び付けて引き継ぎ、動的結果だけでfull auditを代用しない。

tool更新時はpin、取得origin、license、raw JSON / validator互換性を確認し、両profileの旧version snapshotとversionを更新する。runtime toolをbootstrap stateに登録しない。rollbackではkit側のfile / adoption / state / baselineを同じ退避点へ戻し、runtimeはplanで作った領域だけを扱う。未修正findingと履歴は保全する。

public配布前には更新したexact export manifestから生成したcandidateで自己検証・全公開testを行う。実監査の未確認条件は残riskとして受入記録へ残す。公開操作、tag、release、deployは別承認。
