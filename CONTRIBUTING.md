# Contributing to V-Lesson Plus

Thank you for contributing.

## Before you start

- Search existing issues to avoid duplicates.
- For non-trivial changes, open an issue first to discuss scope.
- Keep pull requests focused and small.

## Branch naming

Use one of these prefixes followed by a `/` and a short name that contains only **lowercase letters, digits, dots, hyphens, and underscores** (`[a-z0-9._-]+`). Spaces, uppercase letters, and camelCase are not allowed.

- feature/<short-name>
- fix/<short-name>
- chore/<short-name>
- docs/<short-name>
- refactor/<short-name>
- test/<short-name>
- build/<short-name>
- ci/<short-name>
- perf/<short-name>
- hotfix/<short-name>

Examples:

- feature/resume-playback
- fix/popup-empty-state
- chore/update-deps

Names like `feature/resumePlayback` or `fix/Popup Empty State` are rejected by CI.

## Local setup

1. Install dependencies: npm install
2. Build: npm run build
3. Run tests: npm test

## Code expectations

- Keep TypeScript strict and avoid any when possible.
- Update tests when behavior changes.
- Keep popup/content message contracts in sync.
- Use clear logs with [V-Lesson Plus] prefix.

## Pull request checklist

- [ ] Branch name follows policy
- [ ] Build passes locally (npm run build)
- [ ] Tests pass locally (npm test)
- [ ] Manifest permissions remain minimal
- [ ] README updated if behavior changed

## Review process

- Maintainer reviews for correctness, clarity, and safety.
- Requested changes should be addressed in follow-up commits.
- Squash merge is preferred for cleaner history.
