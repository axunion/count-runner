# 03. 技術アーキテクチャ

`src/game/` 配下のモジュール群の設計。テーマ値は [01-world-theme.md](./01-world-theme.md)、プレイフィールの根拠は [02-game-design.md](./02-game-design.md)、画像アセットの扱いは [04-assets.md](./04-assets.md) を参照。

本章はコードを提示しない。データ構造・処理順序・数式・満たすべき性質を定義し、実装表現は実装者に委ねる。

## 1. 全体方針

- **リアクティブ境界の最小化**: Solid のシグナルは「HUD / オーバーレイの DOM に表示される値」だけ(§2)。フレームごとに変わる状態はすべて plain object(以下 WorldState)に置き、rAF ループが直接書き換える。Canvas 描画処理はシグナルを読まない。
- **ロジックと表示の分離**(v2 変更点): シミュレーションは `logic/` に閉じる。1 フレームの更新は `stepWorld(world, viewport, dt, rng)` が担い、シグナルに反映すべき出来事を **StepEvents** として返す(§3)。`Game.tsx` はイベントをシグナルへ写像するだけで、logic/ は Solid に依存しない。
- **描画の 2 系統対応**: すべてのゲーム要素の描画は「テーマにアセット定義があれば画像(スプライト)、なければプレースホルダー図形」を選ぶ**描画分岐**を最初から持つ(§5)。初期はアセット未定義のため全てプレースホルダーで動く。
- **モジュール分割**(v2 変更点): v1 の「1 コンポーネント完結」原則は廃止し、§12 の構成に分割する。テスト対象の純関数(§11)は named export し、Vitest から直接検証できるようにする。1 ファイル ~300 行を上限の目安とする。
- **座標系**: Canvas は常に論理座標 **幅 360 固定 × 高さ `viewH`(640〜900 の可変。§4)** で描く(DPR・表示スケールは変換行列で吸収)。y 軸は下向き正。スクロールは「行や背景の y が毎フレーム増える」ことで表現する。
- **外部ライブラリは追加しない**: 判断根拠は [README.md](./README.md)「ゲームライブラリについて」。easing・PRNG・localStorage はいずれも数十行以内の手書きで賄う。

## 2. 状態設計

### Solid シグナル(DOM 表示専用・5 つのみ)

| シグナル | 型 | 更新タイミング |
| --- | --- | --- |
| `unitCount` | number | ゲート効果の適用時のみ(道中はフレーム毎ではない)。フィナーレ中は battle tick の整数減算ごと(実質毎フレームだが最長数秒間の意図的な例外) |
| `gamePhase` | `"ready" \| "running" \| "finale" \| "cleared" \| "gameover"` | フェーズ遷移時のみ |
| `progressPercent` | number(0〜100 整数) | 整数 % が変化したフレームのみ(floor 比較で間引く) |
| `combo` | number | 行の解決時のみ([02](./02-game-design.md) §4) |
| `result` | `{ score, best, isNewRecord } \| null` | ゲーム終了時のみ(Clear でスコア確定 / GameOver は null のまま) |

- enum 禁止のためフェーズはリテラルユニオン。`"running"` 開始とし、`"ready"` はタップスタートを将来足すための拡張点として型にのみ残す。`"finale"` はボス戦([02](./02-game-design.md) §5)。
- HUD スコアのパンチ演出は `unitCount` の変化に反応して CSS アニメーションクラスを付け直す方式(変化ごとに再トリガー)。コンボ表示・フィーバー強調も同様に `combo` シグナル起点の DOM 演出とする。
- ボス HP は**シグナルにしない**。フレーム毎に変わり得るため Canvas に直描きする(§5)。

### 非リアクティブ WorldState(rAF が直接書き換える)

コンポーネント内に let 変数として保持する。`createStore` / `createSignal` でラップ**しない**。リトライはファクトリ関数で WorldState を丸ごと作り直し、シグナルを初期値に戻すだけとする(リセット漏れが構造的に起きない)。

**WorldState のフィールド**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `distance` | number | 走破距離(px)。フィナーレ遷移判定・行スポーン管理・背景スクロール・速度算出に使用 |
| `nextRowDistance` | number | 次の行をスポーンする distance(初期値 ROW_INTERVAL) |
| `leaderX` | number | リーダーの現在 x |
| `targetX` | number | ポインターが指定した目標 x |
| `units` | Unit[] | 群れ。`units.length` が真のユニット数(シグナルはミラー) |
| `rows` | GateRow[] | 画面内 + 直前分のみ(常時 3〜4 件) |
| `effects` | FloatText[] | フローティングテキスト(常時 0〜数件) |
| `elapsed` | number | 経過秒。グリフ回転・wobble・スプライトのフレーム選択に使用 |
| `pointerActive` | boolean | ドラッグ中フラグ |
| `combo` / `maxCombo` | number | 現在コンボ / 最大コンボ(シグナルはミラー) |
| `feverTimer` | number | フィーバー残り秒。> 0 でフィーバー中。毎フレーム減算 |
| `boss` | `{ hp, y } \| null` | フィナーレのボス。道中は null |
| `battleCarry` | number | battle tick の端数繰り越し(§7) |

