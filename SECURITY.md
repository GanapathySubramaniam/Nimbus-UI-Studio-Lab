# Security Policy

## Supported versions

Nimbus has not reached a stable release. Security fixes are applied to the latest development release until the support matrix is published with 1.0.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's private vulnerability reporting for this repository when available. If private reporting is unavailable, contact the repository owner through the private contact method listed on the owner's GitHub profile and include only the minimum information required to establish a secure channel.

Please include affected versions, impact, reproduction steps, and any suggested mitigation. Do not include real credentials, private user data, or destructive proof-of-concept payloads.

## Response expectations

The maintainers will acknowledge a complete private report, validate the finding, coordinate remediation, and publish an advisory when appropriate. Timelines depend on severity and reproducibility.

## Project security boundaries

Nimbus is a UI system, not a production identity provider, agent runtime, authorization engine, malware scanner, or persistence service. Host applications remain responsible for enforcing authentication, authorization, policy, data handling, upstream redaction, and attachment scanning.

