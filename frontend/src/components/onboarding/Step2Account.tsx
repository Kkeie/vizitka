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
import { Link } from "react-router-dom";

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
          <div className="login-link-bottom">
            <Link to="/login">Уже есть аккаунт? Войти</Link>
          </div>
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
          max-width: 440px;
        }
        .step2 .step-right {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .btn-back {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          margin-bottom: 24px;
          color: var(--primary, #000);
          font-weight: 500;
          padding: 0;
          transition: opacity 0.2s ease;
        }
        .btn-back:hover {
          opacity: 0.7;
        }
        .step2 .step-title {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
          color: var(--text, #1a1a1a);
        }
        .account-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .account-form .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .account-form label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text, #1a1a1a);
        }
        .account-form .input {
          width: 100%;
          padding: 14px 18px;
          border: 1.5px solid var(--border, #e5e5e5);
          border-radius: var(--radius-sm, 10px);
          font-size: 15px;
          background: var(--surface, #ffffff);
          color: var(--text, #1a1a1a);
          outline: none;
          transition: border 0.2s ease;
        }
        .account-form .input:focus {
          border-color: var(--primary, #000);
        }
        .account-form .btn-primary {
          width: 100%;
          padding: 14px 24px;
          background: var(--primary, #000);
          color: #fff;
          border: none;
          border-radius: var(--radius-sm, 10px);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .account-form .btn-primary:hover {
          background: var(--primary-hover, #333);
        }
        .account-form .btn-primary:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .error-message {
          color: #ef4444;
          font-size: 14px;
          margin-top: -8px;
        }
        .login-link-bottom {
          text-align: center;
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid var(--border, #e5e5e5);
        }
        .login-link-bottom a {
          color: var(--primary, #000);
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
        }
        .login-link-bottom a:hover {
          text-decoration: underline;
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
        @media (max-width: 900px) {
          .step2 {
            flex-direction: column;
            padding: 24px;
          }
          .step2 .step-right {
            order: -1;
            justify-content: center;
            margin-bottom: 32px;
          }
          .step2 .step-left {
            max-width: 100%;
          }
        }
        @media (max-width: 480px) {
          .step2 .step-title {
            font-size: 28px;
          }
          .phone-icon-item {
            width: 56px;
            height: 56px;
          }
          .phone-icon-item svg {
            width: 24px;
            height: 24px;
          }
        }
      `}</style>
    </div>
  );
}