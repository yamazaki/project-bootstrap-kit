# Tailoring Small Projects

小規模projectでも、すべての文書を同じ深さで埋める必要はない。ただし、規模が小さいことを理由に安全境界まで省略しない。

## 1. 省略または簡略化できるもの

- Phase数を1つにする
- ROADMAPとcurrent planを短くする
- ADRを重大な判断だけに限定する
- Technology Profileを採用技術が確定するまで追加しない
- UIがないprojectでinteraction designを対象外とする
- 小さな変更で独立WBSを作らず、適切なMNT / OPS記録へまとめる

対象外とした理由は短く残す。空欄のまま放置するより「該当なし」と判断した根拠を示す。

## 2. 省略しないもの

- 目的、対象、非対象
- currentな正本
- Secretとprivate情報の扱い
- external actionの承認
- testまたは確認方法
- rollbackまたは回復方法
- 完了条件と利用者review
- sessionをまたぐ場合のhandoff

## 3. Model選択で減らす

文書量を減らすためにdevelopment Modelからfileを無作為に削るより、主成果が文書・調査・継続業務ならtask-workspaceを選ぶ。用途に合うModelを選び、そのModel内で必要な深さを調整する。
