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


export function useClickWithoutDrag(onClickLike) {
  const startRef = useRef(null);

  const onPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;

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
