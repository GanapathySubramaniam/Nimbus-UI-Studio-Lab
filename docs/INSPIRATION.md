# Inspiration and technical sources

Consulted 2026-09-06. These sources inform original implementation; no source DESIGN.md, logo, proprietary font or brand identity is shipped as a Nimbus asset.

| Source | Use and limits |
| --- | --- |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | Existing reference checkout is outside this repository at `../nimbus-design-reference` relative to the parent directory. Its MIT notice is preserved in THIRD_PARTY_NOTICES.md. M1 replaces selectable brand-derived values with the user's original descriptive archetypes; existing saved project values and attribution notices are preserved. |
| [DTCG Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/) | Verified typed color, dimension, duration, font and cubicBezier leaf representations. Higher-level Nimbus triggers are separate; no claim of general token import or formal whole-document interoperability certification. This corrects the attachment's overly broad statement that motion tokens are unsupported. |
| [W3C Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) | Normal text uses a 4.5:1 floor. Large-text exceptions are not used to weaken the catalog's normal-text checks. Token audits do not replace final widget/override checks. |
| [Atlassian motion foundations](https://atlassian.design/foundations/motion) | Use restrained everyday feedback, reserve expressive movement for significant transitions, and honor reduced motion. This is a design reference for M6, not evidence that Nimbus already implements its motion contract. |
| [Node.js 22 SQLite documentation](https://nodejs.org/docs/latest-v22.x/api/sqlite.html) | Verified built-in DatabaseSync availability and foreign-key behavior. M0 uses SQL PRAGMA busy_timeout rather than constructor options added after the supported Node floor. SQLite remains experimental in the installed Node 22.16 runtime; no separate database installation is needed. |
| [Node.js 22 module hooks](https://nodejs.org/docs/latest-v22.x/api/module.html) | Verified registerHooks (22.15) and stripTypeScriptTypes (22.13). The plain-JavaScript startup entry checks the supported Node version before registering the TypeScript loader, preserving the one-process launcher and an actionable diagnostic on older runtimes. |

The formerly linked Carbon `/guidelines/motion/overview/` and IBM `/design/language/animation/essentials/` pages returned missing-page content on the consultation date. They are not cited as evidence for implementation choices.

Source snapshots are development-only, in ignored `.firecrawl/`. Public documentation summarizes the relevant choices rather than redistributing source material. Full 75-token originality, contrast and fidelity checks are M1/M2 work, not claims established by reading design references.
