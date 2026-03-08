---
name: pr
description: Commit all changes, push to a feature branch, and create a PR
disable-model-invocation: true
argument-hint: [branch-name]
allowed-tools: Bash(git *), Bash(gh *)
---

Create a pull request for all current changes. Follow these steps exactly:

## 1. Ensure you are on a feature branch

- Check the current branch with `git branch --show-current`.
- If on `main`, create and switch to a new feature branch. Use $ARGUMENTS as the branch name if provided, otherwise generate a descriptive branch name from the changes (e.g. `fix/check-runs-pagination`, `feat/add-settings-page`).
- If already on a feature branch, stay on it.

## 2. Stage and commit

- Run `git status` and `git diff HEAD` to review all changes.
- Stage all relevant changed and untracked files. Do NOT stage files that contain secrets (.env, credentials, etc).
- Write a concise commit message (1-2 sentences) that describes **what** changed. Use conventional style: `fix:`, `feat:`, `chore:`, `refactor:`, etc.
- End the commit message with:
  ```
  Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
  ```
- Use a HEREDOC for the commit message to ensure correct formatting.

## 3. Push

- Push the branch to `origin` with the `-u` flag.

## 4. Create the PR

- Run `git log main..HEAD --oneline` and `git diff main...HEAD` to understand all changes on this branch.
- Create the PR with `gh pr create`. The PR description must focus on **WHY** the changes were made, not just what changed. Structure:
  - **Title**: Short (under 70 chars), describes the intent
  - **Body**: Use this format:

```
## Why

<1-3 sentences explaining the motivation and problem being solved>

## What changed

<Bulleted list of key changes>

## Test plan

<Bulleted checklist of how to verify the changes>
```

- Return the PR URL when done.
