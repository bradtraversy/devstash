# Complete Action

1. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Set Status back to `Not Started`
   - Clear Goals and Notes sections (keep placeholder comments)
   - Add feature summary to the END of History
2. Stage all changes, including the reset, and commit once with a descriptive message (no separate reset commit)
3. Push the feature branch and open a pull request against main
4. Once CI passes and the merge is approved, rebase-merge the pull request and delete the branch: `gh pr merge <number> --rebase --delete-branch`
5. Update main and prune stale branches: `git switch main && git pull && git fetch --prune`
