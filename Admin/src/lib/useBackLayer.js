import { useEffect, useRef } from "react";

/* -------------------------------------------------------------------------
 * useBackLayer(active, onBack) — makes an on-screen layer (full-screen
 * gallery, viewer, modal…) part of the browser history, so Back closes the
 * top layer first instead of leaving the page.
 *
 *   • While `active`, one history entry (same URL) is pushed for the layer.
 *   • Back pops it → `onBack()` runs (close the layer / step out of it).
 *   • Closed any other way (✕, Esc, Cancel) → the entry is removed again,
 *     so no "dead" Back presses are left behind.
 *   • Layers stack: viewer inside a gallery inside a page → Back closes the
 *     viewer, then the gallery, then leaves the page.
 *
 * The push waits one tick: StrictMode mounts → unmounts → mounts every
 * effect in dev, and an immediate push + async history.go(-1) would leave a
 * stray entry that instantly closes the layer again.
 * ---------------------------------------------------------------------- */

const stack = []; // open layer ids, bottom → top
let seq = 0;

export default function useBackLayer(active, onBack) {
  const backRef = useRef(onBack);
  useEffect(() => {
    backRef.current = onBack;
  });

  useEffect(() => {
    if (!active) return undefined;
    const id = ++seq;
    let pushed = false;

    const timer = setTimeout(() => {
      pushed = true;
      stack.push(id);
      window.history.pushState({ ...window.history.state, backLayer: id }, "");
    }, 0);

    const onPop = () => {
      const pos = stack.indexOf(id);
      if (pos === -1) return;
      // Still at (or above) our entry → nothing to do. Back always lands on
      // a lower entry: a layer below us, or the page itself (-1).
      const current = stack.indexOf(window.history.state?.backLayer);
      if (current >= pos) return;
      stack.splice(pos); // this layer (and anything above it) is gone
      backRef.current?.();
    };
    window.addEventListener("popstate", onPop);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPop);
      if (!pushed) return;
      const pos = stack.indexOf(id);
      if (pos === -1) return; // already removed by Back
      const count = stack.length - pos;
      const top = stack[stack.length - 1];
      stack.splice(pos);
      // Closed from the UI: drop our entries — but only if the browser is
      // still on them (an in-app navigation since then must not be undone).
      if (window.history.state?.backLayer === top) window.history.go(-count);
    };
  }, [active]);
}
