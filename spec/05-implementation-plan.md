# 05. 実装計画(v2)

[01](./01-world-theme.md)〜[04](./04-assets.md) の仕様を、動作確認可能なステップに分けて実装する。各ステップの検証をパスしてから次へ進むこと。v1(プロトタイプ)は実装済みであり、本計画は**動いているゲームを壊さず段階的に v2 へ移行する**ことを前提に組んである。

## 1. 実装上の制約(全ステップ共通・必読)

このリポジトリの設定に由来する制約。違反すると `pnpm check` が落ちる。

1. **`enum` / `namespace` / class parameter properties 禁止**(`erasableSyntaxOnly`)。種別はすべて文字列リテラルユニオン + interface + const object で表現する。
2. **型 import は `import type`**(`verbatimModuleSyntax`)。同一モジュールから値と型の両方を使う場合は import を分けるか type 修飾子を付ける。
3. **相対 import は拡張子付き**(例: `"../theme/themeConfig.ts"`)。パスエイリアスは導入しない。
4. **Biome**: 文字列はダブルクオート。未使用の変数・引数・定数を残さない。コミット前に `pnpm fix` で自動整形できる。
5. **per-unit リアクティブ禁止**(パフォーマンス要件)。ユニットを `<For>` で DOM 化しない、ユニット配列を signal / store 化しない、ユニットの座標更新でシグナル setter を呼ばない。ユニットに触れる Solid API は**ゼロ**であること。
6. **テーマ・見た目のハードコード禁止**。テーマ由来のカラーコード・名称文字列・画像パスを `theme/themeConfig.ts` 以外に書かない(検証は [01](./01-world-theme.md) §5)。
7. **SolidJS である**。React の `useState` / `useEffect` / `useRef` / `className` は存在しない。シグナルの読み出しは関数呼び出し形式である点に注意。
8. **描画分岐の徹底**([03](./03-architecture.md) §5)。要素の描画箇所では必ず「アセットあり→画像 / なし→プレースホルダー」のヘルパーを通し、ループ本体に描画スタイルを直書きしない。
9. **logic/ は Solid・Canvas・Web API に依存しない**([03](./03-architecture.md) §12)。シグナル反映は StepEvents 経由で `Game.tsx` が行い、localStorage I/O は `score.ts` の関数に隔離して `Game.tsx` から呼ぶ。
10. **バランス数値は `constants.ts` に集約**し、[03](./03-architecture.md) §10 の定数表と 1:1 に保つ。

## 2. 実装ステップ

各ステップは「実装内容 → 検証」の形式。検証には `pnpm dev` での目視確認(または `/verify` スキル)を含む。**Phase R の間はゲームの挙動を一切変えない**(純粋な構造移行)。

### Phase R: リファクタリング(挙動不変)

#### Step R1: theme/ の分離

`themeConfig.ts` を `theme/themeConfig.ts` へ移動し、`ChromeConfig` 型と `chrome` セクション、`enemy` / `boss` セクション、`displayPrefix`、HUD/overlay の追加ラベル([01](./01-world-theme.md) §3)を型と fantasy 値に追加する(この時点では参照側は旧フィールドのままでよいため、旧 `value` / `displayValue` フィールドは**併存**させる)。アセットロード処理(`loadThemeAssets` / `getSprite`)を `theme/assetLoader.ts` へ抽出する。

- **検証**: `pnpm check` / `pnpm test` が成功し、`pnpm dev` で v1 と同一の見た目・挙動。

#### Step R2: constants / logic の分離とテスト移行

定数を `constants.ts` へ、型を `logic/types.ts` へ、純関数を `logic/formation.ts` / `logic/gates.ts` へ抽出する。`GamePrototype.tsx` からは再 export して一時的に互換を保ち、`GamePrototype.test.ts` を `logic/formation.test.ts` / `logic/gates.test.ts` に分割(**アサーションは一切変更せず import 先だけ変える** — 移行の正しさの検証を兼ねる)したのち、再 export を削除する。

- **検証**: `pnpm test` で既存 13 テストが全て green のまま。`pnpm check` 成功。

#### Step R3: render/ の分離

描画関数群を `render/field.ts` / `render/entities.ts` へ抽出する。各関数は `(ctx, theme, images, viewport 相当の引数, 対象データ)` を受けて描くだけの形にし、状態を持たせない(この時点では viewport は `{ viewW: 360, viewH: 640 }` 固定値でよい)。

- **検証**: `pnpm check` 成功。`pnpm dev` で v1 と同一の見た目・挙動。

#### Step R4: world.ts / ui/ の分離と StepEvents 化

