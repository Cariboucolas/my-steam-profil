# A build declares what its profile promises

An APK built from `main` states the commit it was built from, as the update of the same merge
does. The commit comes from the builder, which knows it; the claim to be live comes from the
`preview` profile, because the builder cannot know which branch it was handed.

## What it amends

ADR-0016 said it "does not cover the native binary", because no workflow built one. #115 built
one, and #143 found what it states: `dev`, the word for a developer's machine, on every fresh
install. The OTA update of the same merge is published twenty minutes before the build embeds its
bundle, so `expo-updates` judges it older and never loads it; the new APK runs its embedded bundle
until the next merge. That bundle was built without a commit, because nothing the GitHub runner
sets reaches the builder at Expo.

It also amends one consequence of 0016: that the live flag "is set by the production workflows
only". For a build, it is set by a profile.

## The decision

**The commit is read on the builder.** EAS sets `EAS_BUILD_GIT_COMMIT_HASH` in every phase of a
build, the Gradle step that bundles JavaScript included. `metro.config.js` copies it into
`EXPO_PUBLIC_COMMIT_SHA` when nothing has set that already, before Metro forks the workers that
inline it. An update, a web export or a developer's `.env` still says what it says: the builder
fills a gap, never overrides a declaration.

**The claim to be live is the `preview` EAS environment's.** `EXPO_PUBLIC_LIVE=true` is stored
there, outside the repository, and every build of that profile reads it. `native-build ensure`,
run by `eas-build.yml` on `main`, is the only thing meant to start such a build.

## Why

**The same commit is the same Revision.** An embedded bundle and an update built from one merge
are the same JavaScript. Stating `dev 17deaf8` for one and `17deaf8` for the other would make the
Revision describe the delivery rather than the artefact, which is what `CONTEXT.md` says it never
does.

**Neither obvious place can carry a per-build value.** `eas.json` is part of the Android
fingerprint, and its `env` takes literal strings, so writing the commit into it would move the
runtime the build is made for. An `app.config.js` writing the commit into the config moves the
fingerprint the same way. `metro.config.js` is not a fingerprint source, and a value in
`process.env` is never hashed.

**The builder knows the commit and nothing else.** `EAS_BUILD_GIT_COMMIT_HASH` is the `HEAD` of
whoever ran `eas build`, on `main` or not, with a clean tree or not. It can name a commit; it
cannot say the commit was published. So the claim cannot ride with it, and has to be made by
something that is only meant to be used for publishing.

## Considered options

**An APK is never live.** Every build states `dev <commit>`, and forgetting nothing can make it
overclaim — the safe failure 0016 chose. Rejected because it makes one JavaScript state two
Revisions, and because the reader who installed from `#builds` is exactly the reader "live" is
for.

**A dedicated profile that only `ensure` uses.** There are three EAS environments and no fourth,
so its flag would sit in `eas.json`, moving the fingerprint once and handing the claim to whoever
types `--profile` with its name. It is the chosen option with more parts.

**Republish the merge's update once the build finishes.** It would give the phone an update
newer than its bundle. It changes neither what a fresh install states nor what it runs, since the
two are the same commit.

## Consequences

The safe failure 0016 relied on no longer holds for a build. A `preview` build started by hand,
from a branch or an uncommitted tree, states a bare commit as if it were live, and that commit
may not be the tree that was built. What protects against it is a convention — `ensure` is the
path — and a screenshot that names a commit absent from `main`, which is at least visible.

The fix starts no build: `metro.config.js` does not move the fingerprint, so `ensure` finds the
existing build and stops. It is proved on the first build after the fingerprint next moves. Until
then the installed APK states `dev`, and stops doing so at the next merge, whose update is newer
than its bundle.
