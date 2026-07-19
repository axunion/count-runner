# 05. 実装計画 v2.1

[02-design-v2.1.md](./02-design-v2.1.md) を実現するための段階的実装計画。各フェーズは 1 コミット単位で、`pnpm check && pnpm test` が green で終わること。プレイフィールに影響するフェーズは verify スキル(ブラウザ実プレイ)で確認する。

**フェーズ順の根拠**: キーボード(1)は結合ゼロで、以後の PC プレイテストを楽にするため最初。ペーシング + ギミック(2)はデータモデルの構造変更であり、選択フィードバック(3)が使う `chosenSide` と、アセット(4)のスケール前提(`UNIT_RADIUS`、可変ゲート幅)を確定させるため先行。アセットは全ジオメトリ確定後の最後。

## Phase 1 — キーボード操作([02] §5)

**実装**:

- `src/game/constants.ts`: `KEYBOARD_MOVE_SPEED = 420` を追加。
- `src/game/logic/input.ts`(新規): 純関数 2 つ。
  - `keyboardDir(left: boolean, right: boolean): -1 | 0 | 1` — 両押しは 0。
  - `nextTargetX(current: number, dir: -1 | 0 | 1, dt: number): number` — `KEYBOARD_MOVE_SPEED` で移動し、`LEADER_CLAMP_MARGIN`〜`VIEW_W - LEADER_CLAMP_MARGIN` にクランプ。
- `src/game/Game.tsx`: `onMount` で window に `keydown`/`keyup` を登録(`onCleanup` で解除)。左右キーの押下状態を plain な boolean 2 つで保持(シグナル不要 — HUD に出ない)。`blur` で両方クリア。矢印・Space は `preventDefault`。update 内、`stepWorld` の前に `if (!world.pointerActive && dir !== 0) world.targetX = nextTargetX(...)`。Enter/Space はオーバーレイ表示中のみ retry を発火。

**テスト**(`input.test.ts`): 両押し → 0 / 片押しの方向 / dt に比例した移動量 / 両端クランプ / dir 0 で不変。

**検証**: `pnpm test`。verify スキルで — 矢印と A/D で操作できる、ドラッグ中はキーが効かない(ポインター優先)、離すとキーが復帰、Enter でリトライ、ページがスクロールしない。

## Phase 2 — ペーシング + ギミック + 群れリバランス([02] §2・§3・§6)

**型変更**(`src/game/logic/types.ts`):

```ts
interface GateRow {
  y: number;
  left: GateCell;
  right: GateCell;
  resolved: boolean;
  boundaryX: number;                 // 対称時は GATE_BOUNDARY_DEFAULT (180)
  oscillation?: { amp: number; period: number; phase: number };
  speedMult: number;                 // 通常 1、高速行 > 1
  chosenSide?: "left" | "right";     // Phase 3 が使用。解決時に記録
  resolvedAt?: number;               // world.elapsed。解決時に記録
}
```

**新規 `src/game/logic/rows.ts`**(gates.ts / world.ts の肥大化を防ぐ分離。行のジオメトリとスポーン抽選を担当):

- `boundaryXAt(row, elapsed)` — `boundaryX + amp * sin(2π * elapsed / period + phase)` をクランプ。**判定(world.ts)と描画(entities.ts)が共有する唯一の真実**。
- `cellRects(boundaryX)` — `{ left: {x, width}, right: {x, width} }`。左 = `[GATE_LANE_MARGIN, b - GATE_CELL_GAP/2]`、右 = `[b + GATE_CELL_GAP/2, VIEW_W - GATE_LANE_MARGIN]`。b=180 で v2 の 12/164/184/164 を再現する(`GATE_CELL_WIDTH/LEFT_X/RIGHT_X` 定数は削除)。
- `narrowSide(left, right)` — kind ランク(multiply > add > subtract)で良い側を返す。danger 行は減少値が小さい側。同格なら `undefined`(対称のまま)。
- `rollRowMods(left, right, distance, rng)` — `{ boundaryX, oscillation?, speedMult }`。Phase 2 以降: 良い側へ `GATE_ASYM_OFFSET` シフト、`GATE_OSC_RATES` で振動抽選(振幅・周期・位相もロール)、Phase 3 で `FAST_ROW_RATE` の高速行抽選。Phase 1 は常に対称・振動なし・等速。
- `rollRowGap(distance, rng)` — `ROW_GAP_BASE[phase] ± ROW_GAP_JITTER`、Phase 2 以降はクラスタ(150)/ ブリーザー(×1.5)を先にロール。

