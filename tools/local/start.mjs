import { existsSync, readFileSync } from 'node:fs';
import { assertSupportedNode } from './runtime.mjs';

try {
  // This entry is plain JavaScript, so an older Node can show our diagnostic
  // before encountering any TypeScript flag, source file or SQLite import.
  assertSupportedNode();
  if (!existsSync(new URL('../../apps/reference-vite/node_modules/vite/package.json', import.meta.url))) {
    throw new Error('Dependencies are missing. Run npm run setup first.');
  }
  const { registerHooks, stripTypeScriptTypes } = await import('node:module');
  registerHooks({
    load(url, context, nextLoad) {
      if (url.startsWith('file:') && new URL(url).pathname.endsWith('.ts')) {
        return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'), { mode: 'strip', sourceUrl: url }) };
      }
      return nextLoad(url, context);
    },
  });
  await import('./dev.ts');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Nimbus could not start.');
  process.exitCode = 1;
}
