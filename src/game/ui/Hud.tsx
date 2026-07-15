import styles from "../Game.module.css";
import type { ThemeAssetConfig } from "../theme/themeConfig.ts";

interface HudProps {
  theme: ThemeAssetConfig;
  unitCount: number;
  combo: number;
  isFever: boolean;
  progressPercent: number;
  valueRef?: (el: HTMLDivElement) => void;
}

export function Hud(props: HudProps) {
  return (
    <div class={styles.hud}>
      <div>
        <div class={styles.hudLabel}>{props.theme.hud.scoreLabel}</div>
        <div ref={props.valueRef} class={styles.hudValue}>
          {props.unitCount}
        </div>
      </div>
      <div
        class={styles.hudCombo}
        classList={{ [styles.fever]: props.isFever }}
      >
        <div class={styles.hudLabel}>{props.theme.hud.comboLabel}</div>
        <div>{props.combo}</div>
      </div>
      <div class={styles.progressTrack}>
        <div
          class={styles.progressFill}
          style={{ width: `${props.progressPercent}%` }}
        />
      </div>
    </div>
  );
}
