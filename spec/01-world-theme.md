# 01. 世界観・テーマ仕様

テーマ「Sword, Shield, and Sorcery」の世界観と、それをデータとして保持する `theme/themeConfig.ts` の仕様を定義する。世界観はプレイヤーの没入とアセット制作の指針であり、データモデルは「見た目の完全分離」を実現する土台である。

## 1. 世界観(ナラティブ)

> マナが枯れゆく王国の夜。魔法学院の**見習い魔法使い(Apprentice Mage)**たちは、最後のマナが眠る聖域 **SANCTUM** を目指して荒野を駆ける。
>
> 道中に湧く **Mana Font(マナの泉)** は仲間を呼び寄せ、時の狭間に開く **Chronos Gate(刻の門)** はくぐった者たちを倍に増やす。しかし行く手には石の番人 **Gargoyle Wall(ガーゴイルの壁)** が立ちはだかり、触れた仲間を石に変えて奪っていく。宝を守る **Stone Legion(石の軍勢)** は、刻の門の前に群れをなして立ち塞がる。
>
> そして聖域の扉の前には、最後の試練 **Gate Guardian(門の守護者)** が待つ。集めた魔力のすべてをぶつけて、扉をこじ開けろ——ひとりも残らず石にされてしまう前に。
>
> 群れの先頭を行くリーダーの足元には、導きの**魔法陣**が輝いている。仲間が増えるほど魔力(MANA POWER)は高まり、聖域の扉を開く力になる。

ゲーム内の全要素はこの物語に対応する:

| ゲーム要素 | 世界観上の意味 | プレイヤーが感じるべきこと |
| --- | --- | --- |
| ユニット群 | 見習い魔法使いの群れ | 「自分の仲間」— 増えると嬉しく、減ると惜しい |
| リーダー + 魔法陣 | 群れを導く先導者 | 操作の主体。常に視線が集まる目印 |
| Mana Font(加算) | 仲間が湧き出すマナの泉 | 安心・回復。値が大きいほど嬉しい |
| Chronos Gate(乗算) | 群れを倍化する時の門 | 高揚・ジャックポット感 |
| Gargoyle Wall(減算) | 仲間を石化させる敵壁 | 危険・回避対象 |
| Stone Legion(敵集団) | 刻の門を守る石の軍勢 | 「払う価値があるか」の駆け引き |
| Gate Guardian(ボス) | 聖域の扉を守る最後の試練 | クライマックス。群れの総力戦 |
| ゴールライン | 聖域 SANCTUM の門 | 到達の達成感 |
| MANA POWER | 群れの総魔力 = ユニット数 | スコアであり生命線 |
| ARCANE CHAIN | 正しい判断の連鎖が生む魔力共鳴 | 「読み勝っている」手応え |

## 2. アートディレクション指針(アセット制作者向け)

後日のアセット制作([04-assets.md](./04-assets.md))が世界観からぶれないための指針。プロトタイプのプレースホルダー描画(単色図形)もこのパレットに従う。

- **トーン**: 「夜の荒野を駆けるダークファンタジー」だが、深刻すぎないアーケードの軽快さ。デフォルメ頭身のキャラクターを推奨。
- **ライティング**: 暗い地面に対して、ゲート・ユニット・魔法陣などのゲームプレイ要素が**発光して浮かび上がる**コントラスト設計。視認性がゲーム性に直結するため、装飾よりシルエットの判別を優先する。
- **クローム(ゲーム外周)**: ゲーム領域より一段暗く沈める。装飾はゲーム領域の視認を妨げない静的なもの(石柱・夜空・遠景など)とし、プレイ中に視線を奪う動きを入れない。
- **カラーパレット**(ユーザー指定 + 補完値。補完値はアセット制作時に多少の調整可):

| 用途 | 色 | 指定区分 |
| --- | --- | --- |
| プレイヤーユニット(Apprentice Mage) | Deep Blue `#1d4ed8` | ユーザー指定 |
| 魔法陣グリフの線 | Light Blue `#93c5fd` | 補完 |
| フィーバー時のグリフ発光 | Radiant Gold `#fde047` | 補完 |
| 加算ゲート(Mana Font) | Vibrant Emerald `#10b981` | ユーザー指定 |
| 乗算ゲート(Chronos Gate) | Aether Purple `#8b5cf6` | ユーザー指定 |
| 敵壁(Gargoyle Wall) | Crimson `#b91c1c` | ユーザー指定 |
| 敵集団(Stone Legion) | Bright Crimson `#dc2626` | 補完 |
| ボス(Gate Guardian) | Deep Crimson `#7f1d1d` | 補完 |
| フィールド地色 | 夜闇の紺 `#0f172a` | 補完 |
| フィールドの縞・分割線 | `#1e293b` | 補完 |
| ゴールライン(SANCTUM) | Gold `#fbbf24` | 補完 |
| クローム地色(ページ背景) | 深夜の黒紺 `#020617` | 補完 |

