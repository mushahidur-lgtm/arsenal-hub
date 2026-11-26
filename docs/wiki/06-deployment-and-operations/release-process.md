# Release process

[Wiki home](../README.md) · [GitHub Actions](github-actions.md)

## Release

1. Branch from `main`.
2. Run `npm test`, `npm run build`, `npm run test:e2e`.
3. Push the branch; wait for **CI** to pass on all three browsers.
4. Merge to `main` and push. The deploy workflow publishes.
5. [Verify the deployment](github-pages.md#verifying-a-deployment).

There are no version tags or a changelog today.

## Rollback

The safest route is a new commit that undoes the change, which goes through the same tests:

```bash
git revert <bad-commit-sha>
```

```bash
git push origin main
```

For a merge commit use `git revert -m 1 <merge-sha>`. Avoid force-pushing `main`.

GitHub also allows re-running an earlier successful workflow run to republish that commit. This has not been exercised for this repository.

## If a deploy fails

Nothing is published and the previous version stays live. Open the failed run, download the report artifact, reproduce locally, fix, push again.
