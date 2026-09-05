# Governance

Nimbus UI Studio Lab is maintained through transparent issues, pull requests, architecture decisions, and release gates.

## Maintainer responsibilities

Maintainers:

- Triage issues and pull requests using evidence.
- Protect stable public contracts.
- Require accessibility and security review for affected surfaces.
- Preserve contributor attribution and license compliance.
- Publish compatibility, migration, and release information.
- Avoid exposing credentials, private user data, or hidden model reasoning.

## Decision process

Routine changes are decided through pull-request review. Cross-package public contracts, protocol boundaries, token semantics, security boundaries, accessibility policy, and release policy require an architecture decision record.

When evidence is equal, prefer accessibility and security, protocol fidelity, clean package boundaries, and reversible choices—in that order.

## Artificial-intelligence review boundaries

Codex is the sole implementation and bug-fixing agent for the approved development workflow. Antigravity Claude may validate completed changes and propose resolutions. Antigravity Gemini Pro may perform architecture, quality, and security audits. Review models do not edit source, create implementation commits, merge pull requests, publish packages, or deploy Sites.

AI-produced findings must identify the reviewed commit and include reproducible evidence. A model cannot mark its own finding resolved; the relevant review is rerun against the fixing commit.

## Releases

Nimbus will announce 1.0 only after its documented component coverage, reference-application parity, accessibility, security, browser, performance, localization, package-consumer, and deployment gates pass.

