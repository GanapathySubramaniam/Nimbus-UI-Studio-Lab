# `@nimbus-ui-studio/config`

Shared, strict configuration for Nimbus packages and applications. TypeScript
presets deliberately separate browser and server platform globals so packages do
not accidentally rely on APIs that are unavailable in their supported runtime.

Extend one of these public subpaths from a package-local `tsconfig.json`:

- `@nimbus-ui-studio/config/typescript/browser`
- `@nimbus-ui-studio/config/typescript/server`
- `@nimbus-ui-studio/config/typescript/library`
