# Design Philosophy

## 1. このkitが解決する問題

開発や継続作業では、コードや成果物だけでなく、次の判断が時間とともに失われやすい。

- 何を正本として読むか
- 何を実装前に決めるか
- 変更をどこへ記録するか
- どの操作に人の承認が必要か
- 作業を別sessionや別担当へどう引き継ぐか
- 運用開始後に、計画開発と保守・障害対応をどう分けるか

`project-bootstrap-kit`は、これらをrepository内の文書、state、skill、検証手順として導入する。目的は判断そのものの自動化ではなく、判断材料と承認境界を追跡可能にすることである。

## 2. Common Core

用途が異なっても、次の原則をCommon Coreとして扱う。

- 目的、対象、非対象を明示する
- currentな正本と作業中の記録を分ける
- 事実、evidence、解釈、仮説を混同しない
- file変更、commit、push、外部操作を別の承認境界として扱う
- Secretやprivate情報を必要以上に保存しない
- 失敗時の停止条件とrollbackを先に決める
- session継続に必要なhandoffをrepositoryへ残す
- 作業中の思いつきを直ちに仕様へ昇格させない

Project Modelは、このCommon Coreを用途に合う文書とlifecycleへ具体化する。

## 3. 選択可能な構造

すべてのprojectへ同じ文書量を要求しない。

- `development`: product、service、toolなどの計画・実装・release・production運用
- `task-workspace`: 文書、調査、継続業務、成果物とsessionの管理
- Technology Profile: runtimeやintegrationなど技術固有の差分
- AI surface: Codex、Claude Code、Rovo向けのskill配置

Project Model、Technology Profile、AI surfaceは別の軸である。非対応の組合せを黙って無視しない。

## 4. このkitが決めないこと

- productの業務要件や優先順位
- 採用技術、費用、security要件
- productionへの公開可否
- 外部送信、応募、投稿、削除等の実行判断
- project固有のlicense
- review結果や受入判断

AIは候補、差分、検証結果を提示できるが、project固有の重要判断を利用者に代わって確定しない。

## 5. Fail closed

Model、path、state、baseline、planが曖昧なときは推測で続行せず停止する。停止は失敗ではなく、既存file、履歴、外部状態を守るための正常な境界である。