**Unit**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `x` / `y` | number | 現在のスクリーン座標 |
| `offsetX` / `offsetY` | number | フォーメーション上のリーダーからのオフセット |
| `wobblePhase` | number | 揺らぎ・アニメ位相(スポーン時に乱数 × 2π)。スプライトのフレームずらしにも流用 |

**GateRow / GateCell**(v2 変更点: セルが値を持つ)

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `row.y` | number | 行中心のスクリーン y。毎フレーム加算 |
| `row.left` / `row.right` | GateCell | 各セル |
| `row.resolved` | boolean | 1 行 1 回発動の消費フラグ |
| `cell.kind` | GateKind | 効果種別 |
| `cell.value` | number | スポーン時に抽選された効果量(常に正の数。[02](./02-game-design.md) §3) |
| `cell.displayValue` | string | 画面表記。生成時に `theme.gates[kind].displayPrefix + value` で合成 |
| `cell.guard` | number(optional) | 守られたゲートの敵集団体数。未定義 = 敵集団なし |

色・名称はセルに持たず `theme.gates[kind]` / `theme.enemy` から引く。

**FloatText**(フィードバック演出用・非リアクティブ)

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `text` | string | 表示文字列(セルの `displayValue`、guard 支払いは `"-" + guard`) |
| `color` | string | 描画色(theme のゲート色 / 敵集団色をそのまま入れる) |
| `x` / `y` | number | 現在位置。毎フレーム y を `FLOAT_RISE_SPEED` で上昇 |
| `age` | number | 経過秒。`FLOAT_LIFETIME` 超で配列から除去。透明度 = 1 − age/lifetime |
| `scale` | number | 文字サイズ倍率(乗算ゲートは `FLOAT_MULTIPLY_SCALE` で大きく) |

## 3. ゲームループ

- `onMount` で rAF ループを開始し、`onCleanup` で必ず `cancelAnimationFrame` する。
- dt は秒単位で算出し、**`MAX_DT = 1/30` にクランプ**する。タブ復帰時の巨大 dt によるワープ・行のすり抜けを防ぐ。1 フレームの最大移動は `SCROLL_SPEED_MAX / 30 ≈ 7.7px` となり、行間隔 260px に対して複数行が同一フレームで判定線を跨ぐことはない。
- update は `gamePhase` が `"running"` または `"finale"` のときだけ実行し(分岐は下記)、render は phase に関係なく毎フレーム実行する(終了後も最終盤面が背景として残る)。ループは `onMount` 内のプレーンなコールバックであり Solid の追跡スコープ外なので、シグナル read が追跡される心配はない。

### stepWorld と StepEvents(v2 変更点)

1 フレームの更新は `logic/world.ts` の `stepWorld(world, viewport, dt, rng)` が担う。WorldState を直接変異させ、シグナルに反映すべき出来事だけを **StepEvents** として返す:

| イベント | 内容 | Game.tsx での写像 |
| --- | --- | --- |
| `gateResolved`(0〜1 件) | 解決結果(新体数・新コンボ・フィーバー発動有無) | `unitCount` / `combo` 更新 → HUD パンチ再トリガー |
| `unitCountChanged` | 戦闘等による体数変化(フィナーレ中の整数減算を含む) | `unitCount` 更新 |
| `enteredFinale` | ボス戦開始 | `gamePhase = "finale"` |
| `finished` | `"cleared"` または `"gameover"` + 残存体数・maxCombo | `gamePhase` 更新。cleared 時は `score.ts` でスコア算出・ベスト照合し `result` を設定 |
| `progressPercent` | 整数 % が変わったときのみ値を含む | `progressPercent` 更新 |

localStorage への読み書き(`score.ts`)は `Game.tsx` が `finished` イベント処理時に行う。logic/ 内から Web API を呼ばない(stepWorld のテスト容易性を保つ)。

**update の固定順序**(`"running"` の 1 フレーム内):

1. `scrollSpeedAt(distance)` で現在速度を求め、`distance` と `elapsed` に加算
2. 行スポーン判定(§8)
3. 各行の y 加算と、画面外(`y > viewH + ROW_HEIGHT`)に出た行の除去
4. リーダーの lerp 追従(§6)
5. ユニットの追従 + wobble(§6)
6. フローティングテキストの寿命更新・除去、`feverTimer` の減算
7. 衝突判定 → ゲート効果適用(§7)。0 になったら `finished("gameover")`
8. フィナーレ遷移判定: `distance ≥ GOAL_DISTANCE` なら boss を生成して `enteredFinale`
9. progress の間引き更新

