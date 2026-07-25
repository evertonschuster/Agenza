---
name: split-large-coderabbit-pr
description: >
  Split an oversized GitHub pull request into coherent smaller PRs so
  CodeRabbit can review each part separately. Use when CodeRabbit reports
  too many changes or states a review limit, or when a user asks to
  fragment a large PR for segregated AI review. Do not trigger solely from
  a fixed changed-file threshold.
---

# Split Large CodeRabbit PR

Turn one oversized PR into reviewable, dependency-aware PRs while preserving
every original change.

## Guardrails

- Do not assume a fixed changed-file threshold. Capture the exact metric and
  limit from CodeRabbit or the repository when one exists.
- If no numeric limit is stated, do not invent one. Split only because
  CodeRabbit declined the review or the user explicitly requested
  fragmentation, and report the resulting file counts.
- Keep every replacement PR below an explicit applicable limit.
- Group changes by behavior, module, dependency, or migration step. Never split
  only by arbitrary file count.
- Keep implementation, tests, fixtures, schemas, migrations, and relevant
  documentation together.
- Follow the repository's branch, worktree, test, documentation, and tenant
  isolation rules.
- Never stack a branch on another unmerged branch in this repository. Open
  independent PRs in parallel; publish dependent PRs sequentially from the
  updated `origin/main` after their prerequisites merge.
- Do not discard uncommitted work, force-push, rewrite a shared branch, close
  the original PR, or delete branches without explicit authorization.
- Never claim that all original changes were preserved until an integration
  comparison proves it.

## Workflow

### 1. Inspect the oversized PR

1. Read the CodeRabbit comment and capture its exact limit and metric.
2. Resolve the target branch, original head branch, PR number, changed files,
   commits, labels, reviewers, and CI status.
3. Read repository instructions and identify architecture boundaries.
4. Check `git status` before changing branches. Preserve unrelated user work.
5. Record immutable commit IDs for the original base and head.

Use the GitHub connector for PR metadata when available. Use `gh` and local
`git` when branch, diff, review-thread, or check details require them.

If CodeRabbit gives no numeric metric, calculate the changed-file count from
the merge-base diff for planning and reporting only. Do not turn that count
into an inferred review limit, and do not interpret added or deleted lines as
files.

### 2. Design the split

Build a change inventory and assign every changed path to exactly one proposed
PR. Order foundational work before consumers:

1. schemas, contracts, shared types, or migrations
2. domain and application behavior
3. adapters, API, UI, or integration code
4. cleanup that depends on the new behavior

Choose one delivery shape:

- **Independent series:** Branch every group from `origin/main` and open the
  PRs in parallel only when each group builds, tests, and explains a complete
  behavior independently.
- **Sequential series:** Merge the prerequisite PR first, update
  `origin/main`, then branch and publish the dependent group. Never use an
  unmerged replacement branch as another PR's base.
- **Hybrid series:** Open independent groups in parallel and serialize only
  genuine dependencies.

Present a compact split map before mutation. Include the proposed title,
branch, dependency, purpose, approximate file count, and validation for every
PR. Ask for direction only when valid alternatives would materially change
delivery or reviewer workflow.

### 3. Create isolated branches

Create each branch from the up-to-date `origin/main` using the repository's
allowed `<type>/<slug>` convention. Use an isolated worktree when another
agent or human may be working in the main checkout.

Prefer the least invasive extraction method:

1. Cherry-pick existing commits when they are already cohesive and
   dependency-safe.
2. Otherwise apply only the assigned paths or hunks from the recorded original
   head.
3. Split a file by hunk only when the changes are genuinely independent. Keep
   the file in one PR when splitting would make either PR misleading or
   unbuildable.
4. Commit coherent behavior with a message that describes the change, not the
   mechanics of splitting.

Do not mutate the original PR branch while constructing the series.

### 4. Validate every replacement

For each proposed PR:

1. Confirm its changed-file count is within the applicable limit.
2. Review the diff for gaps, duplicates, accidental files, generated
   artifacts, secrets, and unrelated changes.
3. Run every repository gate applicable to the files it changes.
4. Confirm the PR is understandable and testable without hidden changes from a
   later PR.
5. Stop before publication if validation fails or the scope is incomplete.

For a sequential series, repeat these checks against the updated `origin/main`
after every prerequisite merge.

### 5. Prove coverage of the original diff

Before publishing, build a temporary local integration branch or equivalent
tree from the recorded original base and combine all proposed groups in
dependency order. Compare the result with the recorded original head.

Require no unexplained diff. Classify any intentional difference explicitly,
such as an omitted generated artifact, and fix every gap or duplicate before
opening replacement PRs. Repeat the proof after rebases if `main` changes.

### 6. Publish the series

Push only validated replacement branches. Open draft PRs unless the user asks
for ready-for-review PRs and every required gate already passes.

For every PR:

- Use a title such as `[1/N] <coherent change>`.
- Explain its scope and why it is separated.
- Link the oversized PR and every replacement PR already available.
- State whether it is independent or which merged PR it follows.
- Include the changed-file count and test evidence.
- Preserve relevant labels and reviewers when appropriate.
- Tell reviewers that the PR is an independently reviewable segment of the
  original diff.

Do not invent a CodeRabbit re-review command. Use an established repository
command when one exists; otherwise rely on configured PR automation.

### 7. Handle the original PR

After replacement PRs exist and coverage is verified, add a summary comment to
the original PR with:

- the reason for the split
- the ordered replacement list
- dependency and merge-order information
- coverage and test results
- remaining risks or unpublished dependent groups

Leave the original PR open unless the user explicitly authorizes closing it.
If authorized, close it only after the summary is posted and every replacement
URL is confirmed.

### 8. Report

Return:

- the original PR URL
- ordered replacement PR URLs and pending sequential groups
- independent, sequential, or hybrid topology
- changed-file count for each PR
- validation and coverage-comparison results
- CI, review, and merge-order follow-up

If permissions, authentication, branch protection, or validation blocks
publication, leave recoverable local branches intact and report the exact
blocker and next action.
