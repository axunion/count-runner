---
name: verify
description: Verify a Count Runner change end-to-end by launching the dev server and playing the game in a browser. Use after implementing a step of spec/05-implementation-plan.md, or whenever asked to confirm the game actually works (not just typechecks).
---

# Verify Count Runner

Verify changes by driving the real game, not just by running static checks. The game is a Canvas app: `pnpm check` passing does NOT mean the game renders or plays correctly.

## Step 1: Static gates (fast fail)

```sh
pnpm check && pnpm test
```

If either fails, stop and report - no point launching the browser.

## Step 2: Launch

Start the dev server in the background:

```sh
pnpm dev
```

Note the URL from its output (default `http://localhost:5173`). Reuse an already-running server if one exists.

## Step 3: Drive the game in the browser

Use the Playwright MCP tools (`browser_navigate`, `browser_take_screenshot`, `browser_evaluate`, pointer interactions). If Playwright MCP is unavailable, fall back to asking the user to verify manually with a concrete checklist.

1. **Boot**: navigate to the URL, take a screenshot. Expect a 360×640 dark canvas centered in the viewport, HUD label + count visible, no console errors (`browser_console_messages`).
2. **Pointer follow**: drag horizontally across the lower half of the canvas (pointer down → move → up). Take screenshots before/after; the leader glyph and crowd must have shifted toward the drag position.
3. **Gate effects**: wait for gate rows to pass, screenshot around a resolution moment. Verify HUD count changed consistently with the gate type that was crossed (+5 / x2 / -3), and passed rows render dimmed.
4. **Win/Lose** (when implemented): steer into subtract gates until count reaches 0 → GameOver overlay; or survive to the goal → Clear overlay. Verify the Retry button restores the initial state.
5. **Performance spot-check** (when the crowd logic exists): via `browser_evaluate`, sample `requestAnimationFrame` deltas over ~2 seconds and report the average FPS. Expect ≈60fps. For the 250-unit stress case defer to the procedure in spec/05 §5 (temporary INITIAL_UNITS change - remember to revert).

## Step 4: Report

Summarize in Japanese: which of the steps above were exercised, what was observed (attach screenshot paths), any console errors, and FPS if measured. Map observations to the acceptance criteria in `spec/05-implementation-plan.md` §5 where applicable. If a criterion cannot be verified yet (feature not implemented), say so explicitly rather than marking it passed.

## Cleanup

Kill the dev server you started (leave user-started servers running). Revert any temporary constant changes made for stress testing.
