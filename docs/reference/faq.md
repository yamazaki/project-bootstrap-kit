# FAQ

## これはapplication templateですか

完成したapplication codeを配るtemplateではない。文書体系、AIの行動規範、planning、approval、state、upgradeの管理骨格を導入するkitである。

## どのProject Modelを選びますか

実装とreleaseが主成果ならdevelopment、文書・調査・継続業務が主成果ならtask-workspaceを選ぶ。[Model選択guide](../guides/choosing-a-project-model.md)を参照する。

## Modelを省略するとどうなりますか

developmentを選択する。既存projectの構成からtask-workspaceを自動推定しない。

## Project Name、Slug、Product Nameの違いは何ですか

Project Nameは人向け名称、Project Slugはlowercase kebab-caseの機械識別子、Product Nameはdevelopmentで使う製品・serviceの人向け名称である。

## Technology Profileは必須ですか

developmentでは任意。採用技術が確定した後に追加できる。task-workspaceは現在対応しない。

## 既存repositoryへ直接適用できますか

非空repoへ通常initは行わない。`--adopt-existing`でread-only planを作り、pathごとに判断する。

## 既存fileは上書きされますか

同名差分はCONFLICTとなり、自動上書きしない。replaceまたはmanual mergeには明示判断が必要である。

## kitを更新するとproject固有変更は消えますか

stateとbaselineから3-way判定する。ownershipとlocal変更を無視して一律上書きしない。

## task-workspaceからdevelopmentへ変更できますか

現在は自動Model変更CLIがない。context、outputs、sessionsを保持し、development assetを追加してAGENTS等をmanual mergeするreview可能なmigrationが将来必要になる。

## 生成projectのlicenseはMITになりますか

project全体のlicenseは利用者が選ぶ。kit由来部分のMIT全文は`.project-bootstrap/licenses/project-bootstrap-kit-MIT.txt`へ分離して生成する。

## AIがcommitやpushまで自動実行しますか

file変更、commit、push、Release、deployは別の承認境界である。repository規則と利用者の明示指示に従う。
