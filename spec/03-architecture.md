# 03. 技術アーキテクチャ

`src/game/GamePrototype.tsx` + `src/game/GamePrototype.module.css` の設計。テーマ値は [01-world-theme.md](./01-world-theme.md)、プレイフィールの根拠は [02-game-design.md](./02-game-design.md)、画像アセットの扱いは [04-assets.md](./04-assets.md) を参照。

本章はコードを提示しない。データ構造・処理順序・数式・満たすべき性質を定義し、実装表現は実装者に委ねる。

## 1. 全体方針

- **リアクティブ境界の最小化**: Solid のシグナルは「HUD / オーバーレイの DOM に表示される値」だけ。フレームごとに変わる状態はすべて plain object(以下 WorldState)に置き、rAF ループが直接書き換える。Canvas 描画処理はシグナルを読まない。
- **描画の 2 系統対応**: すべてのゲーム要素の描画は「テーマにアセット定義があれば画像(スプライト)、なければプレースホルダー図形」を選ぶ**描画分岐**を最初から持つ(§4)。プロトタイプ初期はアセット未定義のため全てプレースホルダーで動く。
- **1 コンポーネント完結**: 型・定数・純関数・コンポーネントを `GamePrototype.tsx` に集約する。テスト対象の純関数(§11)は named export し、Vitest から直接検証できるようにする。
- **座標系**: Canvas は常に論理座標 360×640 で描く(DPR は変換行列で吸収)。y 軸は下向き正。スクロールは「行や背景の y が毎フレーム増える」ことで表現する。

## 2. 状態設計

### Solid シグナル(DOM 表示専用・3 つのみ)

| シグナル | 型 | 更新タイミング |
| --- | --- | --- |
| `unitCount` | number | ゲート効果の適用時のみ(フレーム毎ではない) |
| `gamePhase` | `"ready" \| "running" \| "cleared" \| "gameover"` | フェーズ遷移時のみ |
| `progressPercent` | number(0〜100 整数) | 整数 % が変化したフレームのみ(floor 比較で間引く) |

- enum 禁止のためフェーズはリテラルユニオン。プロトタイプは `"running"` 開始とし、`"ready"` はタップスタートを将来足すための拡張点として型にのみ残す。
- HUD スコアのパンチ演出([02](./02-game-design.md) §5)は、`unitCount` の変化に反応して CSS アニメーションクラスを付け直す方式(変化ごとにアニメーションが再トリガーされること)。

### 非リアクティブ WorldState(rAF が直接書き換える)

コンポーネント内に let 変数として保持する。`createStore` / `createSignal` でラップ**しない**。リトライはファクトリ関数で WorldState を丸ごと作り直し、シグナル 3 つを初期値に戻すだけとする(リセット漏れが構造的に起きない)。

**WorldState のフィールド**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `distance` | number | 走破距離(px)。勝利判定・行スポーン管理・背景スクロールに使用 |
| `nextRowDistance` | number | 次の行をスポーンする distance |
| `leaderX` | number | リーダーの現在 x |
| `targetX` | number | ポインターが指定した目標 x |
| `units` | Unit[] | 群れ。`units.length` が真のユニット数(シグナルはミラー) |
| `rows` | GateRow[] | 画面内 + 直前分のみ(常時 3〜4 件) |
| `effects` | FloatText[] | フローティングテキスト(常時 0〜3 件) |
| `elapsed` | number | 経過秒。グリフ回転・wobble・スプライトのフレーム選択に使用 |
| `pointerActive` | boolean | ドラッグ中フラグ |

**Unit**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `x` / `y` | number | 現在のスクリーン座標 |
| `offsetX` / `offsetY` | number | フォーメーション上のリーダーからのオフセット |
| `wobblePhase` | number | 揺らぎ・アニメ位相(スポーン時に乱数 × 2π)。スプライトのフレームずらしにも流用 |

