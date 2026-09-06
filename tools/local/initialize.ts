import { fileURLToPath } from 'node:url';
import { openStore } from './database.ts';

const store = openStore(fileURLToPath(new URL('../../.nimbus/studio.sqlite', import.meta.url)));
store.close();
console.log('Local SQLite database is ready at .nimbus/studio.sqlite.');
