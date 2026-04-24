import React, { useState, useEffect } from "react";
import PhoneMockup from "./PhoneMockup";
import { register } from "../../api";
import {
  TelegramIcon,
  VKIcon,
  YouTubeIcon,
  InstagramIcon,
  GitHubIcon,
  LinkedInIcon,
} from "../SocialIcons";

interface Step2AccountProps {
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function Step2Account({ username, onBack, onSuccess }: Step2AccountProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setAnimateIn(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Пароль должен быть не менее 4 символов");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      await register(username, password, `${username}@temp.local`);
      onSuccess();
    } catch (err: any) {
      if (err.message === "username_taken") {
        setError("Этот логин уже занят. Вернитесь назад и выберите другой.");
      } else {
        setError("Ошибка регистрации. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Фиксированные карточки – те же, что и в FloatingCards
  const socialIcons = [
    { icon: TelegramIcon, color: "#0088cc", label: "Telegram" },
    { icon: VKIcon, color: "#0077FF", label: "VK" },
    { icon: YouTubeIcon, color: "#FF0000", label: "YouTube" },
    { icon: InstagramIcon, color: "#E4405F", label: "Instagram" },
    { icon: GitHubIcon, color: "#24292e", label: "GitHub" },
    { icon: LinkedInIcon, color: "#0A66C2", label: "LinkedIn" },
  ];

  return (
    <div className="step-container step2">
      <div className="step-left">
        <button className="btn-back" onClick={onBack}>← Назад</button>
        <h2 className="step-title">Создайте аккаунт</h2>
        <form onSubmit={handleSubmit} className="account-form">
          <div className="field">
            <label>Пароль</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              placeholder="Введите пароль"
            />
          </div>
          <div className="field">
            <label>Подтвердите пароль</label>
            <input
              type="password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Повторите пароль"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>
      </div>
      <div className="step-right">
        <div className={`phone-wrapper ${animateIn ? "phone-visible" : ""}`}>
          <PhoneMockup>
            <div className="phone-link-header">bento.me/{username}</div>
            <div className="phone-icons-grid">
              {socialIcons.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="phone-icon-item" style={{ backgroundColor: item.color }}>
                    <Icon width={32} height={32} fill="white" />
                  </div>
                );
              })}
            </div>
          </PhoneMockup>
        </div>
      </div>
      <style>{`
        .step2 {
          display: flex;
          flex-direction: row;
          gap: 48px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
          position: relative;
        }
        .step2 .step-left {
          flex: 1;
          max-width: 400px;
        }
        .step2 .step-right {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .phone-wrapper {
          opacity: 0;
          transform: scale(0.95) translateY(20px);
          transition: all 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.2);
        }
        .phone-wrapper.phone-visible {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        .btn-back {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 24px;
          color: var(--primary);
          font-weight: 500;
        }
        .account-form .field {
          margin-bottom: 24px;
        }
        .account-form label {
          display: block;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 8px;
          color: var(--text);
        }
        .input {
          width: 100%;
          padding: 14px 18px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-size: 15px;
          background: var(--surface);
        }
        .phone-link-header {
          font-weight: 600;
          text-align: center;
          padding: 12px;
          background: #e9ecef;
          border-radius: 40px;
          margin-bottom: 24px;
          font-size: 14px;
          color: #1a1a1a;
        }
        .phone-icons-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          justify-items: center;
        }
        .phone-icon-item {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .error-message {
          color: #ef4444;
          font-size: 14px;
          margin-top: 8px;
        }
        @media (max-width: 900px) {
          .step2 {
            flex-direction: column;
          }
          .step2 .step-right {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}