**GateRow / GateCell**

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `y` | number | 行中心のスクリーン y。毎フレーム加算 |
| `left` / `right` | GateCell | 各セル。GateCell は `kind: GateKind` のみを持ち、色・表記・効果は theme から引く |
| `resolved` | boolean | 1 行 1 回発動の消費フラグ |

**FloatText**(フィードバック演出用・非リアクティブ)

| フィールド | 型 | 意味 |
| --- | --- | --- |
| `text` | string | 表示文字列(theme の `displayValue` をそのまま入れる) |
| `color` | string | 描画色(theme のゲート色をそのまま入れる) |
| `x` / `y` | number | 現在位置。毎フレーム y を `FLOAT_RISE_SPEED` で上昇 |
| `age` | number | 経過秒。`FLOAT_LIFETIME` 超で配列から除去。透明度 = 1 − age/lifetime |
| `scale` | number | 文字サイズ倍率(×2 ゲートは大きく) |

## 3. ゲームループ

- `onMount` で rAF ループを開始し、`onCleanup` で必ず `cancelAnimationFrame` する。
- dt は秒単位で算出し、**`MAX_DT = 1/30` にクランプ**する。タブ復帰時の巨大 dt によるワープ・行のすり抜けを防ぐ。1 フレームの最大移動は `SCROLL_SPEED / 30 = 6px` となり、行間隔 260px に対して複数行が同一フレームで判定線を跨ぐことはない。
- `gamePhase` が `"running"` のときだけ update を実行し、render は phase に関係なく毎フレーム実行する(終了後も最終盤面が背景として残る)。ループは `onMount` 内のプレーンなコールバックであり Solid の追跡スコープ外なので、シグナル read が追跡される心配はない。

**update の固定順序**(1 フレーム内):

1. `distance` と `elapsed` に加算
2. 行スポーン判定(§8)
3. 各行の y 加算と、画面外に出た行の除去
4. リーダーの lerp 追従(§6)
5. ユニットの追従 + wobble(§6)
6. フローティングテキストの寿命更新・除去
7. 衝突判定 → ゲート効果適用(§7)— **`unitCount` シグナルの更新はここだけ**。0 になったら `gamePhase` を `"gameover"` へ
8. 勝利判定: `distance ≥ GOAL_DISTANCE` なら `"cleared"` へ
9. progress の間引き更新(整数 % が変わったときのみ setter)

## 4. 描画(Canvas 2D)

### DPR 対応

- キャンバスの実ピクセルは `論理サイズ × min(devicePixelRatio, 2)` とし、コンテキストの変換行列でスケールを設定する(DPR 2 で頭打ち = 描画負荷対策)。
- CSS 上の表示サイズは 360×640px 固定。以降の描画コードは常に論理座標で書く。解像度固定なので resize 監視は不要。

### 描画分岐の原則(アセット差し替え対応の中核)

各ゲーム要素の描画は「**その要素のアセットが theme.assets に定義され、かつロード済みなら `drawImage`、それ以外はプレースホルダー図形**」という分岐を必ず通す。この分岐を要素種別ごとの描画ヘルパー(ユニット用・ゲート用・背景用…)に閉じ込め、ループ本体からは要素の種類と位置だけを渡す。アセットの型・サイズ・アンカー・フレーム選択規則は [04-assets.md](./04-assets.md) §4〜5 に従う。

**満たすべき性質**: `themeConfig.ts` の assets にエントリを 1 件追加(または削除)するだけで、該当要素の描画が画像⇔プレースホルダーに切り替わり、`GamePrototype.tsx` の変更が不要であること。

### 描画順(奥→手前)

