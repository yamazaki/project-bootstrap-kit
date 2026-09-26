# Change Impact Matrix

最終更新: 2026-09-19

本書は、project-bootstrap-kitの変更を自己管理面と配布面のどこへ反映するかを判断するための参照資料である。

## 1. 判定単位

フォルダ名だけで反映先を決めず、「誰の、どの振る舞いを変えるか」で判定する。判定は案件受付時に仮置きし、実装結果が確定した終了前に再評価する。

| 面 | Yesとなる質問 | 主な反映先 |
| --- | --- | --- |
| Self-management | kit自身の保守方法、判断、記録、自己検証を変えるか | `AGENTS.md`, `docs/`, 自己検証script |
| New distribution | 新規適用先が最初から受け取るべきか | `boilerplate/` |
| Existing adopters | 既存適用先にも導入・移行判断が必要か | `upgrades/`, `UPGRADE_GUIDE.md` |
| Technology-specific distribution | 特定技術を選択した適用先だけに必要か | `profiles/` |
| Distribution engine | 初期化、upgrade、検証、feedback検査の実行挙動を変えるか | `scripts/`, 必要な共通ライブラリ |
| Contract and reference | 恒久契約、設計判断、利用手順の正本更新が必要か | `docs/SPEC`, `docs/ADR`, `docs/REF` |

## 2. 判断手順

1. 変更後に観測可能な結果を列挙する
2. 結果ごとに利用者がkit管理者か、適用先プロジェクトかを分ける
3. 新規適用先と既存適用先を分ける
4. 技術共通かprofile固有かを分ける
5. 実行機構と文書契約の変更要否を分ける
6. 各面のYes / No、理由、対象ファイルを件別記録へ残す
7. 実装後に差分を基に再判定する

## 3. 代表例

### ChangeLog運用を追加する場合

- Self-management: Yes。kit自身の変更履歴にも必要なため、root `CHANGELOG.md` と自己用version文書へ反映する
- New distribution: Yes。新規適用先に `CHANGELOG.md` と運用規則を配布する
- Existing adopters: Yes。既存適用先へ安全に追加するupgradeが必要
- Technology-specific distribution: No。特定profileに限定されない
- Distribution engine: Yes。初期化・検証・upgrade処理が変わる
- Contract and reference: Yes。versioningと初期化契約を更新する

この例では両面への反映が正しい。ただしroot用ChangeLogと配布用ChangeLogは読者と記録対象が異なるため、同一ファイルの同期コピーにはしない。

### kit自身の作業線を整備する場合

- Self-management: Yes
- New distribution: No。配布先には既に一般用の作業線があり、kit固有のSELFは不要
- Existing adopters: No
- Technology-specific distribution: No
- Distribution engine: No
- Contract and reference: Yes。kit自身の設計判断と運用正本を更新する

### 特定profileの制約を更新する場合

- Self-management: 通常はNo。ただしprofile管理手順自体を変える場合はYes
- New distribution: profile選択時のみYes
- Existing adopters: 既存利用者が判断・移行を必要とする場合だけYes
- Technology-specific distribution: Yes
- Distribution engine: profile schemaや展開方法を変える場合だけYes
- Contract and reference: profile契約や運用手順を変える場合だけYes

## 4. ChangeLogへの記録

release節では変更を次に分ける。

- `Distribution`: 適用先が受け取る機能、配布契約、profile、upgrade、配布機構の変更
- `Self-management`: kit自身の管理規範、自己検証、内部文書運用の変更

両方へ影響する変更は、それぞれの観測可能な結果を別の箇条書きとして記録する。同じ文を重複させず、各読者への影響が分かる表現にする。
