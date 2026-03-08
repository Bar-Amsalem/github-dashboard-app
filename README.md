# TINT Viewer

A desktop app that authenticates with GitHub via the `gh` CLI and displays your open pull requests with review status and CI check information.

Built with Electron, React 19, and TypeScript in a Yarn workspaces monorepo.

## Getting Started

### Prerequisites

- [Node 24](https://nodejs.org/) (see `.nvmrc`)
- [Yarn 4](https://yarnpkg.com/)
- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated (`gh auth login`)

### Setup

```bash
nvm use
yarn install
```

### Development

```bash
yarn dev
```

This starts the Vite dev server and launches Electron. Renderer changes hot-reload automatically. Changes to the Electron main or preload process require restarting the command.

### Build

```bash
yarn build
```

Packages are built in dependency order: `github-types` -> `github-gh-cli` / `github-ui` -> `electron-app`.

### Package

```bash
yarn pack
```

Produces a `.dmg` installer in the `release/` directory.

**macOS note:** The app is not code-signed. After installing, you may see "TINT Viewer is damaged and can't be opened." To fix this, run:

```bash
xattr -cr /Applications/TINT\ Viewer.app
```

## Project Structure

```
packages/
  github-types/     Pure TypeScript types and the IGitHubClient interface
  github-gh-cli/    GhCliClient implementation using gh CLI subprocess calls
  github-ui/        React components (App, Dashboard, LoginScreen) and styles
  electron-app/     Composition root — Electron main process, preload, and renderer
```

The UI layer never references `gh` CLI or Electron APIs directly. It consumes a `GitHubAPI` interface via React context (`useGitHubAPI()`), making it possible to swap in a different backend (e.g. a web app) without changing UI code.

## Contributing

### Workflow

1. Fork and clone the repo
2. Run `nvm use && yarn install`
3. Create a feature branch from `main`
4. Make your changes
5. Run checks before committing:
   ```bash
   yarn precommit
   ```
   This runs linting, type-checking, and tests across all packages.
6. Open a pull request against `main`

### Code Guidelines

- Follow the existing TypeScript and React patterns in the codebase
- UI components should use the `useGitHubAPI()` context hook — never import `gh` CLI or Electron APIs directly in UI code
- Packages must respect the dependency order: `github-types` is the foundation, `github-gh-cli` and `github-ui` depend on it, and `electron-app` composes everything
- Keep changes focused — avoid unrelated refactors in the same PR

### Adding a New Package

1. Create a directory under `packages/`
2. Add a `package.json` with the `@gh-dashboard/` scope and version matching the monorepo (`0.0.1`)
3. Add a `tsconfig.json` with `composite: true` and appropriate project references
4. The package will be automatically picked up by Yarn workspaces

## Releasing

To create a new release, use the Claude Code `/release` skill:

```bash
/release patch   # 0.0.1 → 0.0.2
/release minor   # 0.0.1 → 0.1.0
/release major   # 0.0.1 → 1.0.0
```

This will bump the version, generate release notes from the git log, and update this README. After reviewing the changes, commit them and run:

```bash
yarn publish
```

This tags the version and pushes to origin, which triggers the [release workflow](.github/workflows/release.yml) to build the `.dmg` and create a GitHub Release.

## Release Notes

- [v0.0.2](./RELEASE_NOTES/v0.0.2.md) — Fix pagination for reviews and check-runs APIs
- [v0.0.1](./RELEASE_NOTES/v0.0.1.md) — Initial release
