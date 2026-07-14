# Count Runner v2 計画書

群衆ランナー系ゲーム「Count Runner」の v2 実装計画書。AI(または開発者)がこのドキュメント群だけを頼りに、実装を最後まで完了できることを目的とする。

この計画書は**コードを直接書かない**。仕様・データ構造・数式・パラメータ・検証方法を定義し、コードの書き方は実装者の裁量に委ねる。ただし「満たすべき性質」と「検証方法」は曖昧さなく定義する。

> **v1 からの改訂について**: プロトタイプ(v1)は全ステップ実装・検証済み。本書は v1 の仕様を土台に、v2 の要求(下記)を織り込んだ**現行版**である。v1 の完了記録は git 履歴を正とする。

## ゲーム概要

- モバイル縦画面ファーストのゲーム。論理幅 360px 固定・論理高さは端末縦横比に応じて 640〜900px の可変(PC では拡大表示 + 左右テーマ装飾パネル。[03-architecture.md](./03-architecture.md) §4)。
- フィールドが下方向へ自動スクロールし、プレイヤーはポインター操作でリーダーを左右に動かす。
- 一定間隔で流れてくる「左右 2 択のゲート行」を通過するたびにユニット数が増減する。効果値はスポーン時に抽選され(+3〜+10 / ×2・×3 / -2〜-8)、毎行が固有の計算問題になる。
- ゴール距離に到達すると**ボス戦フィナーレ**: 群れをボスの HP と相殺させ、1 体でも残れば Clear。道中でユニット数が 0 になれば GameOver。1 プレイ約 35 秒。
- クリア時はスコア(残存体数 + 最大コンボ)を算出し、ベスト記録(localStorage)と比較して表示する。
- テーマは「Sword, Shield, and Sorcery」— 見習い魔法使いの群れがマナを集め、聖域 SANCTUM を目指す(世界観の詳細は [01-world-theme.md](./01-world-theme.md))。

## v2 の目的(4 つのゴール)

1. **面白いこと(最優先)** — v1 は成立していたが単調だった。ゲート値ランダム化・コンボ/フィーバー・終盤加速・ボス戦・敵集団に守られたゲート・スコアとベスト記録により、「毎行の判断が非自明 → 終盤の緊張 → クライマックスで消費 → 記録更新のためのリトライ」という起承転結を作る([02-game-design.md](./02-game-design.md))。
2. **どの画面でも見栄えすること** — モバイルでは画面の上下いっぱいまでゲーム領域が広がり、PC では拡大表示 + 左右のテーマ装飾パネルで間延びしない([03-architecture.md](./03-architecture.md) §4)。
3. **ゲーム外周(クローム)もテーマ注入できること** — ページ背景・サイドパネルの色や画像を `themeConfig.ts` だけで指定できる([01-world-theme.md](./01-world-theme.md) §3)。
4. **規模に耐える構造であること** — v1 の単一ファイル(773 行)を logic / render / theme / ui のモジュール構成に分割し、機能追加の置き場所を明確にする([03-architecture.md](./03-architecture.md) §12)。

## 前提スタック(重要)

このリポジトリは **SolidJS** テンプレートである。**React ではない**。

| 項目 | 内容 |
| --- | --- |
| UI フレームワーク | SolidJS ^1.9.13(`createSignal` / `onMount` / `onCleanup` / `<Show>`。React API は存在しない) |
| ビルド | Vite 8 + vite-plugin-solid + Lightning CSS |
| TypeScript | ~6.0.2。`verbatimModuleSyntax`(型 import は `import type` 必須)+ `erasableSyntaxOnly`(**enum / namespace 禁止**) |
| CSS | CSS Modules(`*.module.css`)。Vite ネイティブ対応のため追加設定不要 |
| Lint / Format | Biome(ダブルクオート、未使用変数・引数エラー) |
| テスト | Vitest(jsdom、`pnpm test`) |
| パッケージ管理 | pnpm(Node.js 24) |
| Git hooks | lefthook(pre-commit: biome 自動修正 / pre-push: `pnpm check` + `pnpm test`) |

エントリポイントは `src/index.tsx` → `src/App.tsx`。既存の import 流儀に合わせ、相対 import には拡張子を付ける。パスエイリアスは導入しない。

## ゲームライブラリについて(v2 で再検討済み)

v2 の機能追加(ボス戦・敵集団・コンボ演出)を踏まえて再評価したが、**引き続き PixiJS / Phaser 等は導入しない**。

- 描画量は最大でも「スプライト 300 枚 + 敵集団 + 矩形数個 + テキスト」で、素の Canvas 2D の 60fps 圏内に収まる。ボス戦も「単一スプライト + カウント相殺」であり物理エンジンは不要。
- Phaser のシーン/ローダー構造は「テーマ分岐描画 + Solid シグナル最小化」の既存規律と競合する。PixiJS の WebGL バッチングは解決すべき問題が存在しない。
- 補助ライブラリも不要: easing は指数減衰 lerp + 数式で足りる(必要になれば ~20 行の手書き)。決定的乱数が必要になれば mulberry32 を ~5 行で書く。localStorage は try/catch 付きの薄い関数(~30 行)で扱う([03-architecture.md](./03-architecture.md) §1)。

