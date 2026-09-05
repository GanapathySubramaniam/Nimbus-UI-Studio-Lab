# Repository governance baseline

This document records the repository settings that protect Nimbus UI Studio Lab development. The machine-readable source of truth is [`.github/repository-policy.json`](../../.github/repository-policy.json).

## Bootstrap state

Nimbus currently has one repository identity with administrative access. During bootstrap, `main` requires pull requests but does not require an approving review because GitHub does not allow an author to approve their own pull request. Administrator enforcement also remains disabled so the maintainer can recover from a broken initial policy or unavailable required check.

Before the first stable release, the project must add an independent reviewer or organization rule set and change the policy to require:

- At least one approving review.
- Dismissal of stale approvals.
- Approval of the latest material push by someone other than the author where GitHub supports it.
- Code-owner review for shared public contracts.
- Administrator enforcement.

The stable release is blocked until those settings are active and verified.

## Change path

After the one-time empty-repository seed, every product, test, documentation, workflow, or configuration change follows this path:

1. A granular GitHub issue defines the outcome and acceptance criteria.
2. A dedicated `type/issue-<number>-short-slug` branch is created from current `main`.
3. Behavioral work follows test-driven development.
4. The branch is pushed and a pull request contains `Closes #<number>`.
5. Required checks and review gates run against the exact commit.
6. The pull request is squash-merged after all conversations and blocking findings are resolved.
7. GitHub deletes the merged branch.

Direct product commits to `main`, force pushes, branch deletion, undocumented deep imports, and untracked implementation are prohibited.

## Merge policy

- Squash merge is the only enabled merge strategy.
- The squash title describes the outcome and includes the issue number.
- Merge commits and rebase merges are disabled.
- Linear history is required.
- Review conversations must be resolved.
- Feature branches are deleted after merge.

## Required checks

Required status checks are introduced by the workspace and CI issue after the workflows exist. A nonexistent status check must never be configured as required because that would make every pull request permanently unmergeable.

The stable branch policy will ultimately require the aggregate checks for:

- Repository policy and issue linkage.
- Type checking and linting.
- Unit, component, contract, accessibility, visual, and end-to-end tests.
- API and schema compatibility.
- Bundle and performance budgets.
- Dependency, license, provenance, secret, and security scans.
- Antigravity validation status where the affected change requires it.

## Security settings

Secret scanning and push protection are required immediately. Private vulnerability reporting, dependency review, and automated dependency updates are enabled before the first dependency-bearing release and verified again before 1.0.

Credentials, authentication codes, model tokens, Sites source credentials, private user data, and hidden model reasoning must not appear in commits, issues, pull requests, Actions output, fixtures, snapshots, or AI-review prompts.

## Verification

Maintainers verify live settings with GitHub CLI and compare them to `.github/repository-policy.json`. A mismatch opens a governance issue; it is not silently accepted as a new policy.

The verification must record only non-secret settings. `gh auth status` output and token material must never be pasted into an issue or pull request.