`createWorldState` と update 群を `logic/world.ts` の `stepWorld(world, viewport, dt, rng)` に集約し、シグナル更新箇所を StepEvents の返却([03](./03-architecture.md) §3)に置き換える。HUD とオーバーレイを `ui/Hud.tsx` / `ui/Overlay.tsx` へ抽出する。`GamePrototype.tsx` → `Game.tsx`、`GamePrototype.module.css` → `Game.module.css` にリネームし、`App.tsx` の import を更新する。

- **検証**: `pnpm check` / `pnpm test` 成功。`pnpm dev` でプレイし、v1 の受け入れ挙動(追従・増減・勝敗・リトライ)がすべて維持されている。ここで **Phase R 完了をコミット単位の区切り**とする。

### Phase V: ビューポート(レスポンシブ)

#### Step V1: computeViewport と可変論理高さ

`viewport.ts` に `Viewport` 型と `computeViewport(vw, vh)`([03](./03-architecture.md) §4)を実装し、テストを書く。`LEADER_Y` 定数を `viewH − LEADER_BOTTOM_OFFSET` の導出に置き換え、描画・更新の高さ依存箇所(ゴールライン可視判定・行カリング・背景)を viewport 引数経由に切り替える。マウント / リトライ時に viewH を確定する。

- **検証**: `pnpm test`(computeViewport のクランプ境界を含む)成功。DevTools のデバイスモードで iPhone 系(比 ~2.16)を選ぶと**上下に帯がなく**プレイでき、判定線が画面下 120px に来る。

#### Step V2: CSS スケールと backing store・リサイズ

`.frame` / `.canvas` の 360×640 リテラルを撤去し、CSS サイズを scale 計算値で与える。backing store を `total = min(scale × min(dpr, DPR_CAP), BACKING_SCALE_CAP)` で再設定する。ResizeObserver を 1 個設置し、**プレイ中は scale と backing store のみ再計算**(viewH は据え置き)とする。

- **検証**: PC フル画面で 1080px 高に拡大表示され、文字・図形がぼやけない(backing store が効いている)。プレイ中にウィンドウをリサイズしてもゲームが飛ばない・判定がずれない。DevTools Performance で 60fps を維持。

### Phase C: クロームテーマ

#### Step C1: .root のグリッド化と CSS 変数注入

`.root` を `grid-template-columns: 1fr auto 1fr` にし、`.sidePanel` を追加する。`--chrome-bg-color` / `--chrome-bg-image` / `--chrome-side-image` / `--chrome-frame-border` を inline style で注入する(未定義画像は `"none"`)。現行 CSS の `background: #000` を削除し、fantasy テーマの `chrome.backgroundColor`(`#020617`)に移管する。

- **検証**: [01](./01-world-theme.md) §5 の grep 2 種がヒット 0 件(ニュートラル色の除外規定を含めて確認)。PC 幅で左右にサイドパネル領域が現れ、モバイル幅では消える。ダミー画像で `backgroundImageSrc` / `sidePanelImageSrc` を設定 → 反映され、外すと色に戻る([04](./04-assets.md) §7 手順 5)。

### Phase G: ゲームプレイ v2(依存順)

実装順は依存関係に従う: 値抽選(G1)が全機能のデータ基盤 → コンボ(G2)は per-cell 値に依存 → ボス戦(G4)の戦闘機構を guarded(G5)が再利用 → スコア(G6)は maxCombo と勝利マージンに依存するため最後。

#### Step G1: ゲート値の抽選

`GateCell` を `{ kind, value, displayValue }` に拡張し、`rollGateValue(kind, distance, rng)` を実装([02](./02-game-design.md) §3 のレンジ表)。スポーン時に値と表記を合成してセルへ保持し、描画・効果適用の参照先をセルに切り替える。theme の旧 `value` / `displayValue` フィールドを削除して `displayPrefix` に一本化する。

- **検証**: `pnpm test`(rollGateValue のレンジ・×3 率・決定性)。プレイして毎行の数値が変わり、表示値と実際の増減が常に一致する。Phase 1 では +4〜+6 / -2〜-3 の狭いレンジしか出ない。

#### Step G2: コンボとフィーバー

`betterSide(row, count)` と、行解決時のコンボ更新・フィーバー発動([02](./02-game-design.md) §4)を実装する。`combo` シグナル、HUD のコンボ表示(`comboLabel`)、フィーバー中のグリフ発光(`feverColor` + 半径 1.2 倍)、増加量 1.5 倍補正を実装する。

- **検証**: `pnpm test`(betterSide の比較・tie)。最善側を選び続けると 5 コンボ目でグリフが発光し、加算ゲートの増加量が表示値より大きくなる(例 "+6" で +9)。悪い側を選ぶとコンボが 0 に戻る。

#### Step G3: スクロール加速

`scrollSpeedAt(distance)`(180 → 230 線形)を実装し、update の速度参照を置き換える。

