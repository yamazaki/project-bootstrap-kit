# 媒体別の確認

対象の環境・規格・数値はprojectの採用条件と利用時点の公式一次情報で定める。本資料から具体clientの互換性やplatform対応を推測しない。

## web

対象browser・viewport、実際の日本語・情報量・状態、keyboard / focus、拡大、主要導線を確認する。スマホ向けWebはwebの確認条件に含められる。自動検査で分かる問題と、人が見る構図・読みやすさを分けて記録する。

## native-mobile

対象OS・platformとemulator / simulator / 実機の別を明記する。navigation、入力・戻る操作、文字拡大・状態変化を採用環境で確認する。HTMLモックだけなら、方向性の確認とnative未確認を分ける。

## html-email

生成HTMLと対象clientを指定する。読む順序、画像の代替情報、リンク先、幅・折返し等を確認する。plain text版が要求される場合も確認する。browser preview、実client、画像あり / なし等の条件を区別し、未確認clientを残す。送信依頼がなければ実送信は行わない。
