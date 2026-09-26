# 05 Release Readiness

## 目的

「実装が終わった」状態と「配布・production移行してよい」状態を分けて確認する。

## 確認項目

- release対象と非対象
- version正本、ChangeLog、Upgrade Guideの整合
- fresh installとexisting upgrade
- production設定、Secret、権限、費用
- data migrationとrollback
- monitoring、incident response、owner
- documentationとsupport導線
- tag、Release、deploy等の外部操作承認

## 切替判断

production切替は、local acceptanceやrelease candidate作成とは別の判断である。exact artifact、対象環境、影響、停止条件、read-back方法を提示して承認を得る。

## 完了の目安

- release candidateが固定されている
- 未解決riskと受容理由が記録されている
- rollbackまたはforward-fix方針がある
- production後の保守入口が決まっている
- 利用者がrelease / deployを承認している
