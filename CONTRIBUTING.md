# Contributing to Nimbus UI Studio Lab

Thank you for contributing. Nimbus uses an issue-to-branch-to-pull-request workflow so every change has a reviewable purpose and audit trail.

## Workflow

1. Select or create a granular GitHub issue.
2. Confirm the issue's behavior, accessibility, security, testing, and documentation acceptance criteria.
3. Create a branch named `type/issue-<number>-short-slug`.
4. For behavior changes, write a failing test and verify the expected failure before implementation.
5. Implement the smallest coherent change.
6. Run the affected checks locally.
7. Open a pull request containing `Closes #<number>`.
8. Resolve review findings and keep the branch current without rewriting shared history.

Direct product commits to `main` are not accepted.

## Commit certification

Nimbus uses the Developer Certificate of Origin. Sign off every commit with `git commit -s` to certify that you have the right to submit the contribution under the project's license. See <https://developercertificate.org/>.

## Public API changes

Changes to exported TypeScript APIs, schemas, CSS custom properties, documented `data-nimbus-*` attributes, normalized events, tokens, or accessibility behavior require:

- An explicit issue section describing compatibility impact.
- An API report or schema diff.
- A Changeset.
- Migration guidance or a codemod when the change is mechanical.

## Security

Do not report vulnerabilities in public issues. Follow [SECURITY.md](SECURITY.md).