**`"finale"` の 1 フレーム内**: `elapsed` 加算 → battle tick(§7)→ ユニットの追従(吸い込み演出。§7)→ フローティングテキスト更新。行スポーン・入力・スクロールは行わない。

## 4. ビューポート(レスポンシブ)

**方針**: モバイルは論理高さを端末に合わせて可変にし画面を上下まで充填、PC は CSS スケールで拡大表示し、余る左右をクローム(テーマ装飾)が埋める。

### 論理サイズの決定 — 純関数・テスト対象

`computeViewport(vw, vh)`(vw/vh はゲーム表示に使えるビューポート px):

- `viewW = VIEW_W`(360 固定)
- `viewH = clamp(round(VIEW_W × vh / vw), VIEW_H_MIN, VIEW_H_MAX)`(640〜900)
- `scale = min(vh / viewH, vw / viewW)`(アスペクト維持の contain)

代表例: iPhone 15(393×852、比 2.17)→ viewH 780・scale ≈ 1.09 で**完全充填**。PC 1920×1080(比 0.56)→ viewH 640・scale ≈ 1.69 → 607×1080px のフレーム + 左右サイドパネル。超縦長(比 > 2.5)のみ viewH 900 で頭打ちし、わずかな上下帯をクロームが埋める。

### CSS サイズと backing store

- `.frame` の CSS サイズ = `(viewW × scale) × (viewH × scale)`。
- backing store: `total = min(scale × min(devicePixelRatio, DPR_CAP), BACKING_SCALE_CAP)` とし、`canvas.width = round(viewW × total)`、`canvas.height = round(viewH × total)`、コンテキストの変換行列を `total` 倍に設定する。以降の描画コードは常に論理座標で書く。`BACKING_SCALE_CAP`(3)は 4K + 高 DPR での fill 負荷上限。

### リサイズ方針(重要)

- **`viewH` の再計算は WorldState 生成時(マウント / リトライ)のみ**。プレイ中のリサイズ・回転では `scale` と backing store だけを再計算し、論理サイズは維持する(不足分は contain のレターボックスとしてクロームが埋める)。プレイ中に判定線(`LEADER_Y`)が動くと未解決の行が判定線を飛び越える事故が起きるため、これを構造的に排除する。
- 監視は `.root`(または window)への ResizeObserver 1 個。ハンドラは CSS 変数・canvas サイズ・変換行列の再設定のみを行い、WorldState に触れない。

### 高さ依存の座標(定数 → 導出値)

- `LEADER_Y = viewH − LEADER_BOTTOM_OFFSET`(120)。
- ゴールライン可視判定: `−40 < goalY < viewH + 40`。行カリング: `y > viewH + ROW_HEIGHT`。
- 描画・更新関数は `Viewport { viewW, viewH }` を引数で受ける。**ゲート X 座標系(セル x 12〜176 / 184〜348、中央線 180)は幅 360 固定なので変更しない**。
- 縦長端末ほどスポーン地点から判定線までの距離が伸び、視認猶予が長くなる(640px で最短 ≈2.5 秒 @最高速)。ソロゲームのため公平性の問題とはしない([02](./02-game-design.md) §7)。競技性が必要になった場合は「判定線から固定リード距離の位置にスポーンする」正規化に切り替えられる(拡張点)。

## 5. 描画(Canvas 2D)

### 描画分岐の原則(アセット差し替え対応の中核)

各ゲーム要素の描画は「**その要素のアセットが theme.assets に定義され、かつロード済みなら `drawImage`、それ以外はプレースホルダー図形**」という分岐を必ず通す。この分岐を要素種別ごとの描画ヘルパー(`render/` の各関数)に閉じ込め、ループ本体からは要素の種類と位置だけを渡す。アセットの型・サイズ・アンカー・フレーム選択規則は [04-assets.md](./04-assets.md) §4〜5 に従う。

**満たすべき性質**: `themeConfig.ts` の assets にエントリを 1 件追加(または削除)するだけで、該当要素の描画が画像⇔プレースホルダーに切り替わり、`render/` / `Game.tsx` の変更が不要であること。

### 描画順(奥→手前)