**定数変更**(`src/game/constants.ts`): [02] §2・§3・§6 の表のとおり。
変更: `GOAL_DISTANCE=4600`, `PHASE2_START=1400`, `PHASE3_START=3000`, `SCROLL_SPEED_BASE=170`, `SCROLL_SPEED_MAX=250`, `ROW_PATTERN_RATES.phase1={0.7,0.2,0.1,0,0}`, `GATE_ADD_RANGES=[2,4]/[3,6]/[4,8]`, `GATE_SUBTRACT_RANGES=[1,2]/[2,4]/[3,6]`, `MAX_UNITS=120`, `UNIT_RADIUS=8`, `FORMATION_SPACING=12`, `BOSS_HP_BASE=60`, `BATTLE_DRAIN_RATE=30`, `BEST_STORAGE_KEY="count-runner:best-v2.1"`。
削除: `ROW_INTERVAL`, `GATE_CELL_WIDTH`, `GATE_CELL_LEFT_X`, `GATE_CELL_RIGHT_X`。
追加: `ROW_GAP_BASE={phase1:300, phase2:250, phase3:220}`, `ROW_GAP_JITTER=50`, `ROW_CLUSTER_RATE=0.15`, `ROW_CLUSTER_GAP=150`, `ROW_BREATHER_RATE=0.15`, `ROW_BREATHER_MULT=1.5`, `GATE_LANE_MARGIN=12`, `GATE_CELL_GAP=8`, `GATE_BOUNDARY_DEFAULT=180`, `GATE_ASYM_OFFSET=50`, `GATE_BOUNDARY_MIN=92`, `GATE_BOUNDARY_MAX=268`, `GATE_OSC_RATES={phase1:0, phase2:0.15, phase3:0.3}`, `GATE_OSC_AMP_MIN=25`, `GATE_OSC_AMP_MAX=45`, `GATE_OSC_PERIOD_MIN=1.6`, `GATE_OSC_PERIOD_MAX=2.4`, `FAST_ROW_RATE=0.2`, `FAST_ROW_SPEED_MULT=1.4`, `FAST_ROW_EXTRA_GAP_MULT=1.4`。

**`src/game/logic/world.ts` 変更**:

- `spawnRowsIfNeeded`: セル生成後に `rollRowMods` の結果を行へ展開。`nextRowDistance += rollRowGap(...) * (speedMult > 1 ? FAST_ROW_EXTRA_GAP_MULT : 1)`。
- 行の移動: `row.y += scrollDelta * row.speedMult`。
- `resolveRowCollisions`: 中央固定分割(`leaderX < VIEW_W / 2`)を廃止 →
  `const b = boundaryXAt(row, world.elapsed); const isLeft = world.leaderX < b;`
  解決時に `chosenSide` / `resolvedAt` を記録し、**ジオメトリを凍結**する(`row.boundaryX = b; row.oscillation = undefined;`)。フローティングテキストの位置は `cellRects(b)` のセル中心。

**`src/game/render/entities.ts` 変更**: `drawGateRows` に `elapsed` を追加し、行ごとに `cellRects(boundaryXAt(row, elapsed))` で描画(ガード群バッジも実セル中心)。高速行には行上部にストリーク線の予告([02] §3.4)をプレースホルダー描画で付ける。

**テスト**:

- `rows.test.ts`(新規): `boundaryXAt` — 振動なしで恒等 / 既知の t で正弦値 / 両端クランプ。`cellRects` — b=180 で v2 レイアウト再現 / クランプ範囲内で幅が常に 76 以上。`narrowSide` — 乗算 vs 加算 / danger の小さい側 / 同格 undefined。`rollRowGap` / `rollRowMods` — rng スイープで範囲・レート境界・Phase 1 の不変条件(常に対称)を検証。
- `gates.test.ts` / `world.test.ts`: 新フェーズ境界・レンジ・速度(170 / 250 / 中点 210 @ 2300)に追随。

**検証**: `pnpm test`。verify スキルで — 1 周が約 24 秒 / 序盤 5 行が明らかに簡単 / 非対称・振動・クラスタ・高速行が数プレイ内に視認できる / 振動境界の際どい横断で見た目どおりの側が選ばれる / 120 体到達時も 60fps。

## Phase 3 — 選択フィードバック([02] §4)

**実装**:

- `src/game/constants.ts`: `RESOLVE_CHOSEN_HOLD=0.35`, `RESOLVE_RING_LIFETIME=0.4`, `RESOLVE_UNCHOSEN_FADE=0.25` を追加。
- `src/game/logic/feedback.ts`(新規): `resolveFeedback(chosen: boolean, age: number): { alpha: number; ringAlpha: number }`。選択側: alpha 0.95 を HOLD 秒保持後 0.4 へイーズ、ringAlpha は寿命で線形減衰。非選択側: 0.85 → 0.1 を FADE 秒で、ringAlpha 0。
- `src/game/render/entities.ts` `drawGateCell`: 一律 `resolved ? 0.25 : 0.85` を廃止し、解決済みセルは `resolveFeedback(cell === chosenSide, elapsed - resolvedAt)` の alpha を使用。選択セルには塗り/スプライトの**後**にハイライトリング(3px ストローク roundRect)を ringAlpha で描く。