- **検証**: `pnpm test`(境界値)。終盤に体感で速くなり、Phase 3 でも視認猶予に「見えたのに避けられない」感がない。

#### Step G4: ボス戦フィナーレ

`gamePhase` に `"finale"` を追加し、`applyBattleTick` と finale 分岐([03](./03-architecture.md) §3, §7)、ボス描画(`render/boss.ts`)、ボス HP の Canvas 直描きを実装する。ゴール到達 → スクロール停止 → ボス出現 → 相殺 → 勝敗の流れを作る。

- **検証**: `pnpm test`(applyBattleTick)。大群で到達するとボスを瞬殺し残存体数がリザルトに出る。少数(HP 未満)で到達すると全滅して GameOver。フィナーレ中はドラッグが効かない。

#### Step G5: 守られたゲート(敵集団)

`rollRowPattern` に guarded パターンを追加し(P2/P3 の出現率表を [02](./02-game-design.md) §3 に合わせて更新)、`cell.guard` の抽選・敵集団クラスタ + 体数バッジの描画・「通行料 → ゲート適用」の解決順序を実装する。`betterSide` を guarded 対応に拡張する。

- **検証**: `pnpm test`(rollRowPattern の新分布・betterSide の guarded 比較)。Phase 2 以降で敵集団付き乗算ゲートが出現し、体数バッジが読める。所持数以下の guard を払って乗算を取ると得をし、所持数以上の guard に突っ込むと全滅する。Phase 1 では出現しない。

#### Step G6: スコアとベスト記録

`computeScore` と localStorage 入出力(`logic/score.ts`)、`result` シグナル、リザルトオーバーレイの拡張(スコア内訳・ベスト・NEW RECORD バッジ)を実装する。

- **検証**: `pnpm test`(computeScore)。クリアするとスコアとベストが表示され、ページをリロードしてもベストが残る。ベスト超過時のみ NEW RECORD が出る。GameOver ではスコアブロックが出ない。

### Step F: 仕上げ

1. [04-assets.md](./04-assets.md) §7 のダミー画像検証(1〜7)を実施する。
2. テーマハードコード検査([01](./01-world-theme.md) §5 の grep 2 種)を実行する。
3. [02-game-design.md](./02-game-design.md) §10 のプレイテスト観点を通しでプレイして自己評価し、NO が 3 つ以上なら §9 のノブで調整する。
4. `INITIAL_UNITS` を一時的に 250 にして DevTools Performance で 60fps(≦16.7ms/frame)を確認し、確認後 10 に戻す(guarded の敵集団表示がある行で計測する)。

- **検証**: `pnpm test` / `pnpm check` / `pnpm build` がすべて成功する。

## 3. 実装順の意図

Phase R で「器を先に作る」(挙動不変の分割はレビュー・巻き戻しが容易)、Phase V/C で「どこでも見栄えする」(ゲームルールに触れず表示層だけを差し替える)、Phase G で「面白くする」(データ基盤 → 判断の報酬 → 緊張 → クライマックス → 記録の順に、各ステップ単体でもプレイ価値が上がる)。**G1 の時点で手触りに違和感があれば、先へ進まず [02](./02-game-design.md) §9 のノブで調整する**こと(後工程ほど手触りの修正コストが上がる)。

## 4. テスト仕様

純関数のみを対象とする。Canvas・DOM・シグナル・localStorage の I/O はテストしない(目視検証でカバー)。既存 13 テスト(applyGate 6 / formationOffset 3 / rollRowPattern 4)は Phase R2 で移行し、以降のステップで拡張する。