1. **背景**(`render/field.ts`): アセット未定義時はテーマ地色で全面塗り + スクロール縞(`distance` の剰余で位相をずらした横線を `STRIPE_INTERVAL` 刻み)+ 中央分割線(x=180 の破線)。アセット定義時は背景タイルを縦に並べて `distance` の剰余でスクロール([04](./04-assets.md) §5)
2. **ゴールライン**(`render/field.ts`): `goalY = LEADER_Y − (GOAL_DISTANCE − distance)` が画面近傍のとき、テーマのゴール色の太線 + `goalLabel` テキスト(またはゴールバナー画像)
3. **ゲート行**(`render/entities.ts`): 各行の左セル(x: 12〜176)/ 右セル(x: 184〜348)。プレースホルダーは「ゲート色の半透明角丸矩形(透明度 0.85)+ 同色枠線 + 中央に `cell.displayValue`(太字 22px 白)+ 下に `label`(9px 白)」。`resolved` の行は透明度 0.25 に減光。画像時はセルサイズのバナーを描き、`displayValue` はコードで上描き
4. **敵集団(guard)**(`render/boss.ts`): `cell.guard` があるセルの手前(判定線側)に、敵色の小円クラスタ(`formationOffset` を流用、表示は最大 `GUARD_DISPLAY_MAX` 体まで)+ **体数バッジ**(白文字・敵色の丸背景)。ユニットと同じバッチ規律(§5 末尾)で描く。アセット定義時は `enemyUnit` スプライトを共有
5. **ユニット群**(`render/entities.ts`): 下記バッチ規律に従う
6. **リーダーグリフ(魔法陣)**: リーダー座標に、プレースホルダーは「グリフ色の線による外円(r=14)+ 内円(r=9)+ 内接三角形」を `elapsed × GLYPH_ROT_SPEED` で回転させて描く。**フィーバー中は線色を `player.feverColor` に切り替え、半径を約 1.2 倍に拡大**。画像時は魔法陣画像を同じ回転角で描く
7. **ボス**(`render/boss.ts`、フィナーレのみ): 画面上部中央(y = `BOSS_Y`)にボス色の大型シルエット(プレースホルダーは同心円 + 牙状の縁、論理 `BOSS_SIZE` 角)+ その下に `boss.hpLabel` と **HP 数値**(太字・大)。アセット定義時は boss スプライト。HP 数値は常にコードで描く
8. **フローティングテキスト**: 各 FloatText を色・透明度・スケール付きで描く

HUD とオーバーレイは Canvas に描かず、DOM(CSS Modules)で Canvas の上に重ねる(§9)。

### ユニット描画のパフォーマンス規律(200+ 体 @60fps の要)

- **プレースホルダー時**: 全ユニットが同色の円なので、1 つのパスに全円を追加して塗りつぶしを**全体で 1 回**にする(パス構築 → 単一 fill)。敵集団クラスタも同様(敵色で別パス 1 回)。
- **画像時**: 全ユニットが同一スプライト画像を共有し、1 体 1 回の `drawImage` を単純ループで呼ぶ。フレーム選択は `floor((elapsed × fps + wobblePhase の位相換算) mod frameCount)` のように**経過時間から算出**し、ユニットに毎フレーム更新するアニメ状態を持たせない。
- **共通の禁止事項**: ユニットごとの塗り色変更・コンテキストの save/restore・shadow / filter 系プロパティ・回転。ユニットに触れる Solid API(シグナル・store・`<For>` による DOM 化)は**ゼロ**であること。

## 6. 入力と群衆挙動

### ポインター入力

- canvas 要素に pointerdown / pointermove / pointerup / pointercancel を付与する。CSS で `touch-action: none` を必ず指定(モバイルのスクロールジェスチャ抑止)。
- pointerdown で **pointer capture を取得**し、指がキャンバス外へ出ても move が届き続けるようにする。pointerup / cancel で解放。
- 入力座標は `(clientX − キャンバス左端) ÷ CSS 幅 × VIEW_W` で論理座標へ変換し、`LEADER_CLAMP_MARGIN`(24px)〜`VIEW_W − LEADER_CLAMP_MARGIN` にクランプして `targetX` に書く。ハンドラは WorldState を直接書くだけで、リアクティブ更新を発生させない。CSS スケールが変わっても getBoundingClientRect 比率換算のため追加対応は不要。
- `gamePhase` が `"running"` 以外のときは pointerdown を無視する(**`"finale"` 中も無視**。[02](./02-game-design.md) §5)。指を離した後も `targetX` は保持され、リーダーはその場に留まる。

### リーダー追従(フレームレート非依存 lerp)

毎フレーム: `leaderX += (targetX − leaderX) × (1 − e^(−LEADER_LERP_RATE × dt))`

指数減衰形式にすることで、フレームレートが変動しても追従の体感速度が一定になる。

### フォーメーション(ひまわり配置)— 純関数・テスト対象

インデックス i のユニットのリーダーからのオフセット:

- i = 0: 原点(リーダー直下)
- i ≥ 1: 半径 `r = FORMATION_SPACING × √i`、角度 `a = i × GOLDEN_ANGLE(2.399963 rad)` として `(cos a × r, sin a × r × 0.75)`(縦に 0.75 倍で楕円に潰す)

