# Count Runner プロトタイプ 計画書

群衆ランナー系ゲーム「Count Runner」プロトタイプの実装計画書。AI(または開発者)がこのドキュメント群だけを頼りに、実装を最後まで完了できることを目的とする。

この計画書は**コードを直接書かない**。仕様・データ構造・数式・パラメータ・検証方法を定義し、コードの書き方は実装者の裁量に委ねる。ただし「満たすべき性質」と「検証方法」は曖昧さなく定義する。

## ゲーム概要

- 360×640 固定解像度のモバイル縦画面ゲーム。フィールドが下方向へ自動スクロールし、プレイヤーはポインター操作でリーダーを左右に動かす。
- 一定間隔で流れてくる「左右 2 択のゲート行」を通過するたびにユニット数が増減(+5 / ×2 / -3)する。
- ゴール距離に到達すれば Clear、ユニット数が 0 になれば GameOver。1 プレイ約 35 秒。
- テーマは「Sword, Shield, and Sorcery」— 見習い魔法使いの群れがマナを集め、聖域 SANCTUM を目指す(世界観の詳細は [01-world-theme.md](./01-world-theme.md))。

## この計画書が目指すもの(3 つのゴール)

1. **まず動くこと** — プレースホルダー描画(図形)で全ゲームループが完成し、`pnpm dev` 直後にプレイできる。
2. **面白いこと** — 「群れが増える快感」「左右択のリスク/リワード」「全滅の緊張」を成立させる。面白さの設計は [02-game-design.md](./02-game-design.md) で独立して定義し、実装の判断基準にする。
3. **世界観を後から注入できること** — キャラクター・ゲート・背景などの見た目は、後日制作する画像・スプライトに**コード変更なし(設定ファイルの追記のみ)で差し替えられる**構造にする。必要な画像サイズ・スプライトシート規約は [04-assets.md](./04-assets.md) で先に確定させておく。

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

エントリポイントは `src/index.tsx` → `src/App.tsx`。既存の import 流儀に合わせ、相対 import には拡張子を付ける。

## ゲームライブラリについて

PixiJS / Phaser 等は**導入しない**。本プロトタイプの描画量(スプライト 300 枚 + 矩形数個 + テキスト)は素の Canvas 2D で 60fps に十分到達できる。アセット差し替えも Canvas の `drawImage` ベースで設計する([04-assets.md](./04-assets.md))。将来、大量パーティクルや高度なエフェクトが必要になった時点で PixiJS(WebGL)への移行を検討する。

## 実装の成果物

```
src/
  game/
    GamePrototype.tsx          // 新規: ゲーム本体(定数・状態・ループ・描画・入力・純関数)
    GamePrototype.module.css   // 新規: コンテナ・HUD・オーバーレイのスタイル
    themeConfig.ts             // 新規: テーマ型 + fantasy テーマ(default export)
    GamePrototype.test.ts      // 新規: 純関数の Vitest ユニットテスト
  App.tsx                      // 書き換え: <GamePrototype /> をマウントするだけにする
public/
  assets/themes/fantasy/       // 新規(空でよい): 後日制作するアセットの置き場所
```

上記以外の既存ファイル(`src/index.tsx`、設定ファイル群)は変更しない。依存パッケージの追加もしない。

## ドキュメント構成と読み順

1. **[01-world-theme.md](./01-world-theme.md)** — 世界観・アートディレクション・テーマデータモデル(`ThemeAssetConfig`)と fantasy テーマの具体値。
2. **[02-game-design.md](./02-game-design.md)** — ゲームデザイン。面白さの柱、二択判断の設計、難易度曲線、フィードバック演出、プレイテスト観点。
3. **[03-architecture.md](./03-architecture.md)** — 技術アーキテクチャ。状態管理・ゲームループ・描画(プレースホルダー/画像の両対応)・入力・群衆・衝突・スポーン・CSS 設計・定数表。
4. **[04-assets.md](./04-assets.md)** — アセット仕様。必要画像の一覧とサイズ、スプライトシート規約、命名・配置、差し替え手順。
5. **[05-implementation-plan.md](./05-implementation-plan.md)** — 実装計画。段階的な実装ステップ(各段階に検証方法付き)、制約、テスト仕様、受け入れ基準。

実装時は 01〜04 で全体像を把握したのち、05 のステップを上から順に実施すること。ゲームプレイの手触りに迷ったら 02 を判断基準にする。

## 設計上の最重要原則

1. **リアクティブ境界の最小化** — Solid のシグナルに載せるのは HUD / オーバーレイの DOM 表示値のみ。フレームごとに変わる状態は plain object に置き、rAF ループが直接書き換える。**ユニット単位のリアクティブ更新は禁止**。
2. **見た目の完全分離** — テーマ文字列・色・画像参照は `themeConfig.ts` にのみ存在する。描画コードは「テーマに画像があれば画像、なければプレースホルダー図形」を自動で選ぶ。**画像差し替えにコード変更を要求しない**ことが受け入れ基準に入る。
3. **面白さ優先の調整可能性** — バランスに関わる数値はすべて名前付き定数とし、[02-game-design.md](./02-game-design.md) の「調整ノブ」と対応させる。マジックナンバーを描画・更新ロジックに直書きしない。
4. **品質ゲート** — 各実装ステップで `pnpm dev` による動作確認を行い、最終的に `pnpm check` / `pnpm test` / `pnpm build` がすべて成功すること。
