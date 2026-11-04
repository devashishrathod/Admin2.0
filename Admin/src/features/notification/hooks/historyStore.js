import { MAX_HISTORY, STORAGE_KEYS } from "../notificationConfig";

/* -------------------------------------------------------------------------
 * Send history as one shared store over localStorage, so the Notifications
 * page and the background scheduler (NotificationScheduler, mounted in
 * Layout) read and write the same list — and other open tabs follow along
 * through the `storage` event.
 *
 * Entry statuses: scheduled → sending → sent | partial | failed, or
 * cancelled / missed for a scheduled send that never went out.
 * ---------------------------------------------------------------------- */

const KEY = STORAGE_KEYS.history;
const listeners = new Set();

function readStorage() {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

let cache = readStorage();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY) return;
    cache = readStorage();
    emit();
  });
}

export const historyStore = {
  get: () => cache,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  // Always starts from what's in storage right now, so a write from another
  // tab a moment ago isn't overwritten with a stale copy.
  set(fn) {
    const next = fn(readStorage()).slice(0, MAX_HISTORY);
    cache = next;
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Storage full / blocked — keep the in-memory list for this visit.
    }
    emit();
  },
  add: (entry) => historyStore.set((list) => [entry, ...list]),
  update: (id, fn) => historyStore.set((list) => list.map((e) => (e.id === id ? fn(e) : e))),
  remove: (id) => historyStore.set((list) => list.filter((e) => e.id !== id)),
  /** Moves one entry from `from` status to the next, only if it's still in
   *  `from` — returns false when another tab got there first. */
  claim(id, from, patch) {
    let claimed = false;
    historyStore.set((list) =>
      list.map((e) => {
        if (e.id !== id || e.status !== from) return e;
        claimed = true;
        return { ...e, ...patch };
      })
    );
    return claimed;
  },
};