黄金角配置により、ユニット数がいくつでも常に密な円形クラスタになる(群れの半径 ≈ 7√n。[02](./02-game-design.md) の柱 A「面積で感じる成長」を実現する)。オフセットの再割当てはユニット数が変化したときのみ、全ユニットに index 順で行う。

### 毎フレームの追従 + 揺らぎ

各ユニットの目標位置 = `リーダー位置 + オフセット + wobble`(wobble = `sin(elapsed × WOBBLE_FREQ + wobblePhase) × WOBBLE_AMP` を x に加算)。現在位置から目標位置へ `1 − e^(−UNIT_FOLLOW_RATE × dt)` で lerp する。`UNIT_FOLLOW_RATE(8) < LEADER_LERP_RATE(12)` により群れがリーダーに少し遅れて付いてくる。x はレーン内(`LANE_MARGIN + UNIT_RADIUS` 〜 対称位置)にクランプ。

### ユニット数の増減 — 純関数・テスト対象

`applyGate(kind, value, count)` → 新しいカウント:

- add: `min(MAX_UNITS, count + value)`
- multiply: `min(MAX_UNITS, count × value)`
- subtract: `max(0, count − value)`

**フィーバー補正**(`feverTimer > 0` のとき。純関数の外側で適用): 増加量 `gain = 適用後 − 適用前` が正なら `適用後' = min(MAX_UNITS, 適用前 + ceil(gain × FEVER_GAIN_MULT))`。減少には適用しない。

適用時の副作用(純関数の外側):

- **増加**: 差分体数を新規生成して配列に追加。初期位置は**発動したゲートセルの中心付近**(x にセル中心 ± `SPAWN_JITTER` の乱数、y は行の y)。lerp 追従が「泉から湧いて群れに合流する」演出を兼ねる。
- **減少**: 配列の**末尾から**切り捨てる。末尾 = ひまわり配置の最外周なので、見た目も外周から消える。
- 増減後に「フォーメーション再割当て → フローティングテキスト生成 → コンボ更新(§7)→ StepEvents への記録 → 0 なら gameover」を 1 回だけ実行する。

## 7. 衝突判定と戦闘

### ゲート通過(判定線方式)

- 行中心の y が `LEADER_Y` に到達した瞬間、その行を 1 回だけ発動する。発動前に `resolved` フラグを立ててから効果を適用する(1 行 1 回を構造的に保証)。
- どちらのセルが発動するかは**リーダー x が中央線(180)の左右どちらにあるか**で決める。ユニット個別の当たり判定はしない。
- **guarded セルの解決順序**: ①敵集団の体数 `guard` を所持数から差し引く(末尾切り捨て + 敵色のフローティングテキスト `"-" + guard`)。0 になったら gameover。②生き残っていれば `applyGate` を適用(フィーバー補正込み)。①②は同一フレームで行い、演出は既存の湧き/消滅 lerp と FloatText に任せる(専用の戦闘ステートは持たない)。
- **コンボ更新**: 解決後、`betterSide(row, countBefore)`(純関数・テスト対象)で最善側を判定する。左右それぞれ「そのセルを選んだ場合の結果体数」(guarded は通行料込み、フィーバー補正なしの素の値)を比較し、`"left" | "right" | "tie"` を返す。選択が最善側ならコンボ +1、tie は維持、それ以外は 0。コンボが `COMBO_FEVER_THRESHOLD` の倍数に到達したら `feverTimer = FEVER_DURATION`。
- 行は y が画面外(`viewH + ROW_HEIGHT`)を超えたら配列から除去する。

### ボス戦(battle tick)— 純関数・テスト対象

フィナーレ中の毎フレーム:

1. `battleCarry += BATTLE_DRAIN_RATE × dt`。`n = floor(battleCarry)` を取り出し `battleCarry −= n`。
2. `applyBattleTick(count, bossHp, n)` → `{ count', bossHp' }`: 相殺量 `d = min(n, count, bossHp)` として両者から d を引く(**1:1 相殺**)。
3. 減った d 体はユニット配列の末尾から除去する。演出として、除去直前のフレームでは末尾ユニットの目標位置をボス座標に向ける(吸い込まれて消える)。
4. `bossHp' = 0` かつ `count' > 0` → `finished("cleared")`(残存体数 = 勝利マージン)。`count' = 0`(同時 0 を含む)→ `finished("gameover")`。

## 8. スポーン(行生成)

