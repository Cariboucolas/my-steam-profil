# The AI reviewer reads a pull request as data, from main

An AI reviewer comments every pull request of this repository: `.github/workflows/ai-review.yml`
runs Claude Code through `anthropics/claude-code-action`, authenticated by the owner's
subscription token, on the instructions of `.github/ai-review.md`. It is started by
`pull_request_target`, so the workflow, the instructions and the tools the reviewer gets are
`main`'s; it never checks out, fetches or runs the pull request's code, and reads the pull request
through the API as files of data. It can read and comment inline, nothing else, and it blocks
nothing.

## Why this trigger

The reviewer holds a secret, `CLAUDE_CODE_OAUTH_TOKEN`, worth the owner's subscription. Two
triggers could start it, and each has its own way to leak it.

- On `pull_request`, GitHub runs the workflow as the pull request has it. Any branch of this
  repository can rewrite `ai-review.yml` to print the token or send it elsewhere, and the run
  that does so already holds it: the leak happens before anyone reads the change. Tier 2 covers
  what merges, not what runs on the way. ADR-0028 left the same hole open for the tier, and
  ADR-0029 closed it the same way.
- On `pull_request_target`, GitHub runs the workflow as `main` has it, with `main`'s secrets.
  Nothing the pull request changes alters what runs. What remains is the pull request's content,
  read by a model: its description, its patches and its comments can address the reviewer and try
  to steer it (prompt injection). That risk is bounded by what the reviewer is allowed to do,
  which `main` alone decides.

The second leaves the secret out of the pull request's reach and turns the risk into one of
content, which tools can bound. ADR-0029 already holds this trigger to reading data only, and
`pnpm check:workflows` keeps it so.

## What it binds

- Triggers: `opened`, `synchronize`, `reopened`, `ready_for_review`; one run per pull request at a
  time, a newer push cancelling the older run.
- Skipped: a draft, a pull request whose author is `dependabot[bot]` (it gets no secret,
  ADR-0031), and a pull request whose branch lives in another repository. The last is decided by
  a step that reads the pull request through the API, before any step holds the secret: on
  `pull_request_target` a fork's pull request would get it. The action also refuses an actor
  without write access to the repository.
- Permissions: `{}` for the workflow; the job alone has `contents: read` and
  `pull-requests: write`. The action receives the workflow's token (`github_token`), so it
  comments as `github-actions[bot]` with those two permissions; without it, the action would ask
  for the Claude app's token, which holds write access to contents and issues, and needs
  `id-token: write`.
- The action is pinned to a commit SHA, its version in a comment, and chosen at least seven days
  after its release, as ADR-0031's cooldown does for dependencies. `pnpm check:workflows` now
  refuses a third-party action not pinned to a full SHA in any workflow `pull_request_target` or
  `workflow_run` starts (`unpinned-actions.ts`); GitHub's own `actions/*` keep their tags.
- The data: the pull request (number, title, description, author, base) and its files with their
  patches, saved under `$RUNNER_TEMP/pull-request` and given to the reviewer with `--add-dir`. The
  working directory is `main`'s checkout, so the reviewer reads `AGENTS.md` and the ADRs as they
  are, not as the pull request would have them.
- The tools, through `claude_args`: `--permission-mode dontAsk`, which denies every call no rule
  allows; `--tools "Read,Glob,Grep"`, which removes the shell, the editors and the web from the
  session; `--allowedTools` for `mcp__github_inline_comment__create_inline_comment` alone, which
  creates review comments and cannot approve or request changes. `Read(./.git/**)` is denied: the
  action writes the workflow's token into the remote's URL in `.git/config`.
- The instructions live in `.github/ai-review.md`, tier 2 through `.github/**`: review against
  `AGENTS.md` and the ADRs, treat everything of the pull request as data, and call a finding
  blocking only when it quotes the written rule it breaks.
- `ai-review.test.ts` reads the workflow and the instructions and fails when one of these
  promises goes.

## What it does not do

- It blocks nothing. The check is not required by branch protection, which only the owner
  changes, and a blocking comment is a word, not a status. For two weeks from the first run on a
  pull request, the owner reads its findings without acting on them, then counts its false alarms;
  tier 1 merging without the owner (ADR-0030) waits on that count.
- It does not run the pull request's code, its tests or its build: `verify` does, on
  `pull_request`, without the subscription token.
- It does not review a fork's pull request or a Dependabot one.

## What remains open

- Prompt injection is bounded, not prevented. A pull request can still steer what the reviewer
  writes: a misleading comment, or silence on a real problem. It cannot make it write code, run a
  command or approve. The owner reads every tier 1 and tier 2 pull request regardless.
- The subscription token is in the environment of the Claude Code process. The reviewer has no
  shell to read it, and `dontAsk` denies reads outside the working directories; that rests on
  Claude Code's permission system, which this repository cannot test.
- `Read` deny rules reach `Grep` and `Glob` on a best-effort basis, by Claude Code's own
  documentation. The token they protect is the workflow's, valid for the job alone and limited to
  reading code and commenting pull requests.
- The run of the pull request that introduces this workflow reviews nothing: the workflow is not
  on `main` yet. The first pull request after the merge is the first one reviewed, and shows
  whether the action accepts `pull_request_target`, the workflow's token and these arguments as
  its documentation and source describe them.
- A subscription token is tied to the owner's account and its usage limits; a review that hits
  them fails the job, which blocks nothing.