1. **背景**: アセット未定義時はテーマ地色で全面塗り + スクロール縞(`distance` の剰余で位相をずらした横線を `STRIPE_INTERVAL` 刻みで描く)+ 中央分割線(x=180 の破線)。アセット定義時は背景タイルを縦に 2〜3 枚並べて `distance` の剰余でスクロール([04](./04-assets.md) §5)
2. **ゴールライン**: `goalY = LEADER_Y − (GOAL_DISTANCE − distance)` が画面近傍(−40 < goalY < 680)のとき、テーマのゴール色の太線 + `goalLabel` テキスト(またはゴールバナー画像)
3. **ゲート行**: 各行の左セル(x: 12〜176)/ 右セル(x: 184〜348)。プレースホルダーは「ゲート色の半透明角丸矩形(透明度 0.85)+ 同色枠線 + 中央に `displayValue`(太字 22px 白)+ 下に `label`(9px 白)」。`resolved` の行は透明度 0.25 に減光。画像時はセルサイズのバナー画像を描き、`resolved` の減光は描画側の透明度操作で行う(画像に状態違いを要求しない)
4. **ユニット群**: §5 のバッチ規律に従う
5. **リーダーグリフ(魔法陣)**: リーダー座標に、プレースホルダーは「グリフ色の線による外円(r=14)+ 内円(r=9)+ 内接三角形」を `elapsed × GLYPH_ROT_SPEED` で回転させて描く。画像時は魔法陣画像を同じ回転角で描く(回転はコード側の責務。[04](./04-assets.md) §5)
6. **フローティングテキスト**: 各 FloatText を色・透明度・スケール付きで描く

HUD とオーバーレイは Canvas に描かず、DOM(CSS Modules)で Canvas の上に重ねる。

## 5. ユニット描画のパフォーマンス規律(200+ 体 @60fps の要)

- **プレースホルダー時**: 全ユニットが同色の円なので、1 つのパスに全円を追加して塗りつぶしを**全体で 1 回**にする(パス構築 → 単一 fill)。
- **画像時**: 全ユニットが同一スプライト画像を共有し、1 体 1 回の `drawImage` を単純ループで呼ぶ(300 回の drawImage は 60fps 圏内)。フレーム選択は `floor((elapsed × fps + wobblePhase の位相換算) mod frameCount)` のように**経過時間から算出**し、ユニットに毎フレーム更新するアニメ状態を持たせない。
- **共通の禁止事項**: ユニットごとの塗り色変更・コンテキストの save/restore・shadow / filter 系プロパティ・回転。ユニットに触れる Solid API(シグナル・store・`<For>` による DOM 化)は**ゼロ**であること。

## 6. 入力と群衆挙動

### ポインター入力

- canvas 要素に pointerdown / pointermove / pointerup / pointercancel を付与する。CSS で `touch-action: none` を必ず指定(モバイルのスクロールジェスチャ抑止。これがないとドラッグ操作が成立しない)。
- pointerdown で **pointer capture を取得**し、指がキャンバス外へ出ても move が届き続けるようにする。pointerup / cancel で解放。
- 入力座標は `(clientX − キャンバス左端) ÷ CSS 幅 × 360` で論理座標へ変換し、`LEADER_CLAMP_MARGIN`(24px)〜`360 − LEADER_CLAMP_MARGIN` にクランプして `targetX` に書く。ハンドラは WorldState を直接書くだけで、リアクティブ更新を発生させない。
- `gamePhase` が `"running"` 以外のときは pointerdown を無視する。指を離した後も `targetX` は保持され、リーダーはその場に留まる。

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

適用時の副作用(純関数の外側):

- **増加**: 差分体数を新規生成して配列に追加。初期位置は**発動したゲートセルの中心付近**(x にセル中心 ±20px の乱数、y は行の y)。lerp 追従が「泉から湧いて群れに合流する」演出を兼ねる。
- **減少**: 配列の**末尾から**切り捨てる。末尾 = ひまわり配置の最外周なので、見た目も外周から消える(石化アニメーションはスコープ外)。
- 増減後に「フォーメーション再割当て → フローティングテキスト生成 → `unitCount` シグナル更新 → 0 なら `"gameover"` へ遷移」を 1 回だけ実行する。

## 7. 衝突判定(ゲート通過)

