import type { StudioProject } from "./project";
import { parseProject } from "./project";
import { STORAGE_KEY } from "./model";

const DATABASE = "nimbus-studio";
const STORE = "projects";
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () =>
      reject(request.error ?? new Error("Browser database unavailable."));
    request.onblocked = () =>
      reject(new Error("Close other Nimbus tabs to upgrade local storage."));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function loadProject(): Promise<StudioProject | null> {
  const db = await openDatabase();
  try {
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (raw !== undefined) {
      if (typeof raw !== "string") throw new Error("Saved project is corrupted. Download a backup before replacing it.");
      return parseProject(raw);
    }
    const legacy = localStorage.getItem(STORAGE_KEY);
    return legacy ? parseProject(legacy) : null;
  } finally {
    db.close();
  }
}
// A single queue preserves commit order, including during slower IndexedDB writes.
let writes: Promise<void> = Promise.resolve();
export function saveProject(project: StudioProject): Promise<void> {
  const serialized = JSON.stringify(project);
  writes = writes
    .catch(() => undefined)
    .then(async () => {
      const db = await openDatabase();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite");
          tx.objectStore(STORE).put(serialized, "current");
          tx.oncomplete = () => resolve();
          tx.onerror = () =>
            reject(tx.error ?? new Error("Unable to save project."));
          tx.onabort = () =>
            reject(tx.error ?? new Error("Project save aborted."));
        });
      } finally {
        db.close();
      }
    });
  return writes;
}
