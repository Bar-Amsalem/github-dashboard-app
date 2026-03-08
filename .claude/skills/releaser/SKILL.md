---
name: release
description: Bump the version in package.json, generate release notes from git history, and publish a new release
argument-hint: [major|minor|patch]
allowed-tools: Bash(git *), Bash(node *), Read, Write, Edit, Glob
---

Bump the project version, generate release notes, and prepare a release. Follow these steps exactly:

## 1. Determine the version bump

- Read the current version from `package.json`.
- Use `$ARGUMENTS` to determine the bump type: `major`, `minor`, or `patch`. Default to `patch` if not provided.
- Calculate the new version by incrementing the appropriate semver segment.

## 2. Find the latest release tag

- Run `git tag --list 'v*' --sort=-version:refname` to find the latest version tag.
- If no tags exist, use the initial commit as the base.

## 3. Generate release notes

- Run `git log <latest-tag>..HEAD --pretty=format:'- %s (%h)'` to get all commits since the last release.
- Group the commits into categories based on conventional commit prefixes:
  - **Features** — `feat:` commits
  - **Bug Fixes** — `fix:` commits
  - **Other Changes** — everything else (`chore:`, `refactor:`, `docs:`, etc.)
- Omit empty categories.
- Create the file `RELEASE_NOTES/v<new-version>.md` with this format:

```
# v<new-version>

## Features

- <commit message> (<short hash>)

## Bug Fixes

- <commit message> (<short hash>)

## Other Changes

- <commit message> (<short hash>)
```

## 4. Bump the version

- Update the `version` field in the root `package.json` to the new version.
- Also update the `version` field in **every** workspace `package.json` under `packages/*/package.json` to the same new version. This is critical because `electron-builder` reads the version from the electron-app's `package.json` to name the `.dmg` file.

## 5. Update README.md

- Add a new release notes link to the **Release Notes** section at the bottom of `README.md`, above the existing entries:
  ```
  - [v<new-version>](./RELEASE_NOTES/v<new-version>.md) — <one-line summary>
  ```
- The one-line summary should be derived from the most notable change(s) in the release.

## 6. Show the result

- Display the new version number.
- Display the generated release notes content.
- Remind the user to commit the changes (version bump + release notes) and then run `yarn publish` to build the DMG locally, tag the version, and create a GitHub release with the DMG attached.