- **形の記号性**: 加算 = 泉(丸・上向きの湧き)、乗算 = 門(アーチ・対称)、敵 = 壁(横に長い塊・牙状シルエット)、敵集団 = 群れ(小さな塊の集合 + 体数バッジ)、ボス = 単体の巨躯。色覚特性があっても形で区別できることを目指す。

## 3. テーマデータモデル(themeConfig.ts の仕様)

### 設計原則

- テーマに属する**文字列・色・画像参照**をすべて `src/game/theme/themeConfig.ts` に集約する。コンポーネント・描画コード・CSS Modules にはテーマ由来のリテラルを一切書かない。
- ゲート種別は文字列リテラルユニオン **`GateKind = "add" | "multiply" | "subtract"`** で表す(enum は tsconfig の `erasableSyntaxOnly` により使用不可)。
- **効果値はテーマではなくゲームバランスに属する**(v2 変更点)。値はスポーン時に抽選され([02](./02-game-design.md) §3)、抽選レンジは `constants.ts` の定数([03](./03-architecture.md) §10)。テーマ側は表記の**接頭辞**(`displayPrefix`: "+" / "x" / "-")だけを持ち、画面表記(例 "+7")はセル生成時に `displayPrefix + 抽選値` として**データ化してセルに保持**する。書式ロジックをコンポーネントに置かない規律は v1 から維持する。
- テーマオブジェクトは型 `ThemeAssetConfig` を満たすことをコンパイル時に検査しつつ、リテラル型が保持される形で default export する(TypeScript の `satisfies` の利用を推奨)。
- 将来のテーマ追加は「`ThemeAssetConfig` を満たす別オブジェクトを default export に差し替える」だけで完結すること。

### 型の構成(フィールド定義)

`ThemeAssetConfig` は以下のセクションを持つ。全フィールド readonly。

**ルート**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `name` | string | テーマ名 |
| `player` | PlayerConfig | プレイヤーユニットの見た目定義 |
| `gates` | Record<GateKind, GateTypeConfig> | 3 種のゲート定義 |
| `enemy` | EnemyConfig | 敵集団(ゲートを守る軍勢)の定義 |
| `boss` | BossConfig | ボス(フィナーレ)の定義 |
| `hud` | HudConfig | HUD の文言 |
| `overlay` | OverlayConfig | 勝敗オーバーレイの文言 |
| `field` | FieldConfig | フィールドの色・文言 |
| `chrome` | ChromeConfig | ゲーム外周(ページ背景・サイドパネル)の定義 |
| `assets` | ThemeAssets(全エントリ optional) | 画像アセット定義。詳細は [04-assets.md](./04-assets.md) |

**PlayerConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `label` | string | ユニット名称(例: "Apprentice Mage") |
| `color` | string | プレースホルダー描画時のユニット塗り色 |
| `glyphColor` | string | リーダー魔法陣グリフの線色 |
| `feverColor` | string | フィーバー中のグリフ発光色 |

**GateTypeConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `kind` | GateKind | 効果種別(add / multiply / subtract) |
| `label` | string | テーマ上の名称(例: "Mana Font") |
| `color` | string | プレースホルダー描画時のゲート色 |
| `displayPrefix` | string | 効果表記の接頭辞("+" / "x" / "-")。表記はセル生成時に `displayPrefix + 値` で合成する |

**EnemyConfig / BossConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `enemy.label` | string | 敵集団の名称(例: "Stone Legion") |
| `enemy.color` | string | 敵集団ユニットのプレースホルダー塗り色 |
| `boss.label` | string | ボスの名称(例: "Gate Guardian") |
| `boss.color` | string | ボスのプレースホルダー塗り色 |
| `boss.hpLabel` | string | ボス HP 表示の見出し(例: "GUARDIAN HP") |

**HudConfig / OverlayConfig / FieldConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `hud.scoreLabel` | string | スコア見出し(例: "MANA POWER") |
| `hud.comboLabel` | string | コンボ見出し(例: "ARCANE CHAIN") |
| `overlay.clearTitle` | string | クリア時のタイトル |
| `overlay.gameOverTitle` | string | 全滅時のタイトル |
| `overlay.retryLabel` | string | リトライボタン表記 |
| `overlay.resultLabel` | string | 残存ユニット数の見出し |
| `overlay.scoreLabel` | string | スコアの見出し(例: "SCORE") |
| `overlay.bestLabel` | string | ベスト記録の見出し(例: "BEST") |
| `overlay.newRecordLabel` | string | ベスト更新時のバッジ文言(例: "NEW RECORD!") |
| `field.backgroundColor` | string | フィールド地色 |
| `field.stripeColor` | string | 縞・中央分割線の色 |
| `field.goalLineColor` | string | ゴールラインの色 |
| `field.goalLabel` | string | ゴールラインに添えるラベル |

**ChromeConfig**(v2 新設。ゲーム外周の見た目)

