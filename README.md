# vite-solid-template

A minimal template for building [Solid](https://solidjs.com) apps with [Vite](https://vite.dev).

## Features

- [Solid](https://solidjs.com) with TypeScript
- [Vite](https://vite.dev) with [Lightning CSS](https://lightningcss.dev) for CSS transforms and minification
- [Biome](https://biomejs.dev) for linting and formatting (Solid rules enabled)
- [Vitest](https://vitest.dev) for testing (jsdom environment)
- [lefthook](https://lefthook.dev) git hooks: format on commit, check and test on push
- [Kobalte](https://kobalte.dev) and [Lucide](https://lucide.dev) for UI components and icons

## Requirements

- Node.js 24 (see `.node-version`)
- pnpm

## Getting Started

```bash
pnpm install
```

This also installs the git hooks.

## Scripts

| Command        | Description                              |
| -------------- | ---------------------------------------- |
| `pnpm dev`     | Start the dev server                     |
| `pnpm build`   | Type-check and build for production      |
| `pnpm preview` | Preview the production build             |
| `pnpm test`    | Run tests                                |
| `pnpm check`   | Lint, format check, and type-check       |
| `pnpm fix`     | Fix lint and format issues automatically |