将来、大量パーティクルや高度なエフェクトが必要になった時点で PixiJS(WebGL)への移行を検討する。

## 実装の成果物

```
src/
  game/
    constants.ts            // 調整定数表(03 §10 と 1:1 対応)
    viewport.ts             // Viewport 型 + computeViewport 純関数
    viewport.test.ts
    theme/
      themeConfig.ts        // テーマ型 + fantasy テーマ(default export)
      assetLoader.ts        // アセットプリロード / 取得
    logic/
      types.ts              // Unit / GateRow / FloatText / WorldState / GamePhase
      formation.ts          // formationOffset / フォーメーション再割当て
      formation.test.ts
      gates.ts              // applyGate / rollRowPattern / rollGateValue / betterSide
      gates.test.ts
      battle.ts             // applyBattleTick(ボス戦)
      battle.test.ts
      combo.ts              // コンボ / フィーバー判定
      combo.test.ts
      score.ts              // computeScore + ベスト記録の localStorage 入出力
      score.test.ts
      world.ts              // createWorldState + stepWorld(→ StepEvents)
    render/
      field.ts              // 背景 / ゴールライン描画
      entities.ts           // ゲート行 / ユニット / リーダーグリフ / フローティングテキスト描画
      boss.ts               // ボス / 敵集団描画
    ui/
      Hud.tsx               // スコア / 進捗 / コンボ表示
      Overlay.tsx           // Clear / GameOver / リザルト
    Game.tsx                // コンポーネント本体(canvas / rAF / 入力 / リサイズ / クローム / シグナル)
    Game.module.css
  App.tsx                   // <Game /> をマウントするだけ(v1 から実質変更なし)
public/
  assets/themes/fantasy/    // 実画像を配置する際に作成する(04-assets.md §6 のパス規約)
```

v1 の `GamePrototype.tsx` / `GamePrototype.module.css` / `themeConfig.ts` / `GamePrototype.test.ts` は上記へ分割・移行して削除する。依存パッケージの追加はしない。

## ドキュメント構成と読み順

1. **[01-world-theme.md](./01-world-theme.md)** — 世界観・アートディレクション・テーマデータモデル(`ThemeAssetConfig`。クローム/ボス/敵集団を含む)と fantasy テーマの具体値。
2. **[02-game-design.md](./02-game-design.md)** — ゲームデザイン。面白さの柱、ゲート値抽選、コンボ/フィーバー、ボス戦、難易度曲線、フィードバック演出、プレイテスト観点。
3. **[03-architecture.md](./03-architecture.md)** — 技術アーキテクチャ。ビューポート/レスポンシブ、状態管理、ゲームループ、描画、入力、群衆、衝突、スポーン、CSS 設計、定数表、モジュール構成。
4. **[04-assets.md](./04-assets.md)** — アセット仕様。必要画像の一覧とサイズ、スプライトシート規約、クローム画像、命名・配置、差し替え手順。
5. **[05-implementation-plan.md](./05-implementation-plan.md)** — 実装計画。リファクタリング → ビューポート → クローム → ゲームプレイの段階的ステップ(各段階に検証方法付き)、テスト仕様、受け入れ基準。

実装時は 01〜04 で全体像を把握したのち、05 のステップを上から順に実施すること。ゲームプレイの手触りに迷ったら 02 を判断基準にする。

## 設計上の最重要原則

1. **リアクティブ境界の最小化** — Solid のシグナルに載せるのは HUD / オーバーレイの DOM 表示値のみ。フレームごとに変わる状態は plain object に置き、rAF ループが直接書き換える。**ユニット単位のリアクティブ更新は禁止**。
2. **見た目の完全分離** — テーマ文字列・色・画像参照は `theme/themeConfig.ts` にのみ存在する。描画コードは「テーマに画像があれば画像、なければプレースホルダー図形」を自動で選ぶ。ゲーム外周のクロームも同じ規律に従う。**画像差し替えにコード変更を要求しない**ことが受け入れ基準に入る。
3. **面白さ優先の調整可能性** — バランスに関わる数値はすべて `constants.ts` の名前付き定数とし、[02-game-design.md](./02-game-design.md) の「調整ノブ」と対応させる。マジックナンバーを描画・更新ロジックに直書きしない。
4. **ロジックと表示の分離** — シミュレーションは `logic/`(純関数 + `stepWorld`)に閉じ、Solid シグナルへの反映は `Game.tsx` が `stepWorld` の返すイベントを写像する形で行う([03-architecture.md](./03-architecture.md) §3)。
5. **品質ゲート** — 各実装ステップで `pnpm dev` による動作確認を行い、最終的に `pnpm check` / `pnpm test` / `pnpm build` がすべて成功すること。
