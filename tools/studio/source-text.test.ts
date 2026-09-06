import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('source embedding is byte-identical across LF and Windows CRLF checkouts', async () => {
  assert.ok(existsSync(new URL('./source-text.ts', import.meta.url)), 'Canonical source serializer must exist');
  const { canonicalSourceText } = await import('./source-text.ts');
  const lf = 'export const label = "Nimbus";\n// \u03b1\n';
  assert.equal(canonicalSourceText(lf.replaceAll('\n', '\r\n')), lf);
  assert.equal(canonicalSourceText(lf), lf);
  assert.equal(canonicalSourceText('"literal \\r\\n"'), '"literal \\r\\n"');
});
