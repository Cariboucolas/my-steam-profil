# Rollback

How to take a merge back out of production: by a pull request that reverts it, through the same
gate as any other change. Measured on 2026-11-18 by a drill on #194, reverted by #218 and
restored by #219.

## Revert or fix forward

Revert when production is worse than it was before the merge and the cause is that merge:

- the fix is not obvious within minutes, or would itself need a review;
- the merge is the last one, or later merges do not touch its files (the revert applies cleanly);
- the revert changes nothing native: the Android fingerprint goes back to one that already has a
  build (see [What a revert does not undo](#what-a-revert-does-not-undo)).

Fix forward instead when the fix is one obvious line, when the merge moved the fingerprint and
phones already installed its APK, or when the revert itself conflicts with what came after.

**Who decides**: the owner. An agent may propose a revert and prepare it, branch and pull request
included, but the owner says go, and the owner merges it, whatever its tier (`AGENTS.md`).

## What a revert republishes

A revert is a new commit on `main`. It does not roll anything back at Cloudflare or Expo: every
publishing workflow runs again on it, CI first (ADR-0027), and publishes the old content as a new
revision.

| Target | What the owner's merge of a revert does |
| --- | --- |
| API, alerts, site, gallery | `deploy.yml` rebuilds and redeploys all four, then publishes a Release named after the revert commit |
| Android app, over the air | `eas-update.yml` publishes a **new** update to `preview`; the faulty one stays in the channel's history. A phone downloads it on its next launch and applies it on the one after |
| Android build | `eas-build.yml` builds nothing if a build already serves the reverted fingerprint, which is the usual case |

A revert of a **tier 0** pull request (prose under `docs/**` or the root README) is tier 0
itself: it merges itself and deploys nothing (ADR-0030). Nothing built was wrong, so nothing
needs to go.

## The commands

The pull request to undo: `<n>`. It may hold several commits, since the repository merges by
rebase, and they all land on `main`.

```sh
git fetch origin
gh pr view <n> --json commits --jq '.commits[].oid'   # the pull request's commits, oldest first
git log --oneline origin/main -20                       # the same changes, as rebased onto main
```

Rebasing rewrote them: revert the commits **as they are on `main`**, in one commit. A range is
reverted newest first.

```sh
git switch -c revert/<topic> origin/main
git revert --no-commit <oldest>^..<newest>   # a single commit: git revert --no-commit <sha>
git commit                    # "revert: <title of the pull request> (#<n>)", then why
pnpm check:tier origin/main   # tier 1 or 2: the owner merges, and the merge deploys
git push -u origin revert/<topic>
gh pr create --base main
```

Then: `verify` green, the owner merges by rebase, and the publishing workflows run on the merge.
To watch them and check the result:

```sh
gh run list --commit <merge sha>                          # Deploy, EAS Update, EAS Build
gh run view <EAS Build run id> --log | grep 'build needed' # "No build needed" when nothing native moved
gh release view                                           # the release names the revert commit
curl -s "$(gh variable get API_URL)/health"
```

The site names its revision in its own JavaScript (ADR-0016): the full SHA of the revert commit
appears in the bundle of its pages once Pages serves it.

To put the change back once it is fixed, revert the revert by the same steps, or merge the fix
on top of it.

## What the drill measured

#194: one commit, one file, the gallery only. Times are GitHub's, in UTC, except the decision,
read on a local clock. Each round is timed twice: from the decision to the merge, which includes
waiting for the owner, and from the merge to production, which does not.

| Step | Revert (#218), 2026-11-18 | Elapsed | Restore (#219) | Elapsed |
| --- | --- | --- | --- | --- |
| Decision to revert | 10:18:48 | 0:00 | 11-18 10:28:56 | 0:00 |
| Pull request opened | 10:19:41 | 0:53 | 11-18 10:29:35 | 0:39 |
| `verify` green on it | 10:22:06 | 3:18 | 11-18 10:31:38 | 2:42 |
| Merged by the owner | 10:23:29 | 4:41 | 11-19 08:47:38 | overnight |
| *From the merge:* | | | | |
| CI passed again on `main` | 10:25:33 | 2:04 | 08:49:54 | 2:16 |
| API deployed | 10:26:09 | 2:40 | 08:50:29 | 2:51 |
| Gallery deployed | 10:26:23 | 2:54 | 08:50:38 | 3:00 |
| Site deployed | 10:27:12 | 3:43 | 08:51:42 | 4:04 |
| Release published, Deploy finished | 10:27:24 | 3:55 | 08:51:54 | 4:16 |
| Over-the-air update published | 10:28:15 | 4:46 | 08:51:31 | 3:53 |

In both rounds EAS Build found the fingerprint already built (`No build needed`) and started
nothing, and the deployed gallery and site served the merged commit once Deploy finished.

What costs the time is CI, twice: two and a half minutes on the pull request, and two more on
`main` before anything publishes (ADR-0027). From the merge, every target is live within five
minutes. A small revert takes about ten minutes from the decision to the last target, plus however
long the owner takes to say go and to merge, plus what a phone needs: two launches.

## What a revert does not undo

- **An APK already installed.** If the faulty merge moved the fingerprint, `eas-build.yml` built
  and announced an APK. The revert puts `main` back on the old fingerprint, so a phone that
  installed the new APK is now a stranded build ([deployment.md](deployment.md#stranded-builds)):
  it keeps the faulty code and receives no update. Reinstall the build of the old fingerprint,
  whose link is in the EAS dashboard and in the Discord builds channel. Nothing does this for you.
- **A phone that has not launched twice.** The fixed update reaches it two launches later; until
  then it runs the faulty one.
- **The Worker's cache.** The API keeps answers in the Workers cache: five minutes for what names
  a player, twenty-four hours for rarity (ADR-0005, ADR-0008). A revert redeploys the code and
  leaves the cache as it is, so an answer the faulty version cached is served until it expires.
- **What the faulty version sent.** Sentry events, Discord alerts and Workers Logs entries stay,
  under the faulty revision. So do its Release, its tag and its update in the channel's history.
- **A page already open.** A browser that loaded the faulty site keeps it until it reloads.

## What this is not

Each platform can also roll back on its own, faster, from its dashboard. That leaves `main` and
production disagreeing, skips CI, and is seen by nothing here (ADR-0027 says what it cannot see).
It is not this procedure.
