"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

export interface ButtonPosition {
  x: number;
  y: number;
}

export interface UseDraggableFabOptions {
  storageKey: string;
  defaultBottom?: number;
  defaultRight?: number;
  initialWidth?: number;
  initialHeight?: number;
  onOpen?: () => void;
}

export function clampPosition(
  pos: ButtonPosition,
  btnW: number,
  btnH: number
): ButtonPosition {
  if (typeof window === "undefined") return pos;
  const margin = 16;
  const maxX = Math.max(margin, window.innerWidth - btnW - margin);
  const maxY = Math.max(margin, window.innerHeight - btnH - margin);
  return {
    x: Math.min(Math.max(margin, pos.x), maxX),
    y: Math.min(Math.max(margin, pos.y), maxY),
  };
}

export function savePosition(storageKey: string, pos: ButtonPosition) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(pos));
  } catch (e) {
    console.warn(`[useDraggableFab] Failed to save position (${storageKey}):`, e);
  }
}

export function useDraggableFab({
  storageKey,
  defaultBottom = 24,
  defaultRight = 24,
  initialWidth = 136,
  initialHeight = 48,
  onOpen,
}: UseDraggableFabOptions) {
  const [position, setPosition] = useState<ButtonPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    hasMoved: boolean;
    element: HTMLElement;
  } | null>(null);

  const wasDraggedRef = useRef(false);
  const suppressClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restore position from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const btnW = fabRef.current?.offsetWidth || initialWidth;
    const btnH = fabRef.current?.offsetHeight || initialHeight;
    const defaultPos: ButtonPosition = {
      x: Math.max(16, window.innerWidth - btnW - defaultRight),
      y: Math.max(16, window.innerHeight - btnH - defaultBottom),
    };

    let savedPos: ButtonPosition | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed?.x === "number" &&
          typeof parsed?.y === "number" &&
          !isNaN(parsed.x) &&
          !isNaN(parsed.y)
        ) {
          savedPos = parsed;
        }
      }
    } catch (e) {
      console.warn(`[useDraggableFab] Error reading (${storageKey}):`, e);
    }

    if (savedPos) {
      const margin = 16;
      const isOffscreen =
        savedPos.x < margin ||
        savedPos.y < margin ||
        savedPos.x > window.innerWidth - btnW - margin ||
        savedPos.y > window.innerHeight - btnH - margin;

      if (isOffscreen) {
        const clamped = clampPosition(savedPos, btnW, btnH);
        setPosition(clamped);
        savePosition(storageKey, clamped);
      } else {
        setPosition(savedPos);
      }
    } else {
      setPosition(defaultPos);
    }
  }, [storageKey, defaultBottom, defaultRight, initialWidth, initialHeight]);

  // Handle window resize: clamp or reset position if pushed off-screen
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const btnW = fabRef.current?.offsetWidth || initialWidth;
        const btnH = fabRef.current?.offsetHeight || initialHeight;
        const margin = 16;

        const isOffscreen =
          prev.x < margin ||
          prev.y < margin ||
          prev.x > window.innerWidth - btnW - margin ||
          prev.y > window.innerHeight - btnH - margin;

        if (isOffscreen) {
          const clamped = clampPosition(prev, btnW, btnH);
          savePosition(storageKey, clamped);
          return clamped;
        }
        return prev;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (suppressClickTimeoutRef.current) {
        clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, [storageKey, initialWidth, initialHeight]);

  // Pointer drag event handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      // Allow only primary mouse button
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const currentTarget = e.currentTarget;
      const btnW = fabRef.current?.offsetWidth || initialWidth;
      const btnH = fabRef.current?.offsetHeight || initialHeight;
      const currentX = position?.x ?? Math.max(16, window.innerWidth - btnW - defaultRight);
      const currentY = position?.y ?? Math.max(16, window.innerHeight - btnH - defaultBottom);

      wasDraggedRef.current = false;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: currentX,
        originY: currentY,
        hasMoved: false,
        element: currentTarget,
      };
    },
    [position, defaultBottom, defaultRight, initialWidth, initialHeight]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      // 5px threshold to differentiate between a tap/click and an intentional drag
      if (!dragRef.current.hasMoved && Math.hypot(dx, dy) >= 5) {
        dragRef.current.hasMoved = true;
        wasDraggedRef.current = true;
        setIsDragging(true);

        try {
          dragRef.current.element.setPointerCapture(e.pointerId);
        } catch {}
      }

      if (dragRef.current.hasMoved) {
        const btnW = fabRef.current?.offsetWidth || initialWidth;
        const btnH = fabRef.current?.offsetHeight || initialHeight;
        const nextPos = clampPosition(
          {
            x: dragRef.current.originX + dx,
            y: dragRef.current.originY + dy,
          },
          btnW,
          btnH
        );
        setPosition(nextPos);
      }
    },
    [initialWidth, initialHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;

      const didMove = dragRef.current.hasMoved;
      const el = dragRef.current.element;

      try {
        el.releasePointerCapture(e.pointerId);
      } catch {}

      if (didMove) {
        if (position) {
          savePosition(storageKey, position);
        }
        // Block upcoming synthetic click event caused by mouseup
        wasDraggedRef.current = true;
        if (suppressClickTimeoutRef.current) {
          clearTimeout(suppressClickTimeoutRef.current);
        }
        suppressClickTimeoutRef.current = setTimeout(() => {
          wasDraggedRef.current = false;
          setIsDragging(false);
        }, 150);
      } else {
        wasDraggedRef.current = false;
        setIsDragging(false);
        // Instant response on mobile touch release without 300ms tap delay
        if (onOpen) {
          onOpen();
        }
      }

      dragRef.current = null;
    },
    [position, storageKey, onOpen]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
      try {
        dragRef.current.element.releasePointerCapture(e.pointerId);
      } catch {}
      dragRef.current = null;
      setIsDragging(false);
      wasDraggedRef.current = false;
    },
    []
  );

  // Click handler to catch native click events
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (wasDraggedRef.current || isDragging) {
        e.preventDefault();
        e.stopPropagation();
        wasDraggedRef.current = false;
        return;
      }
      if (onOpen) {
        onOpen();
      }
    },
    [isDragging, onOpen]
  );

  // Computes chat panel style adjacent to the button's position while staying inside the viewport
  const getPanelStyle = useCallback(
    (panelWidth = 420, panelHeight = 580): React.CSSProperties | undefined => {
      if (typeof window === "undefined" || !position) return undefined;
      // Mobile screen: let responsive CSS classes render bottom-anchored modal
      if (window.innerWidth < 640) {
        return undefined;
      }

      const btnW = fabRef.current?.offsetWidth || initialWidth;
      const btnH = fabRef.current?.offsetHeight || initialHeight;
      const effectivePanelH = Math.min(panelHeight, window.innerHeight - 32);
      const margin = 16;

      // Horizontal placement
      let left: number;
      if (position.x + btnW / 2 > window.innerWidth / 2) {
        // Button in right half: align right edge of panel with button
        left = position.x + btnW - panelWidth;
      } else {
        // Button in left half: align left edge of panel with button
        left = position.x;
      }
      left = Math.max(margin, Math.min(left, window.innerWidth - panelWidth - margin));

      // Vertical placement
      let top: number;
      if (position.y + btnH / 2 > window.innerHeight / 2) {
        // Button in lower half: place panel above button
        top = position.y - effectivePanelH - 12;
        if (top < margin) {
          top = margin;
        }
      } else {
        // Button in upper half: place panel below button
        top = position.y + btnH + 12;
        if (top + effectivePanelH > window.innerHeight - margin) {
          top = window.innerHeight - effectivePanelH - margin;
        }
      }

      return {
        left: `${left}px`,
        top: `${top}px`,
        bottom: "auto",
        right: "auto",
        position: "fixed",
      };
    },
    [position, initialWidth, initialHeight]
  );

  return {
    position,
    isDragging,
    fabRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleClick,
    getPanelStyle,
  };
}

