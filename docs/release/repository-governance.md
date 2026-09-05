# Repository governance baseline

This document records the repository settings that protect Nimbus UI Studio Lab development. The machine-readable source of truth is [`.github/repository-policy.json`](../../.github/repository-policy.json), validated by its [JSON Schema](../../.github/repository-policy.schema.json) and the repository-governance workflow.

## Bootstrap state

Nimbus currently has one repository identity with administrative access. During bootstrap, `main` requires pull requests but does not require an approving review because GitHub does not allow an author to approve their own pull request. Administrator enforcement also remains disabled so the maintainer can recover from a broken initial policy or unavailable required check.

The policy separates `bootstrap` and `stableRelease` settings structurally. Before the first stable release, the project must add an independent reviewer or organization rule set, select the stable-release phase, and require:

- At least one approving review.
- Dismissal of stale approvals.
- Approval of the latest material push by someone other than the author where GitHub supports it.
- Code-owner review for shared public contracts.
- Administrator enforcement.

The `repository-governance / stable-release` workflow checks the live GitHub repository and effective branch rules and fails while those settings are absent. The approved release workflow must call this gate before package or Sites publication. Issue #111 tracks its integration into the final release pipeline.

The active `Nimbus main governance` ruleset requires pull requests, the `validate` status check, strict up-to-date branches, resolved review threads, squash-only merges, linear history, and prevents branch deletion and non-fast-forward updates.

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

The active bootstrap ruleset requires the existing `validate` status check. Additional checks are introduced only after their workflows exist; a nonexistent check must never be configured as required because that would make every pull request permanently unmergeable.

The stable branch policy will ultimately require the aggregate checks for:

- Repository policy and issue linkage.
- Signed-off commit trailers for every commit in a pull request.
- Type checking and linting.
- Unit, component, contract, accessibility, visual, and end-to-end tests.
- API and schema compatibility.
- Bundle and performance budgets.
- Dependency, license, provenance, secret, and security scans.
- Antigravity validation status where the affected change requires it.

The pull-request governance workflow enforces policy structure, issue-closing references, and Signed-off-by trailers immediately. Changeset and API-report enforcement activates when public packages exist and is tracked by issue #115. Commit-bound AI finding enforcement is tracked by issue #116; until it is automated, the policy marks the gate as deferred and the maintainer records the reviewed and revalidated commits in the finding issue and PR summary.

## Security settings

Secret scanning and push protection are required immediately. Private vulnerability reporting, dependency review, and automated dependency updates are enabled before the first dependency-bearing release and verified again before 1.0.

Credentials, authentication codes, model tokens, Sites source credentials, private user data, and hidden model reasoning must not appear in commits, issues, pull requests, Actions output, fixtures, snapshots, or AI-review prompts.

The manual bootstrap audit and callable stable-release gate read the active rules that apply to `main` through GitHub's effective branch-rules API. That read requires only repository metadata access, so the workflow uses the ordinary short-lived Actions token and requires no repository credential secret. Nimbus never stores a personal access token for this audit. Ruleset creation or modification remains a maintainer operation performed through authenticated GitHub administration and is not delegated to pull-request code.

The effective-rules API intentionally omits bypass-actor administration. Before package or Sites publication, the release-owning maintainer must use their existing authenticated GitHub CLI session to fetch ruleset `22357934` and run `node tools/governance/governance.mjs ruleset .github/repository-policy.json <ruleset-json-path> stableRelease`. This local gate rejects the wrong ruleset, inactive enforcement, a target other than `main`, an API response that omits bypass actors, or any configured bypass actor. The JSON response contains policy metadata, not authentication material, and must be deleted after validation. No token is copied into the repository, Actions, a command argument, an issue, or a release artifact.

## Verification

Maintainers verify live settings with GitHub CLI and compare them to `.github/repository-policy.json`. A mismatch opens a governance issue; it is not silently accepted as a new policy.

The verification must record only non-secret settings. `gh auth status` output and token material must never be pasted into an issue or pull request.
