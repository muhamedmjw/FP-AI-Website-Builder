"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Vertical drag handle for resizing the preview panel.
 * Drag left/right to resize. The parent handles the actual width state.
 */

type ResizeHandleProps = {
  onResize: (deltaX: number) => void;
  onResizeEnd: () => void;
};

export default function ResizeHandle({ onResize, onResizeEnd }: ResizeHandleProps) {
  const isDragging = useRef(false);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging.current) return;
      onResize(event.movementX);
    },
    [onResize]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onResizeEnd();
  }, [onResizeEnd]);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  function handleMouseDown() {
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className="group flex w-2 shrink-0 cursor-col-resize items-center justify-center hover:bg-white/[0.04]"
      title="Drag to resize"
    >
      <div className="h-8 w-0.5 rounded-full bg-white/10 transition group-hover:bg-white/25" />
    </div>
  );
}
