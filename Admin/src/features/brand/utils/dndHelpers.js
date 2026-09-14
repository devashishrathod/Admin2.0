import { useEffect, useRef } from "react";
import { PointerSensor, KeyboardSensor } from "@dnd-kit/dom";

// Lets one DOM node serve two independent ref callbacks at once (dnd-kit's
// `ref` and `handleRef`) so a single element can be both the sortable
// boundary and the drag handle.
export function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((r) => {
      if (typeof r === "function") r(node);
      else if (r) r.current = node;
    });
  };
}

// dnd-kit's own default `preventActivation` only exempts a button/link/
// input from starting a drag when that control sits OUTSIDE the drag
// handle — it assumes a "handle" is a small dedicated grip icon, never the
// whole draggable card. Our tiles and section headers merge `ref` and
// `handleRef` onto the SAME node (the whole card IS the handle), so any
// button living inside it (Delete, Add Media, Order, ...) was being
// treated as fair game for a drag: on mouse, a handle-contained target
// gets NO activation delay/distance at all, so a drag "starts" the
// instant you press down on the button, and dnd-kit suppresses the
// native click that would otherwise follow — the button's onClick simply
// never fires.
//
// The earlier fix for this (a capture-phase `stopPropagation()` on the
// button) stopped dnd-kit from seeing the pointerdown, but a native
// stopPropagation() also stops the event from ever reaching React's own
// delegated listener higher up the tree — so it silently broke the same
// button's onClick it was meant to protect. This replaces that approach:
// tell the sensor itself to never start a drag from a real interactive
// element (or anything explicitly marked data-no-dnd), so the pointerdown
// keeps propagating completely normally and React's onClick still fires.
function preventActivationForInteractiveElements(event, source) {
  const { target } = event;
  if (!(target instanceof Element)) return false;
  if (target.closest("button, a, input, textarea, select, [data-no-dnd]")) return true;
  if (source.handle?.contains(target)) return false;
  return false;
}

// Pass as `sensors={dragSensors}` to every <DragDropProvider> in this
// feature — configuring the sensor once and reusing it everywhere keeps
// the interactive-element exemption consistent across all of them.
export const dragSensors = [
  PointerSensor.configure({ preventActivation: preventActivationForInteractiveElements }),
  KeyboardSensor,
];

const CLICK_MOVE_TOLERANCE = 6; // px

// Detects a "click" on an element that is also a dnd-kit drag handle.
// dnd-kit's PointerSensor captures the pointer and calls
// preventDefault() on the native click the moment it decides a drag has
// started, so the browser's click event never fires once dnd-kit is
// attached to the same element — no activation-constraint option changes
// this reliably. Instead, track raw pointerdown/pointerup coordinates
// ourselves: if the pointer released within a small tolerance of where it
// was pressed, treat that as a click.
export function useClickWithoutDrag(onClickLike) {
  const startRef = useRef(null);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // A press that started on a real control (Edit/Delete/...) nested
    // inside the tile is that control's own click, not a "click the tile"
    // — without this, pressing Delete also bubbles a pointerdown up to
    // the tile's handler, and releasing it (with no movement) reads as a
    // tile click too, briefly reopening the preview for the item just
    // deleted/edited.
    if (e.target?.closest?.("button, a, input, textarea, select, [data-no-dnd]")) return;
    startRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handlePointerUp = (e) => {
      const start = startRef.current;
      startRef.current = null;
      if (!start) return;
      const dx = Math.abs(e.clientX - start.x);
      const dy = Math.abs(e.clientY - start.y);
      if (dx <= CLICK_MOVE_TOLERANCE && dy <= CLICK_MOVE_TOLERANCE) onClickLike();
    };
    document.addEventListener("pointerup", handlePointerUp);
    return () => document.removeEventListener("pointerup", handlePointerUp);
  }, [onClickLike]);

  return onPointerDown; // attach this to the tile's onPointerDown
}