| 対象 | ケース | 期待 |
| --- | --- | --- |
| `applyGate` | add, 5, 10 / multiply, 2, 10 / subtract, 3, 10 | 15 / 20 / 7 |
| | subtract, 3, 2 | 0(下限で止まる。負にならない) |
| | add, 5, 298 / multiply, 2, 200 | いずれも 300(MAX_UNITS 頭打ち) |
| `formationOffset` | i = 0 | 原点 (0, 0) |
| | i = 1〜50 の全ペア | 座標が互いに一致しない |
| | 任意の i ≥ 1 | 原点からの距離が「SPACING×√i を縦 0.75 倍した楕円上」に一致(誤差許容) |
| `rollRowPattern` | Phase 1 の距離 × rng 全域(0〜1 を 0.01 刻みで掃引) | 返るパターンが Phase 1 の許容集合のみ。**danger / guarded が出ない** |
| | Phase 2 / Phase 3 の距離 × rng 掃引(0〜1 を 0.01 刻み) | 各フェーズの出現率表([02](./02-game-design.md) §3)の累積境界通りにパターンが切り替わる |
| | 同一入力を 2 回 | 同一出力(rng 注入で決定的) |
| `rollGateValue` | 各フェーズ × kind × rng 掃引(0〜0.99) | 値が [02](./02-game-design.md) §3 のレンジ内に収まり、端の rng でレンジ両端が出る |
| | multiply × ×3 率の境界 rng(率の直下 / 直上) | ×2 / ×3 が境界通りに切り替わる |
| `betterSide` | 単純比較(+7 vs ×2 を所持数 6 / 8 で) | 所持数依存で最善側が反転する |
| | guarded(guard 40 + ×2 vs +6 を所持数 100 / 50 で) | 通行料込み比較で反転する |
| | guard ≥ 所持数の側 | 全滅側を最善としない |
| | 両側の結果が同値 | `"tie"` |
| `applyBattleTick` | count 100, hp 40, n 60 | count 60, hp 0(hp 側で止まる) |
| | count 30, hp 100, n 60 | count 0, hp 70(count 側で止まる) |
| | n = 0 | 無変化 |
| `computeScore` | units 150, maxCombo 12 | 150×10 + 12×30 = 1860 |
| | units 0 / maxCombo 0 | 各項が 0 になる |
| `scrollSpeedAt` | distance 0 / GOAL_DISTANCE / 中間 / GOAL 超過 | BASE / MAX / 線形補間値 / MAX でクランプ |
| `computeViewport` | 比 < 1.78(PC)/ 2.17(iPhone 系)/ > 2.5(超縦長) | viewH = 640 / 780 前後 / 900(クランプ)。scale が contain(フレームがビューポートに収まる) |

## 5. 受け入れ基準チェックリスト(最終確認)

実装完了時に以下をすべて確認し、結果を報告すること。

**ゲームプレイ(v2)**

- [ ] **即プレイ可能**: `pnpm dev` 直後にゲームが開始され操作できる(ビルド・ランタイムエラーなし)
- [ ] **値抽選の一貫性**: 全ゲートで表示値と適用結果が一致する。Phase 1 は狭いレンジのみ
- [ ] **guarded の駆け引き**: 体数バッジが常時読め、通行料を払う/逃げるの両方に正解ケースがある
- [ ] **コンボ/フィーバー**: 最善選択でコンボが伸び、5 の倍数でフィーバー(発光 + 増加 1.5 倍)、読み損ねで 0 に戻る
- [ ] **終盤加速**: 速度が 180→230 に上がっても視認猶予 2.0 秒を下回らない
- [ ] **ボス戦**: 大差勝ち・僅差勝ち・全滅負けの 3 パターンを実際に出し、フィナーレ中は入力が無効
- [ ] **スコアとベスト**: クリアでスコア確定、リロード後もベストが残り、更新時のみ NEW RECORD
- [ ] **勝敗とリトライ**: Retry で初期状態(10 体・距離 0・コンボ 0)から再開し、viewH も再確定される

**表示(v2)**

- [ ] **モバイル充填**: 縦横比 1.78〜2.5 の端末エミュレーションで上下に帯が出ない
- [ ] **PC 表示**: フル HD で拡大表示され、ぼやけず、左右にサイドパネル領域が出る
- [ ] **リサイズ安定**: プレイ中のリサイズ・回転でゲームが飛ばない・判定線がずれない
- [ ] **クロームテーマ**: ページ背景色がテーマ由来で、ダミー画像の設定/解除が themeConfig.ts のみで完結する
- [ ] **テーマ分離**: [01](./01-world-theme.md) §5 の grep 2 種が実質 0 件(ニュートラル色の除外規定に従う)

**品質**

- [ ] **性能**: `INITIAL_UNITS` 一時 250 + guarded 行表示ありで 60fps(≦16.7ms/frame)。ユニットに触れる Solid API がゼロ
- [ ] **アセット差し替え**: [04](./04-assets.md) §7 の手順(1〜7)がすべて通り、themeConfig.ts 以外に触れていない
- [ ] **面白さの自己検証**: [02](./02-game-design.md) §10 を通しプレイで評価し、結果(YES/NO と所感)を報告している。NO が 3 つ以上なら調整してから完了とする
- [ ] `pnpm check` / `pnpm test` / `pnpm build` がすべて成功する(lefthook の pre-push と同等)

## 6. スコープ外(v2 で実装しないもの)

- **画像アセットの制作そのもの**(差し替えの仕組みと規約のみ。ダミー画像検証は行う)
- v3 候補([02](./02-game-design.md) §11): 回避障害物(per-unit 衝突)、変動値ゲート、複数ステージ / エンドレス
- 効果音・BGM、パーティクル、画面シェイク、石化アニメーション、ボスの登場カットイン
- タイトル画面・タップスタート(`GamePhase` の `"ready"` は拡張点として型にのみ存在)
- テーマ切り替え UI(構造上は default export の差し替えで対応可能)
- スコアのオンライン共有・ランキング(ベストは localStorage のみ)
