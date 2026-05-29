import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

interface MenuCardProps {
  anchorRect: DOMRect;
  onClose: () => void;
  children: React.ReactNode;
  align?: "left" | "right";
  position?: "top" | "bottom";
  width?: number;
  closing?: boolean;
}

export default function MenuCard({ anchorRect, onClose, children, align = "left", position = "bottom", width = 240, closing = false }: MenuCardProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, offsetX: 0, offsetY: 0 });
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const prevClosingRef = useRef(closing);

  useLayoutEffect(() => {
    if (!cardRef.current || ready) return;
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

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const cardCenterX = left + cardRect.width / 2;
    const cardCenterY = top + cardRect.height / 2;

    setPos({
      top,
      left,
      offsetX: anchorCenterX - cardCenterX,
      offsetY: anchorCenterY - cardCenterY,
    });
    setReady(true);
  }, [anchorRect, align, position, ready]);

  useEffect(() => {
    if (closing && !prevClosingRef.current) {
      prevClosingRef.current = true;
      setExiting(true);
      setTimeout(() => onCloseRef.current(), 150);
    } else if (!closing) {
      prevClosingRef.current = false;
    }
  }, [closing]);

  if (!ready) {
    return createPortal(
      <div
        ref={cardRef}
        data-menu-card="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          visibility: "hidden",
          zIndex: 10000,
          width,
          padding: "8px 0",
          background: "var(--surface)",
        }}
      >
        {children}
      </div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      ref={cardRef}
      data-inline-edit="true"
      data-menu-card="true"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 10000,
        width,
        padding: "8px 0",
        boxShadow: "var(--shadow-lg)",
        background: "var(--surface)",
        borderRadius: "var(--radius-sm)",
      }}
      initial={{ x: pos.offsetX, y: pos.offsetY, scale: 0, opacity: 0 }}
      animate={exiting
        ? { x: pos.offsetX, y: pos.offsetY, scale: 0, opacity: 0 }
        : { x: 0, y: 0, scale: 1, opacity: 1 }
      }
      transition={exiting ? { duration: 0.15, ease: "easeIn" } : { duration: 0.15, ease: "easeOut" }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </motion.div>,
    document.body
  );
}