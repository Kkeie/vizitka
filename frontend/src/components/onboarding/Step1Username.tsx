import React, { useState } from "react";
import { Link } from "react-router-dom";
import FloatingCards from "./FloatingCards";
import UsernameInputWithSuggestions from "../UsernameInputWithSuggestions";
import { checkUsername } from "../../api";
import { USERNAME_MIN_LENGTH, USERNAME_MAX_LENGTH } from "../../lib/authFieldLimits";

interface Step1UsernameProps {
  onNext: (username: string) => void;
  initialUsername?: string;
}

export default function Step1Username({ onNext, initialUsername = "" }: Step1UsernameProps) {
  const [username, setUsername] = useState(initialUsername);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputHasError, setInputHasError] = useState(false);

  const handleNext = async () => {
    const normalized = username.trim().toLowerCase();
    if (normalized.length < USERNAME_MIN_LENGTH) {
      setError(`Минимум ${USERNAME_MIN_LENGTH} символа`);
      return;
    }
    if (normalized.length > USERNAME_MAX_LENGTH) {
      setError(`Максимум ${USERNAME_MAX_LENGTH} символов`);
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
    <div className="login-bento min-h-screen">
      <div className="login-bento__inner">
        <div className="login-bento__form-col">
          <h1 className="login-bento__title">Для начала укажите свою уникальную ссылку</h1>
          <p className="login-bento__subtitle">Лучшие из них всё еще доступны!</p>
          <UsernameInputWithSuggestions
            value={username}
            onChange={(val) => {
              setUsername(val);
              setError(null);
            }}
            disabled={loading}
            onErrorChange={setInputHasError}
            onSelectSuggestion={(val) => {
              setUsername(val);
              onNext(val);
            }}
          />
          {(() => {
            const normalized = username.trim().toLowerCase();
            const valid = normalized.length >= USERNAME_MIN_LENGTH && /^[a-z0-9_]+$/.test(normalized) && !inputHasError;
            if (loading) {
              return <button className="login-bento__submit step-next" disabled>Проверяем...</button>;
            }
            if (valid) {
              return <button className="login-bento__submit step-next" onClick={handleNext}>Использовать мою ссылку</button>;
            }
            return null;
          })()}
          <p className="login-bento__foot">
            <Link to="/login">Уже есть аккаунт? Войти</Link>
          </p>
        </div>
        <div className="step1-right">
          <FloatingCards username={username} withLinkCard />
        </div>
      </div>
    </div>
  );
}