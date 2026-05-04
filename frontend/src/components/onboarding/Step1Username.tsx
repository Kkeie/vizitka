import React, { useState } from "react";
import { Link } from "react-router-dom";
import FloatingCards from "./FloatingCards";
import UsernameInputWithSuggestions from "../UsernameInputWithSuggestions";
import { checkUsername } from "../../api";

interface Step1UsernameProps {
  onNext: (username: string) => void;
  initialUsername?: string;
}

export default function Step1Username({ onNext, initialUsername = "" }: Step1UsernameProps) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = async () => {
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 3) {
      setError("Минимум 3 символа");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(normalized)) {
      setError("Только латиница, цифры и _");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await checkUsername(normalized);
      if (!result.available) {
        setError("Этот nickname уже занят. Выберите другой.");
        return;
      }
      onNext(normalized);
    } catch (e) {
      console.error(e);
      setError("Не удалось проверить nickname. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step-container step1">
      <div className="step-left">
        <h1 className="step-title">Сначала выберите уникальную ссылку</h1>
        <UsernameInputWithSuggestions
          value={username}
          onChange={(val) => {
            setUsername(val);
            setError(null);
          }}
          disabled={loading}
        />
        <button className="btn btn-primary step-next" onClick={handleNext} disabled={username.length < 3 || loading}>
          {loading ? "Проверяем..." : "Продолжить →"}
        </button>
        {error && <div className="step-error">{error}</div>}
        <div className="login-link-bottom">
          <Link to="/login">Уже есть аккаунт? Войти</Link>
        </div>
      </div>
      <div className="step-right">
        <FloatingCards username={username} withLinkCard />
      </div>
      <style>{`
        .step-container {
          display: flex;
          gap: 48px;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px;
        }
        .step-left {
          flex: 1;
          max-width: 440px;
        }
        .step-right {
          flex: 1;
          position: relative;
          min-height: 500px;
        }
        .step-title {
          font-size: 36px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 24px;
        }
        .step-next {
          margin-top: 8px;
          width: 100%;
        }
        .step-error {
          margin-top: 8px;
          font-size: 13px;
          color: #dc2626;
        }
        .login-link-bottom {
          margin-top: 24px;
          text-align: center;
          padding-top: 16px;
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
        @media (max-width: 900px) {
          .step-container {
            flex-direction: column;
            padding: 24px;
          }
          .step-right {
            order: -1;
            width: 100%;
            min-height: 300px;
          }
          .step-left {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}