**テスト**(`feedback.test.ts`): 保持中は 0.95 のまま / 双方の終端 alpha / リングが寿命で 0 / 非選択側が FADE 秒で完全フェード。

**検証**: `pnpm test`。verify スキルで — 選んだ側が明るく残ってリングが光る / 選ばなかった側が素早く消える / 振動行でも選択側が明確。

## Phase 4 — SVG アセット制作・登録([04-assets.md])

**制作**(すべて SVG、`public/assets/themes/fantasy/` に配置。世界観・パレットは [01-world-theme.md](./01-world-theme.md)):

| キー | ファイル | 内寸(@2x px) | 内容 |
| --- | --- | --- | --- |
| `unit` | unit.svg | 192×48(48×48 ×4) | 見習い魔法使いの走り 4 コマ(`frameCount:4, fps:8`、表示 24×24) |
| `enemyUnit` | enemy-unit.svg | 192×48 | Stone Legion 4 コマ |
| `leaderGlyph` | leader-glyph.svg | 64×64 | 魔法陣(静止。回転はコード側) |
| `gateAdd` / `gateMultiply` / `gateSubtract` | gate-*.svg | 328×112 | 横伸縮(76〜252px)に耐える構図。効果数字は焼き込まない |
| `boss` | boss.svg | 240×240 | Gate Guardian |
| `background` | background.svg | 720×640 | 上下シームレスの縦ループタイル |
| `goalBanner` | goal-banner.svg | 720×160 | SANCTUM の門 |
| chrome | chrome-background.svg | 1920×1280 | ページ背景(`chrome.backgroundImageSrc`) |

`overlayClear` / `overlayGameOver` は見送り(Overlay.tsx に画像表示がなく、優先度 ★☆☆ のために投機コードを足さない)。

**コード変更**(2 点のみ):

- `src/game/render/boss.ts` `drawGuardCluster`: `images` を受け取り `enemyUnit` のスプライト分岐を追加(`drawUnits` と同じコマ計算)。呼び出し元(`entities.ts`)から渡す。唯一スプライト分岐が欠けていた描画関数。
- `src/game/render/entities.ts` `drawUnits`: `img.naturalWidth === 0` ならプレースホルダーへフォールバックするガードを 1 行(SVG の width/height 属性漏れ対策)。

**`src/game/theme/themeConfig.ts`**: `assets` に上記エントリを登録、`chrome.backgroundImageSrc` を設定。**触るソースはこのファイルと上記 2 点のみ**であること(差し替え原則の実証)。

**検証**: `pnpm check`。verify スキルで — 120 体でキャラが個体として読める / 最狭 76px でもゲートが読める / 背景スクロールに継ぎ目がない / ガード群がスプライト表示される。

## Phase 5 — 受け入れ検証(v2 の Step F を引き継ぎ)

1. **テーマハードコード grep**([01-world-theme.md](./01-world-theme.md) §5)が 0 件(ニュートラル色の例外規定は同章)。
2. **プレイテスト自己評価**: [02-design-v2.1.md](./02-design-v2.1.md) §8 の全項目を実プレイで自問し、結果を報告。NO 3 つ以上なら §7 のノブで調整。
3. **パフォーマンス**: 120 体 + スプライト ON + guarded 行の状態で DevTools Performance ≤ 16.7ms/frame。
4. **差し替え耐久**(旧 04 §7 の受け入れ基準を実アセットで実施): 任意の assets エントリを 1 つ外す → その要素だけプレースホルダーに戻る / `src` を壊す → コンソール警告 + プレースホルダーで続行 / いずれも `themeConfig.ts` 以外に触れない。確認後に元へ戻す。
5. `pnpm check && pnpm test && pnpm build` がすべて成功。

## テスト仕様(サマリ)

| ファイル | 対象 |
| --- | --- |
| `input.test.ts`(新) | `keyboardDir` / `nextTargetX` |
| `rows.test.ts`(新) | `boundaryXAt` / `cellRects` / `narrowSide` / `rollRowGap` / `rollRowMods` |
| `feedback.test.ts`(新) | `resolveFeedback` |
| `gates.test.ts` / `world.test.ts`(更新) | 新定数(フェーズ境界・レンジ・速度)への追随 |

## スコープ外(v2 から引き継ぎ)

- 効果音・BGM・パーティクル・画面シェイク・石化アニメーション・ボス登場カットイン
- タイトル画面・タップスタート(`GamePhase` の `"ready"` は型のみの拡張点)
- テーマ切り替え UI(default export の差し替えで対応可能な構造は維持)
- スコアのオンライン共有・ランキング(ベストは localStorage のみ)
- v3 候補([02-design-v2.1.md](./02-design-v2.1.md) §9): 回避障害物、変動値ゲート、複数ステージ / エンドレス
