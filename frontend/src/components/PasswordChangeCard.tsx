import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { changePassword } from "../api";
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../lib/authFieldLimits";

interface PasswordChangeCardProps {
  anchorRect: DOMRect;
  onClose: () => void;
  onSuccess: (newToken: string) => void;
  closing?: boolean;
  exitToRef?: React.RefObject<DOMRect | null>;
}

const errorMessages: Record<string, string> = {
  "invalid_current_password": "Неверный текущий пароль",
  "new_password_too_short": "Новый пароль — не короче 4 символов",
  "new_password_too_long": "Новый пароль — не длиннее 72 символов",
  "change_password_failed": "Не удалось изменить пароль",
  "current_password_and_new_password_required": "Требуется текущий и новый пароль",
  "user_not_found": "Пользователь не найден",
};

export default function PasswordChangeCard({ anchorRect, onClose, onSuccess, closing = false, exitToRef }: PasswordChangeCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [exitOffset, setExitOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const prevClosingRef = useRef(closing);
  const [pos, setPos] = useState({ top: 0, left: 0, offsetX: 0, offsetY: 0 });

  useLayoutEffect(() => {
    if (!cardRef.current || ready) return;
    const cardRect = cardRef.current.getBoundingClientRect();
    let left = anchorRect.right + 8;
    let top = anchorRect.top;

    if (left + cardRect.width > window.innerWidth - 8) {
      left = window.innerWidth - cardRect.width - 8;
    }
    if (left < 8) left = 8;

    if (top + cardRect.height > window.innerHeight - 8) {
      top = window.innerHeight - cardRect.height - 8;
    }
    if (top < 8) top = 8;

    const anchorCenterX = anchorRect.left + anchorRect.width / 2;
    const anchorCenterY = anchorRect.top + anchorRect.height / 2;
    const cardCenterX = left + cardRect.width / 2;
    const cardCenterY = top + cardRect.height / 2;
    const ox = anchorCenterX - cardCenterX;
    const oy = anchorCenterY - cardCenterY;

    setPos({ top, left, offsetX: ox, offsetY: oy });
    setExitOffset({ x: ox, y: oy });
    setReady(true);
  }, [anchorRect, ready]);

  useEffect(() => {
    if (closing && !prevClosingRef.current) {
      prevClosingRef.current = true;

      if (exitToRef?.current && cardRef.current) {
        const cardRect = cardRef.current.getBoundingClientRect();
        const sCX = exitToRef.current.left + exitToRef.current.width / 2;
        const sCY = exitToRef.current.top + exitToRef.current.height / 2;
        const cCX = pos.left + cardRect.width / 2;
        const cCY = pos.top + cardRect.height / 2;
        setExitOffset({ x: sCX - cCX, y: sCY - cCY });
      } else {
        setExitOffset({ x: pos.offsetX, y: pos.offsetY });
      }

      setExiting(true);
      setTimeout(() => onCloseRef.current(), 150);
    } else if (!closing) {
      prevClosingRef.current = false;
    }
  }, [closing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(`Новый пароль — не короче ${PASSWORD_MIN_LENGTH} символов`);
      return;
    }
    if (newPassword.length > PASSWORD_MAX_LENGTH) {
      setError(`Новый пароль — не длиннее ${PASSWORD_MAX_LENGTH} символов`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const { token } = await changePassword(currentPassword, newPassword);
      onSuccess(token);
      setExiting(true);
      setTimeout(() => onCloseRef.current(), 150);
    } catch (err: any) {
      const errorKey = err.message;
      const ruMessage = errorMessages[errorKey] || "Не удалось изменить пароль. Попробуйте позже.";
      setError(ruMessage);
    } finally {
      setLoading(false);
    }
  };

  const animateTarget = useMemo(() =>
    exiting
      ? { x: exitOffset.x, y: exitOffset.y, scale: 0, opacity: 0 }
      : { x: 0, y: 0, scale: 1, opacity: 1 },
    [exiting, exitOffset.x, exitOffset.y]
  );

  const transitionTarget = useMemo(() =>
    exiting ? { duration: 0.15, ease: "easeIn" as const } : { duration: 0.15, ease: "easeOut" as const },
    [exiting]
  );

  if (!ready) {
    return createPortal(
      <div
        ref={cardRef}
        data-inline-edit="true"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          visibility: "hidden",
          zIndex: 10001,
          width: 300,
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow)",
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Текущий пароль
            </label>
            <input
              type="password"
              className="input no-focus-shadow"
              placeholder="Введите текущий пароль"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Новый пароль
            </label>
            <input
              type="password"
              className="input no-focus-shadow"
              placeholder={`Новый пароль (${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} символов)`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={PASSWORD_MIN_LENGTH}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
              Подтверждение
            </label>
            <input
              type="password"
              className="input no-focus-shadow"
              placeholder="Подтвердите новый пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              maxLength={PASSWORD_MAX_LENGTH}
            />
          </div>
          {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => { if (!exiting) { setExiting(true); setTimeout(() => onCloseRef.current(), 150); } }} style={{ padding: "6px 12px" }}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "6px 12px" }}>
              {loading ? "..." : "Изменить"}
            </button>
          </div>
        </form>
      </div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      key="animated"
      ref={cardRef}
      data-inline-edit="true"
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 10001,
        width: 300,
        padding: 16,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow)",
      }}
      initial={{ x: pos.offsetX, y: pos.offsetY, scale: 0, opacity: 0 }}
      animate={animateTarget}
      transition={transitionTarget}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Текущий пароль
          </label>
          <input
            type="password"
            className="input no-focus-shadow"
            placeholder="Введите текущий пароль"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Новый пароль
          </label>
          <input
            type="password"
            className="input no-focus-shadow"
            placeholder={`Новый пароль (${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} символов)`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={PASSWORD_MIN_LENGTH}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Подтверждение
          </label>
          <input
            type="password"
            className="input no-focus-shadow"
            placeholder="Подтвердите новый пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={() => { if (!exiting) { setExiting(true); setTimeout(() => onCloseRef.current(), 150); } }} style={{ padding: "6px 12px" }}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: "6px 12px" }}>
            {loading ? "..." : "Изменить"}
          </button>
        </div>
      </form>
    </motion.div>,
    document.body
  );
}
