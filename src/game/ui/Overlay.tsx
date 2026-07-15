import { Show } from "solid-js";
import styles from "../Game.module.css";
import type { GamePhase } from "../logic/types.ts";
import type { ThemeAssetConfig } from "../theme/themeConfig.ts";

interface OverlayProps {
  theme: ThemeAssetConfig;
  gamePhase: GamePhase;
  unitCount: number;
  onRetry: () => void;
}

export function Overlay(props: OverlayProps) {
  return (
    <Show
      when={props.gamePhase === "cleared" || props.gamePhase === "gameover"}
    >
      <div class={styles.overlay}>
        <div class={styles.overlayTitle}>
          {props.gamePhase === "cleared"
            ? props.theme.overlay.clearTitle
            : props.theme.overlay.gameOverTitle}
        </div>
        <Show
          when={
            props.gamePhase === "cleared"
              ? props.theme.assets.overlayClear
              : props.theme.assets.overlayGameOver
          }
        >
          {(asset) => (
            <img
              src={asset().src}
              width={asset().displayWidth}
              height={asset().displayHeight}
              alt=""
            />
          )}
        </Show>
        <div class={styles.overlayScore}>
          {props.theme.overlay.resultLabel}: {props.unitCount}
        </div>
        <button
          type="button"
          class={styles.retryButton}
          onClick={props.onRetry}
        >
          {props.theme.overlay.retryLabel}
        </button>
      </div>
    </Show>
  );
}
