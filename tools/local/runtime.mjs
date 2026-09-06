// @ts-check
import { lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, extname, resolve, relative, isAbsolute, sep } from 'node:path';

/** @param {string} [version] */
export function assertSupportedNode(version = process.versions.node) {
  const parts = typeof version === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  const major = parts ? Number(parts[1]) : NaN;
  const minor = parts ? Number(parts[2]) : NaN;
  const patch = parts ? Number(parts[3]) : NaN;
  if (![major, minor, patch].every(Number.isSafeInteger) || major < 22 || (major === 22 && minor < 16)) {
    throw new Error('Nimbus requires Node.js 22.16 or newer. Install a supported Node release, then run npm run setup.');
  }
}

/** Resolve existing links, retaining missing suffixes without creating anything.
 * @param {string} path
 * @returns {string}
 */
function canonicalPath(path) {
  let ancestor = resolve(path);
  const suffix = [];
  for (;;) {
    try {
      // lstat sees a dangling junction itself even when stat/realpath report
      // ENOENT. Resolve it outside this catch so broken links fail closed.
      lstatSync(ancestor);
    } catch (error) {
      const parent = dirname(ancestor);
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT' || parent === ancestor) {
        throw error;
      }
      suffix.unshift(basename(ancestor));
      ancestor = parent;
      continue;
    }
    return resolve(realpathSync.native(ancestor), ...suffix);
  }
}

/** @param {string} directory @param {string} path */
function isWithin(directory, path) {
  const child = relative(directory, path);
  return child === '' || (child !== '..' && !child.startsWith(`..${sep}`) && !isAbsolute(child));
}

/** @param {string} path @param {string} publicDirectory */
export function resolveDatabasePath(path, publicDirectory) {
  const message = 'Choose a .sqlite or .db file outside the application public directory.';
  if (typeof path !== 'string' || !path.trim() || typeof publicDirectory !== 'string' || !publicDirectory.trim()) {
    throw new Error(message);
  }
  const requested = resolve(path);
  const served = resolve(publicDirectory);
  const database = canonicalPath(requested);
  const canonicalPublic = canonicalPath(served);
  // Preserve lexical containment rejection as well: a public child junction
  // pointing outward is still accessible through that public path.
  if (!['.sqlite', '.db'].includes(extname(requested).toLowerCase()) ||
      !['.sqlite', '.db'].includes(extname(database).toLowerCase()) ||
      isWithin(served, requested) || isWithin(canonicalPublic, database)) {
    throw new Error('Choose a .sqlite or .db file outside the application public directory.');
  }
  // The launcher passes this exact canonical filename into the SQLite store.
  return database;
}