| フィールド | 型 | 必須 | 意味 |
| --- | --- | --- | --- |
| `backgroundColor` | string | ✓ | ページ全面の地色。画像未定義時はこの 1 色で成立する(プレースホルダー) |
| `backgroundImageSrc` | string | — | ページ全面の背景画像パス。CSS `background-image`(cover)で表示 |
| `sidePanelImageSrc` | string | — | ワイド画面時の左右装飾パネル画像パス |
| `frameBorderColor` | string | — | ゲーム領域とクロームの境界線色。省略時は境界線なし |

クローム画像は Canvas に描かず CSS で配信するため、`SpriteAsset`(論理表示サイズを持つ)ではなく**素の URL 文字列**として持つ。サイズの推奨値は [04-assets.md](./04-assets.md) §3 を参照。

`assets` セクションの型(`SpriteAsset` 等)は [04-assets.md](./04-assets.md) §4 で定義する。

### fantasy テーマの具体値

| パス | 値 |
| --- | --- |
| `name` | `"Sword, Shield, and Sorcery"` |
| `player.label` / `.color` / `.glyphColor` / `.feverColor` | `"Apprentice Mage"` / `#1d4ed8` / `#93c5fd` / `#fde047` |
| `gates.add` | kind `add`、label `"Mana Font"`、color `#10b981`、displayPrefix `"+"` |
| `gates.multiply` | kind `multiply`、label `"Chronos Gate"`、color `#8b5cf6`、displayPrefix `"x"` |
| `gates.subtract` | kind `subtract`、label `"Gargoyle Wall"`、color `#b91c1c`、displayPrefix `"-"` |
| `enemy.label` / `.color` | `"Stone Legion"` / `#dc2626` |
| `boss.label` / `.color` / `.hpLabel` | `"Gate Guardian"` / `#7f1d1d` / `"GUARDIAN HP"` |
| `hud.scoreLabel` / `.comboLabel` | `"MANA POWER"` / `"ARCANE CHAIN"` |
| `overlay.clearTitle` | `"Quest Clear!"` |
| `overlay.gameOverTitle` | `"The Party Has Fallen"` |
| `overlay.retryLabel` | `"Retry"` |
| `overlay.resultLabel` | `"MANA POWER"` |
| `overlay.scoreLabel` / `.bestLabel` / `.newRecordLabel` | `"SCORE"` / `"BEST"` / `"NEW RECORD!"` |
| `field.backgroundColor` / `.stripeColor` | `#0f172a` / `#1e293b` |
| `field.goalLineColor` / `.goalLabel` | `#fbbf24` / `"SANCTUM"` |
| `chrome.backgroundColor` | `#020617`(画像未定義。v2 初期状態は色のみで成立) |
| `chrome.backgroundImageSrc` / `.sidePanelImageSrc` / `.frameBorderColor` | 未定義 |
| `assets` | 初期状態では**空オブジェクト**(全描画がプレースホルダーにフォールバック) |

## 4. 利用側の規約

- コンポーネント・描画コードからは default export されたテーマと型のみを import する(`verbatimModuleSyntax` のため型は type import)。
- ゲートの色・名称・表記接頭辞は必ず `theme.gates[kind]` 経由で参照する。敵壁(Gargoyle Wall)も `kind: "subtract"` のゲートとして同一機構で扱い、敵専用の分岐・色指定を作らない。敵集団は `theme.enemy`、ボスは `theme.boss` 経由。
- CSS へテーマ色・画像を渡す場合は、コンテナ要素の inline style で CSS カスタムプロパティ(例: `--player-color`、`--chrome-bg-color`)として注入する([03-architecture.md](./03-architecture.md) §9)。クロームの optional 値(画像・境界線)が未定義の場合は `"none"` を明示的に注入する(CSS 側にデフォルト値の分岐を持たせない。境界線の注入形式は [03](./03-architecture.md) §9)。

## 5. 検証(ハードコード禁止の確認方法)

実装完了後、以下がともに**ヒット 0 件**であること(themeConfig.ts 以外にテーマリテラルが存在しないこと):

```sh
grep -rnE "#[0-9a-fA-F]{3,8}" src/game --include="*.tsx" --include="*.ts" --include="*.css" | grep -v "theme/themeConfig.ts"
grep -rnE "Mana Font|Chronos Gate|Gargoyle Wall|Apprentice Mage|Stone Legion|Gate Guardian|MANA POWER|ARCANE CHAIN|SANCTUM" src/game | grep -v "theme/themeConfig.ts"
```

注: CSS Modules にはオーバーレイ背景の半透明黒のような**テーマ非依存の chrome 色**(白文字 `#fff`・黒 `#000` 等)は置いてよい。禁止するのはテーマ由来のカラーコードと文字列。1 本目の grep がニュートラル色でヒットした場合は、その色がテーマ非依存であることを確認して合格とする(判断基準: テーマを差し替えたときに変わるべき色か)。
