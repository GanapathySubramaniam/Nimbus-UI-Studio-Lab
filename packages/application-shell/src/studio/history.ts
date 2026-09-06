export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}
export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}
export function commitHistory<T>(history: History<T>, present: T): History<T> {
  if (JSON.stringify(present) === JSON.stringify(history.present))
    return history;
  return {
    past: [...history.past, history.present].slice(-60),
    present,
    future: [],
  };
}
export function undoHistory<T>(history: History<T>): History<T> {
  const present = history.past.at(-1);
  if (present === undefined) return history;
  return {
    past: history.past.slice(0, -1),
    present,
    future: [history.present, ...history.future].slice(0, 60),
  };
}
export function redoHistory<T>(history: History<T>): History<T> {
  const present = history.future[0];
  if (present === undefined) return history;
  return {
    past: [...history.past, history.present].slice(-60),
    present,
    future: history.future.slice(1),
  };
}