- **距離ベース**: `distance ≥ nextRowDistance` になったら画面上端の外(y = −ROW_HEIGHT)に行を生成し、`nextRowDistance += ROW_INTERVAL`。ただし `nextRowDistance ≥ GOAL_DISTANCE − GOAL_SAFETY` の領域では生成しない(ボス戦前の静けさ。[02](./02-game-design.md) §3)。
- **行パターン**は純関数 `rollRowPattern(distance, rng)` で決める(乱数は関数注入でテスト可能に)。距離から Phase 1/2/3 を判定し、[02-game-design.md](./02-game-design.md) §3 のフェーズ別出現率表に従ってパターン(5 種)を返す。good/bad の左右配置は別ロールで 50/50。
- **効果値**は純関数 `rollGateValue(kind, distance, rng)` で抽選する([02](./02-game-design.md) §3 のレンジ表)。`displayValue` はこの時点で `theme.gates[kind].displayPrefix + value` として合成しセルに保持する。
- **guard 体数**は guarded パターンのときスポーン処理側で決める: `max(GUARD_MIN, round(units.length × (GUARD_RATIO_MIN + rng() × (GUARD_RATIO_MAX − GUARD_RATIO_MIN))))`。所持数はスポーン時点の値を使う(判定時までの変動が駆け引きになる)。

## 9. 勝敗・オーバーレイ・HUD(DOM 層)と CSS 設計

- **オーバーレイ**は `<Show>` で phase を見て表示する DOM。タイトル(`clearTitle` / `gameOverTitle`)、残存体数(`resultLabel` + `unitCount`)、**Clear 時のみ**スコアブロック(`scoreLabel` + score / `bestLabel` + best / 更新時 `newRecordLabel` バッジ)、Retry ボタン(`retryLabel`)を持つ。
- **Retry**: `computeViewport` を再実行して viewH を確定し直し、WorldState をファクトリで再生成、シグナルを初期値へ戻し `"running"` に遷移する。rAF は止めない。
- **HUD** は Canvas 上に重ねる DOM。`scoreLabel` + `unitCount`、進捗バー(`progressPercent` を幅 %)、コンボ表示(`comboLabel` + `combo`。0 のときは薄く、フィーバー中は強調)。`pointer-events: none` で入力を Canvas に通す。

### CSS Modules 設計(Game.module.css)

| クラス | 役割 |
| --- | --- |
| `.root` | 画面全体。`min-height: 100dvh`。**グリッド `grid-template-columns: 1fr auto 1fr`**(中央 = frame、左右 = サイドパネル。モバイルでは 1fr が 0 に潰れて消える)。背景は `var(--chrome-bg-color)` + `var(--chrome-bg-image)`(cover) |
| `.sidePanel` | 左右の装飾列。`background-image: var(--chrome-side-image)`。画像未定義(`none` 注入)時は透明で地色に沈む |
| `.frame` | ゲーム領域コンテナ。CSS サイズは §4 の計算値を inline style(または CSS 変数)で受ける。`position: relative`、`overflow: hidden`、境界線 `var(--chrome-frame-border)` |
| `.canvas` | ブロック表示・frame にフィット。**`touch-action: none`** と `user-select: none` 必須 |
| `.hud` | 上端に絶対配置。スコア / コンボ / 進捗バー。`pointer-events: none`、白文字 |
| `.hudLabel` | 見出し。小さめ・字間広め・やや透過 |
| `.hudValue` | スコア数値。大きく太く、色は `var(--player-color)`。数値変化時のパンチ用 scale アニメーション(約 200ms) |
| `.hudCombo` | コンボ表示。通常は控えめ、フィーバー中は `var(--fever-color)` で強調 |
| `.progressTrack` / `.progressFill` | 細い進捗バー。fill の背景は `var(--goal-color)`、幅は inline style の % 指定 |
| `.overlay` | 全面絶対配置。縦フレックス中央寄せ、半透明黒背景、白文字 |
| `.overlayTitle` / `.overlayScore` | タイトル(24px 太字)/ 結果値(16px) |
| `.newRecordBadge` | ベスト更新バッジ。`var(--goal-color)` |
| `.retryButton` | 背景 `var(--player-color)` のボタン |

テーマ色・画像は inline style から CSS カスタムプロパティとして注入する: `.frame` に `--player-color` / `--goal-color` / `--fever-color`、`.root` に `--chrome-bg-color` / `--chrome-bg-image` / `--chrome-side-image` / `--chrome-frame-border`。optional 値が未定義の場合は `"none"` を明示注入する([01](./01-world-theme.md) §4)。`--chrome-frame-border` は **border ショートハンド値**として注入する(`frameBorderColor` 定義時は `2px solid <色>`、未定義時は `none`)。CSS Modules 内にテーマ色のハードコードなし・コンポーネントロジックにも色リテラルなしを両立する。

## 10. 定数パラメータ表

すべて `constants.ts` の名前付き定数として定義する([02-game-design.md](./02-game-design.md) §9 の調整ノブと対応)。

**ビューポート・描画**

