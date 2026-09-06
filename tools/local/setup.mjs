import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertSupportedNode } from './runtime.mjs';

try {
  assertSupportedNode();
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error('Run this installer with npm run setup.');
  const result = spawnSync(process.execPath, [npmCli, 'exec', '--yes', '--package=pnpm@12.3.4', '--call', 'pnpm install --frozen-lockfile'], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Dependency installation failed. Resolve the installation error above and run npm run setup again.');
  const initialized = spawnSync(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('./initialize.ts', import.meta.url))], { cwd: root, stdio: 'inherit', windowsHide: true });
  if (initialized.error) throw initialized.error;
  if (initialized.status !== 0) throw new Error('Database initialization failed. Existing data was not reset.');
  console.log('Nimbus setup complete. Start the local app with npm run dev.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Setup failed.');
  process.exitCode = 1;
}
