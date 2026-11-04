import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EMPTY_DRAFT, STORAGE_KEYS } from "../notificationConfig";
import { newId, normalizeDraft } from "../utils/notificationUtils";
import { historyStore } from "./historyStore";

/* -------------------------------------------------------------------------
 * Composer state that outlives a page visit, kept in this browser:
 *   useComposeDraft — the half-written notification
 *   useSendHistory  — every send made from here (the API has no
 *                     "sent broadcasts" list endpoint yet)
 *   useTemplates    — saved messages to start from
 * ---------------------------------------------------------------------- */

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useStoredState(key, fallback) {
  const [value, setValue] = useState(() => readStored(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage full / blocked — the state still works for this visit.
    }
  }, [key, value]);
  return [value, setValue];
}

export function useDebouncedValue(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function useComposeDraft() {
  const [stored, setStored] = useStoredState(STORAGE_KEYS.draft, EMPTY_DRAFT);
  const draft = useMemo(() => normalizeDraft(stored), [stored]);

  // Every setter starts from the normalized draft so a partial stored one
  // can't drop fields.
  const update = useCallback((fn) => setStored((d) => fn(normalizeDraft(d))), [setStored]);

  return {
    draft,
    // key = "push" | "inApp"
    setChannel: (key, on) => update((d) => ({ ...d, [key]: on })),
    patchAudience: (patch) => update((d) => ({ ...d, audience: { ...d.audience, ...patch } })),
    patchFilter: (patch) => update((d) => ({ ...d, audience: { ...d.audience, filter: { ...d.audience.filter, ...patch } } })),
    setPicked: (group, rows) =>
      update((d) => ({ ...d, audience: { ...d.audience, picked: { ...d.audience.picked, [group]: rows } } })),
    patchMessage: (patch) => update((d) => ({ ...d, message: { ...d.message, ...patch } })),
    load: (next) => setStored(normalizeDraft(next)),
    reset: () => setStored(EMPTY_DRAFT),
  };
}

// Backed by the shared historyStore — the scheduler writes to it too.
export function useSendHistory() {
  const entries = useSyncExternalStore(historyStore.subscribe, historyStore.get);
  return { entries, add: historyStore.add, update: historyStore.update, remove: historyStore.remove };
}

export function useTemplates() {
  const [templates, setTemplates] = useStoredState(STORAGE_KEYS.templates, []);
  return {
    templates,
    save: ({ name, push, inApp, message }) =>
      setTemplates((list) => [{ id: newId(), name, push, inApp, message, createdAt: new Date().toISOString() }, ...list]),
    remove: (id) => setTemplates((list) => list.filter((t) => t.id !== id)),
  };
}