| 定数 | 推奨値 | 根拠 |
| --- | --- | --- |
| `VIEW_W` | 360 | 論理幅固定 |
| `VIEW_H_MIN` / `VIEW_H_MAX` | 640 / 900 | 縦横比 1.78〜2.5 をカバー(§4) |
| `DPR_CAP` | 2 | 高 DPR 端末での描画負荷上限 |
| `BACKING_SCALE_CAP` | 3 | CSS 拡大 × DPR の総倍率上限(4K 対策) |
| `LEADER_BOTTOM_OFFSET` | 120 px | 判定線は常に画面下から 120px(旧 LEADER_Y の置き換え) |
| `STRIPE_INTERVAL` | 80 px | スクロール速度感の可視化 |
| `BOSS_Y` / `BOSS_SIZE` | 120 px / 120 px | ボスの表示位置(上部中央)とプレースホルダーサイズ |
| `GUARD_DISPLAY_MAX` | 20 体 | 敵集団クラスタの描画上限(数値はバッジで伝える) |

**テンポ・進行**

| 定数 | 推奨値 | 根拠 |
| --- | --- | --- |
| `SCROLL_SPEED_BASE` / `SCROLL_SPEED_MAX` | 180 / 230 px/s | 距離 0 → GOAL_DISTANCE で線形加速([02](./02-game-design.md) §7)。視認猶予 ≥ 2.0 秒を維持 |
| `ROW_INTERVAL` | 260 px | 画面内に常時 1〜2 行 |
| `ROW_HEIGHT` | 56 px | 値 + 名称の 2 行ラベルが収まる |
| `GOAL_DISTANCE` | 6000 px | 道中約 30 秒、行数 ≈ 21 |
| `GOAL_SAFETY` | 400 px | ゴール前の行スポーン抑止(ボス戦前の静けさ) |
| `PHASE2_START` / `PHASE3_START` | 2000 / 4200 px | 難易度フェーズ境界([02](./02-game-design.md) §3) |
| `MAX_DT` | 1/30 s | タブ復帰ワープ・行すり抜け防止 |

**群衆・操作**

| 定数 | 推奨値 | 根拠 |
| --- | --- | --- |
| `LEADER_LERP_RATE` | 12 /s | 指にほぼ吸い付くが硬すぎない |
| `UNIT_FOLLOW_RATE` | 8 /s | リーダーより緩く、群れの遅れを演出 |
| `UNIT_RADIUS` | 5 px | 300 体でも画面が破綻しない |
| `LEADER_GLYPH_RADIUS` | 14 px | ユニットより明確に大きい目印 |
| `GLYPH_ROT_SPEED` | 1.2 rad/s | 魔法陣の回転速度 |
| `INITIAL_UNITS` | 10 | 序盤から緊張がある最小値 |
| `MAX_UNITS` | 300 | 性能上限 + 乗算暴走防止 + 圧巻の画 |
| `FORMATION_SPACING` | 7 px | ひまわり配置の密度(群れ半径 ≈ 7√n) |
| `GOLDEN_ANGLE` | 2.399963 rad | ひまわり配置の黄金角 |
| `WOBBLE_AMP` / `WOBBLE_FREQ` | 1.5 px / 6 rad/s | 生物感の付与 |
| `LANE_MARGIN` | 12 px | 左右の壁余白 |
| `LEADER_CLAMP_MARGIN` | 24 px | グリフが画面からはみ出さない |
| `SPAWN_JITTER` | 20 px | 増加ユニットの湧き位置の散らし幅 |

**ゲート値・コンボ・戦闘・スコア(v2 新設)**

| 定数 | 推奨値 | 根拠 |
| --- | --- | --- |
| `GATE_ADD_RANGES` | P1 [4,6] / P2 [3,8] / P3 [3,10] | [02](./02-game-design.md) §3 の抽選レンジ |
| `GATE_SUBTRACT_RANGES` | P1 [2,3] / P2 [2,6] / P3 [3,8] | 同上 |
| `GATE_X3_RATES` | P1 0 / P2 0.10 / P3 0.15 | ×3 の出現率 |
| `GUARD_RATIO_MIN` / `GUARD_RATIO_MAX` | 0.3 / 0.6 | 敵集団 = 所持数の 3〜6 割(駆け引き圏) |
| `GUARD_MIN` | 3 体 | 序盤でも敵集団が形になる下限 |
| `COMBO_FEVER_THRESHOLD` | 5 | フィーバー発動コンボ数(倍数ごと) |
| `FEVER_DURATION` | 4 s | フィーバー持続 |
| `FEVER_GAIN_MULT` | 1.5 | フィーバー中の増加量倍率 |
| `BOSS_HP_BASE` | 100 | 中間プレイの期待所持数帯(50〜120)の上限寄り(重要ノブ) |
| `BATTLE_DRAIN_RATE` | 40 体/s | ボス戦が 1〜3 秒で決着する速度(min(所持数, HP) ÷ 40) |
| `SCORE_PER_UNIT` / `SCORE_PER_COMBO` | 10 / 30 | スコア加重([02](./02-game-design.md) §6) |
| `BEST_STORAGE_KEY` | `"count-runner:best"` | localStorage キー |