- 判定基準は**判定線方式**: 行中心の y が `LEADER_Y`(520)に到達した瞬間、その行を 1 回だけ発動する。発動前に `resolved` フラグを立ててから効果を適用する(1 行 1 回を構造的に保証)。
- どちらのセルが発動するかは**リーダー x が中央線(180)の左右どちらにあるか**で決める。ユニット個別の当たり判定はしない(群衆ランナーの標準仕様であり、per-unit 判定は不要な複雑さ)。
- 敵壁(Gargoyle Wall)は subtract セルとして同一機構で処理する。敵専用の判定コードを作らない。
- 行は y が画面外(640 + 行高さ)を超えたら配列から除去する。行数は常時 3〜4 件なので配列再生成の GC 圧は無視できる。

## 8. スポーン(行生成)

- **距離ベース**: `distance ≥ nextRowDistance` になったら画面上端の外(y = −行高さ)に行を生成し、`nextRowDistance += ROW_INTERVAL`。ただし `nextRowDistance ≥ GOAL_DISTANCE − GOAL_SAFETY` の領域では生成しない(ゴール前の花道。[02](./02-game-design.md) §3)。
- **行パターン**は純関数 `rollRowPattern(distance, rng)` で決める(乱数は関数注入でテスト可能に)。距離から Phase 1/2/3 を判定し、[02-game-design.md](./02-game-design.md) §3 のフェーズ別出現率表に従って `good` / `bad` の GateKind ペアを返す。good/bad の左右配置は別ロールで 50/50。
- 効果値は `theme.gates[kind].value` 固定。値を乱数化すると `displayValue` と矛盾するため行わない。

## 9. 勝敗・オーバーレイ・HUD(DOM 層)

- **Clear**: update 末尾で距離到達を検知し `"cleared"` へ。**GameOver**: 効果適用でユニットが 0 になったら `"gameover"` へ。phase が `"running"` 以外になると update と入力が止まり、render のみ継続する。
- **オーバーレイ**は `<Show>` で phase を見て表示する DOM。タイトル(theme の `clearTitle` / `gameOverTitle`)、結果値(`resultLabel` + `unitCount`)、Retry ボタン(`retryLabel`)を持つ。
- **Retry**: WorldState をファクトリで再生成し、シグナル 3 つを初期値へ戻し `"running"` に遷移する。rAF は止めないので追加処理は不要。
- **HUD** は Canvas 上に重ねる DOM。`scoreLabel` + `unitCount`、および進捗バー(`progressPercent` を幅 % で反映)。`pointer-events: none` で入力を Canvas に通す。

### CSS Modules 設計(GamePrototype.module.css)

| クラス | 役割 |
| --- | --- |
| `.root` | 画面全体。フレックスで中央寄せ、`min-height: 100dvh`。ページ地色はテーマ外の chrome として黒系を許容 |
| `.frame` | 360×640 固定コンテナ。`position: relative`、`overflow: hidden` |
| `.canvas` | ブロック表示 360×640。**`touch-action: none`** と `user-select: none` 必須 |
| `.hud` | 上端に絶対配置。左右分割(スコア / 進捗バー)。`pointer-events: none`、白文字 |
| `.hudLabel` | スコア見出し。小さめ・字間広め・やや透過 |
| `.hudValue` | スコア数値。大きく太く、色は `var(--player-color)`。数値変化時のパンチ用 scale アニメーション(約 200ms)を持つ |
| `.progressTrack` / `.progressFill` | 細い進捗バー。fill の背景は `var(--goal-color)`、幅は inline style の % 指定 |
| `.overlay` | 全面絶対配置。縦フレックス中央寄せ、半透明黒背景、白文字 |
| `.overlayTitle` / `.overlayScore` | タイトル(24px 太字)/ 結果値(16px) |
| `.retryButton` | 背景 `var(--player-color)` のボタン |

テーマ色は `.frame` の inline style から CSS カスタムプロパティ(`--player-color`、`--goal-color`)として注入する。これにより CSS Modules 内にテーマ色のハードコードなし・コンポーネントロジックにも色リテラルなしを両立する。

