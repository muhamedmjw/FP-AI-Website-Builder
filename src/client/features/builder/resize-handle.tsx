"use client";

import { TouchEvent, useCallback, useEffect, useRef } from "react";

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
  const lastTouchX = useRef(0);

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

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    isDragging.current = true;
    lastTouchX.current = event.touches[0].clientX;
  }

  function handleTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (!isDragging.current) return;

    const currentTouchX = event.touches[0].clientX;
    const deltaX = currentTouchX - lastTouchX.current;
    lastTouchX.current = currentTouchX;
    onResize(deltaX);
    event.preventDefault();
  }

  function handleTouchEnd() {
    isDragging.current = false;
    onResizeEnd();
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      className="group flex w-4 shrink-0 cursor-col-resize items-center justify-center hover:bg-[var(--app-hover-bg)]"
      title="Drag to resize"
    >
      <div className="h-8 w-0.5 rounded-full bg-[var(--app-border)] transition group-hover:bg-[var(--app-text-muted)]" />
    </div>
  );
}
