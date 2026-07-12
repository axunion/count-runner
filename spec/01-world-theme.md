# 01. 世界観・テーマ仕様

テーマ「Sword, Shield, and Sorcery」の世界観と、それをデータとして保持する `themeConfig.ts` の仕様を定義する。世界観はプレイヤーの没入とアセット制作の指針であり、データモデルは「見た目の完全分離」を実現する土台である。

## 1. 世界観(ナラティブ)

> マナが枯れゆく王国の夜。魔法学院の**見習い魔法使い(Apprentice Mage)**たちは、最後のマナが眠る聖域 **SANCTUM** を目指して荒野を駆ける。
>
> 道中に湧く **Mana Font(マナの泉)** は仲間を呼び寄せ、時の狭間に開く **Chronos Gate(刻の門)** はくぐった者たちを倍に増やす。しかし行く手には石の番人 **Gargoyle Wall(ガーゴイルの壁)** が立ちはだかり、触れた仲間を石に変えて奪っていく。
>
> 群れの先頭を行くリーダーの足元には、導きの**魔法陣**が輝いている。仲間が増えるほど魔力(MANA POWER)は高まり、聖域の扉を開く力になる——ひとりも残らず石にされてしまう前に。

この 3〜4 文が世界観のすべてであり、ゲーム内の全要素はこの物語に対応する:

| ゲーム要素 | 世界観上の意味 | プレイヤーが感じるべきこと |
| --- | --- | --- |
| ユニット群 | 見習い魔法使いの群れ | 「自分の仲間」— 増えると嬉しく、減ると惜しい |
| リーダー + 魔法陣 | 群れを導く先導者 | 操作の主体。常に視線が集まる目印 |
| Mana Font(+5) | 仲間が湧き出すマナの泉 | 安心・回復 |
| Chronos Gate(×2) | 群れを倍化する時の門 | 高揚・ジャックポット感 |
| Gargoyle Wall(-3) | 仲間を石化させる敵壁 | 危険・回避対象 |
| ゴールライン | 聖域 SANCTUM の門 | 到達の達成感 |
| MANA POWER | 群れの総魔力 = ユニット数 | スコアであり生命線 |

## 2. アートディレクション指針(アセット制作者向け)

後日のアセット制作([04-assets.md](./04-assets.md))が世界観からぶれないための指針。プロトタイプのプレースホルダー描画(単色図形)もこのパレットに従う。

- **トーン**: 「夜の荒野を駆けるダークファンタジー」だが、深刻すぎないアーケードの軽快さ。デフォルメ頭身のキャラクターを推奨。
- **ライティング**: 暗い地面に対して、ゲート・ユニット・魔法陣などのゲームプレイ要素が**発光して浮かび上がる**コントラスト設計。視認性がゲーム性に直結するため、装飾よりシルエットの判別を優先する。
- **カラーパレット**(ユーザー指定 + 補完値。補完値はアセット制作時に多少の調整可):

| 用途 | 色 | 指定区分 |
| --- | --- | --- |
| プレイヤーユニット(Apprentice Mage) | Deep Blue `#1d4ed8` | ユーザー指定 |
| 魔法陣グリフの線 | Light Blue `#93c5fd` | 補完 |
| 加算ゲート(Mana Font) | Vibrant Emerald `#10b981` | ユーザー指定 |
| 乗算ゲート(Chronos Gate) | Aether Purple `#8b5cf6` | ユーザー指定 |
| 敵壁(Gargoyle Wall) | Crimson `#b91c1c` | ユーザー指定 |
| フィールド地色 | 夜闇の紺 `#0f172a` | 補完 |
| フィールドの縞・分割線 | `#1e293b` | 補完 |
| ゴールライン(SANCTUM) | Gold `#fbbf24` | 補完 |

- **形の記号性**: 加算 = 泉(丸・上向きの湧き)、乗算 = 門(アーチ・対称)、敵 = 壁(横に長い塊・牙状シルエット)。色覚特性があっても形で区別できることを目指す。

## 3. テーマデータモデル(themeConfig.ts の仕様)

### 設計原則

- テーマに属する**文字列・色・効果値・画像参照**をすべて `src/game/themeConfig.ts` に集約する。`GamePrototype.tsx` / `GamePrototype.module.css` にはテーマ由来のリテラルを一切書かない。
- ゲート種別は文字列リテラルユニオン **`GateKind = "add" | "multiply" | "subtract"`** で表す(enum は tsconfig の `erasableSyntaxOnly` により使用不可)。
- 効果表記(例 "+5")は **`displayValue` としてデータ側に持つ**。「+ を付けるか x を付けるか」の書式ロジックすらコンポーネントに残さないため。効果計算に使う数値は `value`(常に正の数)として別フィールドで持つ。
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
| `hud` | HudConfig | HUD の文言 |
| `overlay` | OverlayConfig | 勝敗オーバーレイの文言 |
| `field` | FieldConfig | フィールドの色・文言 |
| `assets` | ThemeAssets(全エントリ optional) | 画像アセット定義。詳細は [04-assets.md](./04-assets.md) |

**PlayerConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `label` | string | ユニット名称(例: "Apprentice Mage") |
| `color` | string | プレースホルダー描画時のユニット塗り色 |
| `glyphColor` | string | リーダー魔法陣グリフの線色 |

**GateTypeConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `kind` | GateKind | 効果種別(add / multiply / subtract) |
| `label` | string | テーマ上の名称(例: "Mana Font") |
| `color` | string | プレースホルダー描画時のゲート色 |
| `value` | number | 効果量。常に正の数(subtract でも 3) |
| `displayValue` | string | 画面に描く効果表記(例: "+5" / "x2" / "-3") |

**HudConfig / OverlayConfig / FieldConfig**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `hud.scoreLabel` | string | スコア見出し(例: "MANA POWER") |
| `overlay.clearTitle` | string | ゴール到達時のタイトル |
| `overlay.gameOverTitle` | string | 全滅時のタイトル |
| `overlay.retryLabel` | string | リトライボタン表記 |
| `overlay.resultLabel` | string | 結果値の見出し |
| `field.backgroundColor` | string | フィールド地色 |
| `field.stripeColor` | string | 縞・中央分割線の色 |
| `field.goalLineColor` | string | ゴールラインの色 |
| `field.goalLabel` | string | ゴールラインに添えるラベル |

`assets` セクションの型(`SpriteAsset` 等)は [04-assets.md](./04-assets.md) §4 で定義する。

### fantasy テーマの具体値

| パス | 値 |
| --- | --- |
| `name` | `"Sword, Shield, and Sorcery"` |
| `player.label` / `.color` / `.glyphColor` | `"Apprentice Mage"` / `#1d4ed8` / `#93c5fd` |
| `gates.add` | kind `add`、label `"Mana Font"`、color `#10b981`、value `5`、displayValue `"+5"` |
| `gates.multiply` | kind `multiply`、label `"Chronos Gate"`、color `#8b5cf6`、value `2`、displayValue `"x2"` |
| `gates.subtract` | kind `subtract`、label `"Gargoyle Wall"`、color `#b91c1c`、value `3`、displayValue `"-3"` |
| `hud.scoreLabel` | `"MANA POWER"` |
| `overlay.clearTitle` | `"Quest Clear!"` |
| `overlay.gameOverTitle` | `"The Party Has Fallen"` |
| `overlay.retryLabel` | `"Retry"` |
| `overlay.resultLabel` | `"MANA POWER"` |
| `field.backgroundColor` / `.stripeColor` | `#0f172a` / `#1e293b` |
| `field.goalLineColor` / `.goalLabel` | `#fbbf24` / `"SANCTUM"` |
| `assets` | プロトタイプ初期状態では**空オブジェクト**(全描画がプレースホルダーにフォールバック) |

## 4. 利用側の規約

- `GamePrototype.tsx` からは default export されたテーマと型のみを import する(`verbatimModuleSyntax` のため型は type import)。
- ゲートの色・表記・効果値は必ず `theme.gates[kind]` 経由で参照する。敵(Gargoyle Wall)も `kind: "subtract"` のゲートとして同一機構で扱い、敵専用の分岐・色指定を作らない。
- CSS へテーマ色を渡す場合は、コンテナ要素の inline style で CSS カスタムプロパティ(例: `--player-color`)として注入する([03-architecture.md](./03-architecture.md) §9)。

## 5. 検証(ハードコード禁止の確認方法)

実装完了後、以下がともに**ヒット 0 件**であること(themeConfig.ts 以外にテーマリテラルが存在しないこと):

```sh
grep -nE "#[0-9a-fA-F]{3,8}" src/game/GamePrototype.tsx src/game/GamePrototype.module.css
grep -nE "Mana Font|Chronos Gate|Gargoyle Wall|Apprentice Mage|MANA POWER|SANCTUM" src/game/GamePrototype.tsx src/game/GamePrototype.module.css
```

注: `GamePrototype.module.css` にはオーバーレイ背景の半透明黒のような**テーマ非依存の chrome 色**(白文字・黒背景等)は置いてよい。禁止するのはテーマ由来のカラーコードと文字列。