## 10. 定数パラメータ表

すべて名前付き定数として定義する([02-game-design.md](./02-game-design.md) §6 の調整ノブと対応)。

| 定数 | 推奨値 | 根拠 |
| --- | --- | --- |
| `VIEW_W` / `VIEW_H` | 360 / 640 | 仕様固定 |
| `SCROLL_SPEED` | 180 px/s | 1 行(260px)を約 1.4 秒で通過。判断猶予として適切 |
| `ROW_INTERVAL` | 260 px | 画面内に常時 1〜2 行 |
| `ROW_HEIGHT` | 56 px | 値 + 名称の 2 行ラベルが収まる |
| `GOAL_DISTANCE` | 6000 px | 約 33 秒、行数 ≈ 21 |
| `GOAL_SAFETY` | 400 px | ゴール前の行スポーン抑止(勝利の花道) |
| `PHASE2_START` / `PHASE3_START` | 2000 / 4200 px | 難易度フェーズ境界([02](./02-game-design.md) §3) |
| `LEADER_Y` | 520 px | 下から 120px。行の視認時間を最大化 |
| `LEADER_LERP_RATE` | 12 /s | 指にほぼ吸い付くが硬すぎない |
| `UNIT_FOLLOW_RATE` | 8 /s | リーダーより緩く、群れの遅れを演出 |
| `UNIT_RADIUS` | 5 px | 300 体でも画面が破綻しない(プレースホルダー円の半径) |
| `LEADER_GLYPH_RADIUS` | 14 px | ユニットより明確に大きい目印 |
| `INITIAL_UNITS` | 10 | -3 を 3 回引ける猶予。序盤から緊張がある最小値 |
| `MAX_UNITS` | 300 | 性能上限 + ×2 暴走防止 + 圧巻の画 |
| `FORMATION_SPACING` | 7 px | ひまわり配置の密度(群れ半径 ≈ 7√n) |
| `GOLDEN_ANGLE` | 2.399963 rad | ひまわり配置の黄金角 |
| `WOBBLE_AMP` / `WOBBLE_FREQ` | 1.5 px / 6 rad/s | 生物感の付与 |
| `LANE_MARGIN` | 12 px | 左右の壁余白 |
| `LEADER_CLAMP_MARGIN` | 24 px | グリフが画面からはみ出さない |
| `STRIPE_INTERVAL` | 80 px | スクロール速度感の可視化 |
| `MAX_DT` | 1/30 s | タブ復帰ワープ・行すり抜け防止 |
| `GLYPH_ROT_SPEED` | 1.2 rad/s | 魔法陣の回転速度 |
| `FLOAT_LIFETIME` | 0.8 s | フローティングテキストの寿命 |
| `FLOAT_RISE_SPEED` | 45 px/s | フローティングテキストの上昇速度 |
| `DPR_CAP` | 2 | 高 DPR 端末での描画負荷上限 |

数値はプレイフィール調整で変更してよいが、変更した場合は本表と [02](./02-game-design.md) の該当箇所を更新すること。

## 11. テスト対象の純関数

以下は named export し、Vitest でユニットテストする(テストケースは [05-implementation-plan.md](./05-implementation-plan.md) §4)。いずれも WorldState・Canvas・シグナルに依存しない純関数として切り出すこと。

| 関数 | 入力 | 出力 | 検証すべき性質 |
| --- | --- | --- | --- |
| `formationOffset` | インデックス i | オフセット座標 | i=0 は原点 / 座標が互いに重ならない / 半径が SPACING×√i に一致 |
| `applyGate` | kind, value, count | 新カウント | 加算・乗算・減算の正しさ / 0 下限 / MAX_UNITS 上限 |
| `rollRowPattern` | distance, rng | good/bad の GateKind ペア | 各フェーズで出現し得るパターン集合が仕様通り / Phase 1 で danger が出ない / 固定 rng で決定的 |
