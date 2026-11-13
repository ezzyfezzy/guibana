# Agent instructions for Guibana

## Local checkout stays in sync

This is a static app (`index.html` + `css/` + `js/`) that's usually run locally with `npm run dev` for manual UI testing. After merging a PR into `main` from an isolated worktree, always update the user's own `main` checkout (the non-worktree working directory) to the merged commit before considering the task done — don't leave it behind `origin/main`.

- Use `git fetch origin main && git merge --ff-only origin/main` — safe even with a dirty working tree, as long as the dirty files aren't touched by the incoming commits. Don't use plain `git pull` (may rebase, aborts on uncommitted changes).
- If the local checkout has uncommitted changes to files the merge also touched, don't just let the merge fail silently: check whether those local changes are already included in the merged commit (e.g. `git apply --check` the stashed diff against the new `HEAD`). If fully redundant, drop them; if not, reapply what's missing.
- This matters here specifically because the point of merging is usually to see the change in the locally-running UI — an out-of-date checkout means `npm run dev` keeps showing stale behavior even though the PR landed.