**演出**

| 定数 | 推奨値 | 根拠 |
| --- | --- | --- |
| `FLOAT_LIFETIME` | 0.8 s | フローティングテキストの寿命 |
| `FLOAT_RISE_SPEED` | 45 px/s | フローティングテキストの上昇速度 |
| `FLOAT_MULTIPLY_SCALE` | 1.5 | 乗算通過時の文字拡大率 |

数値はプレイフィール調整で変更してよいが、変更した場合は本表と [02](./02-game-design.md) の該当箇所を更新すること。

## 11. テスト対象の純関数

以下は named export し、Vitest でユニットテストする(テストケースは [05-implementation-plan.md](./05-implementation-plan.md) §4)。いずれも WorldState・Canvas・シグナル・Web API に依存しない純関数として切り出すこと。

| 関数 | 置き場所 | 入力 | 出力 | 検証すべき性質 |
| --- | --- | --- | --- | --- |
| `formationOffset` | logic/formation.ts | インデックス i | オフセット座標 | i=0 は原点 / 座標が互いに重ならない / 半径が SPACING×√i に一致 |
| `applyGate` | logic/gates.ts | kind, value, count | 新カウント | 加算・乗算・減算の正しさ / 0 下限 / MAX_UNITS 上限 |
| `rollRowPattern` | logic/gates.ts | distance, rng | 行パターン(5 種)+ 左右配置 | 各フェーズで出現し得るパターン集合が仕様通り / Phase 1 で danger・guarded が出ない / 固定 rng で決定的 |
| `rollGateValue` | logic/gates.ts | kind, distance, rng | 効果値 | 各フェーズのレンジ内 / ×3 率の境界 / 決定的 |
| `betterSide` | logic/gates.ts | row, count | `"left" \| "right" \| "tie"` | 単純比較 / guarded の通行料込み比較 / 全滅側を選ばない / 同値で tie |
| `applyBattleTick` | logic/battle.ts | count, bossHp, n | 新 count・新 bossHp | 1:1 相殺 / どちらかが 0 で停止 / n=0 で無変化 |
| `computeScore` | logic/score.ts | unitsRemaining, maxCombo | number | 加重和の正しさ / 0 体・0 コンボの境界 |
| `scrollSpeedAt` | logic/world.ts(または constants 隣接) | distance | px/s | 距離 0 で BASE / GOAL_DISTANCE で MAX / 線形補間 / 範囲外クランプ |
| `computeViewport` | viewport.ts | vw, vh | Viewport + scale | クランプ境界(640 / 900)/ scale の contain 性質 / 代表端末値 |

## 12. モジュール構成

```
src/game/
  constants.ts            # §10 の定数表と 1:1 対応
  viewport.ts             # Viewport 型 + computeViewport
  viewport.test.ts
  theme/
    themeConfig.ts        # 型 + fantasyTheme(default export)
    assetLoader.ts        # プリロード / ロード状態 / getSprite
  logic/                  # Solid・Canvas・Web API 非依存
    types.ts              # Unit / GateRow / GateCell / FloatText / WorldState / GamePhase / StepEvents
    formation.ts / formation.test.ts
    gates.ts / gates.test.ts
    battle.ts / battle.test.ts
    combo.ts / combo.test.ts      # コンボ更新・フィーバー発動判定(小さければ gates.ts に同居可)
    score.ts / score.test.ts      # computeScore + localStorage 入出力(I/O 部はテスト対象外)
    world.ts                      # createWorldState + stepWorld + scrollSpeedAt
  render/                 # ctx と theme と viewport を受けて描くだけ。状態を持たない
    field.ts              # 背景 / ゴールライン
    entities.ts           # ゲート行 / ユニット / リーダーグリフ / フローティングテキスト
    boss.ts               # ボス / 敵集団(guard)
  ui/
    Hud.tsx               # スコア / コンボ / 進捗
    Overlay.tsx           # Clear / GameOver / リザルト / Retry
  Game.tsx                # canvas / rAF / 入力 / ResizeObserver / クローム DOM / シグナル / StepEvents 写像
  Game.module.css
```

- 目安行数: Game.tsx ~250 / world.ts ~180 / entities.ts ~200、その他は 100 前後。**~300 行/ファイル**を超えそうなら分割を検討する。
- import は既存規約どおり**拡張子付き相対パス**(例: `"../theme/themeConfig.ts"`)。パスエイリアスは導入しない。
- 将来の拡張はファイル追加で受ける: 例 `logic/obstacles.ts`(v3 の障害物)、`logic/stages.ts`(ステージ制)。**必要になるまで作らない**。
