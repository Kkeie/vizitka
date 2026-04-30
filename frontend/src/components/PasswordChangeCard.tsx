// frontend/src/components/PasswordChangeCard.tsx
import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { changePassword } from "../api";

interface PasswordChangeCardProps {
  anchorRect: DOMRect;
  onClose: () => void;
  onSuccess: (newToken: string) => void;
}

const errorMessages: Record<string, string> = {
  "invalid_current_password": "Неверный текущий пароль",
  "new_password_too_short": "Новый пароль должен быть не менее 4 символов",
  "change_password_failed": "Не удалось изменить пароль",
  "current_password_and_new_password_required": "Требуется текущий и новый пароль",
  "user_not_found": "Пользователь не найден",
};

export default function PasswordChangeCard({ anchorRect, onClose, onSuccess }: PasswordChangeCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!cardRef.current) return;
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

    setPosition({ top, left });
    setIsReady(true);
  }, [anchorRect]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 4) {
      setError("Новый пароль должен быть не менее 4 символов");
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
      onClose();
    } catch (err: any) {
      const errorKey = err.message;
      const ruMessage = errorMessages[errorKey] || "Не удалось изменить пароль. Попробуйте позже.";
      setError(ruMessage);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      ref={cardRef}
      className="card"
      data-inline-edit="true"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        zIndex: 10001,
        width: 300,
        padding: 16,
        visibility: isReady ? "visible" : "hidden",
        opacity: isReady ? 1 : 0,
        transition: "opacity 0.15s ease",
      }}
    >
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Текущий пароль
          </label>
          <input
            type="password"
            className="input"
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
            className="input"
            placeholder="Новый пароль (минимум 4 символа)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={4}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>
            Подтверждение
          </label>
          <input
            type="password"
            className="input"
            placeholder="Подтвердите новый пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {error && <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onClose} style={{ padding: "6px 12px" }}>
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