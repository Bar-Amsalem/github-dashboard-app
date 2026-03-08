# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Electron + React desktop app that authenticates with GitHub (via `gh` CLI) and displays the user's open pull requests with review status and CI check information.

## Build Commands

```bash
yarn build                    # Build all packages (topological order via workspaces)
yarn dev                      # Run electron-app in dev mode (Vite + Electron)
```

Per-package builds:
```bash
yarn workspace @gh-dashboard/github-types build
yarn workspace @gh-dashboard/github-gh-cli build
yarn workspace @gh-dashboard/github-ui build
yarn workspace @gh-dashboard/electron-app build
```

Packages must be built in dependency order: `github-types` → `github-gh-cli` / `github-ui` → `electron-app`.

## Architecture

Yarn workspaces monorepo with 4 packages under `packages/`:

- **`github-types`** — Pure TypeScript types and the `IGitHubClient` interface. No runtime dependencies. All other packages depend on this.
- **`github-gh-cli`** — `GhCliClient` class implementing `IGitHubClient` using `gh` CLI subprocess calls (`execFile`). Node-only (not bundled for browser).
- **`github-ui`** — React components (`App`, `Dashboard`, `LoginScreen`) and styles. Depends only on `github-types`, never on implementation. Consumes a `GitHubAPI` interface via React context (`GitHubAPIProvider`/`useGitHubAPI`).
- **`electron-app`** — Composition root. Electron main process instantiates `GhCliClient` and exposes it via IPC. Renderer bridges `window.electronAPI` (from preload) to the `GitHubAPIProvider` context that `github-ui` consumes.

Key abstraction: UI components never reference `gh` CLI or Electron APIs directly. They use `useGitHubAPI()` context hook. A future web-app package would provide a different `GitHubAPI` implementation.

## Runtime & Dependencies

- **Node 24** — enforced via `.nvmrc`. Run `nvm use` before working in this repo.
- **React 19** — all UI packages use React 19. Use React 19 APIs and patterns (no legacy `ReactDOM.render`, use `useId`, etc.).
- **Yarn 4** with `nodeLinker: node-modules`. Registry is Wix private: `http://npm.dev.wixpress.com`.

## TypeScript

- All packages use `composite: true` and project references for incremental builds
- `github-types` and `github-gh-cli` compile to CommonJS (`module: "commonjs"`)
- `github-ui` compiles to ESNext (`module: "ESNext"`, `moduleResolution: "bundler"`)
- `electron-app` has two tsconfigs: `tsconfig.json` for Vite/renderer, `tsconfig.electron.json` for main/preload process

## Electron Dev Flow

The `electron-app dev` script uses `concurrently` to:
1. Start Vite dev server on port 5173
2. Wait for Vite, then compile electron TS and launch Electron

Changes to electron main/preload require restarting the dev command. Vite HMR handles renderer changes automatically.

## Git Workflow

NEVER commit and push directly to `main`. All changes must go through a pull request on a feature branch:

1. Create a feature branch from `main` (e.g. `feat/my-feature`, `fix/my-bug`)
2. Commit changes to the feature branch
3. Push the feature branch and open a PR against `main`
4. Merge only after PR review

## Git Identity

All commits MUST use the following author identity. Before committing, always set:

```bash
git -c user.name="Bar-Amsalem" -c user.email="bar1906ams@gmail.com" commit ...
```

Do NOT use any other git identity (e.g. Wix work account). This applies to all commits in this repo.
