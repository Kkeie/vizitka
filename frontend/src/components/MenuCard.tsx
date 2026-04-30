import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface MenuCardProps {
  anchorRect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
  position?: "top" | "bottom";
  width?: number;
}

export default function MenuCard({ anchorRect, onClose, children, align = "left", position = "bottom", width = 240 }: MenuCardProps) {
  const [positionStyle, setPositionStyle] = useState<{ top: number; left: number } | null>(null);
  const [isReady, setIsReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!cardRef.current) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    let left = anchorRect.left;
    if (align === "right") {
      left = anchorRect.right - cardRect.width;
    } else {
      left = anchorRect.left;
    }
    let top = position === "bottom" ? anchorRect.bottom + 8 : anchorRect.top - cardRect.height - 8;

    if (left + cardRect.width > window.innerWidth - 8) {
      left = window.innerWidth - cardRect.width - 8;
    }
    if (left < 8) left = 8;

    if (top < 8) top = anchorRect.bottom + 8;
    if (top + cardRect.height > window.innerHeight - 8) {
      top = anchorRect.top - cardRect.height - 8;
    }

    setPositionStyle({ top, left });
    setIsReady(true);
  }, [anchorRect, align, position]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Если клик был на элементе InlineEditCard (data-inline-edit) или внутри него – не закрываем меню
      if (target.closest('[data-inline-edit="true"]')) return;

      if (cardRef.current && !cardRef.current.contains(target)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={cardRef}
      className="card"
      data-menu-card="true"
      style={{
        position: "fixed",
        top: positionStyle?.top ?? 0,
        left: positionStyle?.left ?? 0,
        zIndex: 10000,
        width,
        padding: "8px 0",
        boxShadow: "var(--shadow-lg)",
        background: "var(--surface)",
        visibility: isReady ? "visible" : "hidden",
        opacity: isReady ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
}