import React, { useState, useEffect, useRef, useCallback } from "react";
import { register, checkEmail, DEVICE_RESUME_SESSION_STORAGE_KEY } from "../../api";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "../../lib/authFieldLimits";
import { Link, useNavigate } from "react-router-dom";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";

interface Step2FormProps {
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function Step2Form({ username, onBack, onSuccess }: Step2FormProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const checkIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isValidEmailFormat = useCallback((value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), []);

  const runEmailCheck = useCallback(
    async (rawEmail: string) => {
      const normalized = rawEmail.trim().toLowerCase();
      if (!normalized) {
        setEmailError("Email обязателен");
        setEmailAvailable(null);
        return false;
      }
      if (!isValidEmailFormat(normalized)) {
        setEmailError("Введите корректный email адрес");
        setEmailAvailable(null);
        return false;
      }

      const currentCheckId = ++checkIdRef.current;
      setEmailChecking(true);
      setEmailError("");
      try {
        const result = await checkEmail(normalized);
        if (currentCheckId !== checkIdRef.current) return false;
        if (!result.available) {
          setEmailAvailable(false);
          setEmailError("Этот email уже используется. Войдите или используйте другой.");
          return false;
        }
        setEmailAvailable(true);
        setEmailError("");
        return true;
      } catch (err) {
        if (currentCheckId !== checkIdRef.current) return false;
        console.error(err);
        setEmailAvailable(null);
        setEmailError("Не удалось проверить email. Попробуйте снова.");
        return false;
      } finally {
        if (currentCheckId === checkIdRef.current) {
          setEmailChecking(false);
        }
      }
    },
    [isValidEmailFormat]
  );

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setEmailError("");
      setEmailAvailable(null);
      setEmailChecking(false);
      return;
    }

    if (!isValidEmailFormat(normalized)) {
      setEmailError("Введите корректный email адрес");
      setEmailAvailable(null);
      setEmailChecking(false);
      return;
    }

    setEmailError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runEmailCheck(normalized);
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [email, isValidEmailFormat, runEmailCheck]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const normalizedEmail = email.trim().toLowerCase();

    if (emailChecking) {
      setError("Подождите завершения проверки email.");
      return;
    }

    const isEmailValid = await runEmailCheck(normalizedEmail);
    if (!isEmailValid) return;

    if (normalizedEmail.length > EMAIL_MAX_LENGTH) {
      setError(`Email не длиннее ${EMAIL_MAX_LENGTH} символов`);
      return;
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`Пароль — не короче ${PASSWORD_MIN_LENGTH} символов`);
      return;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      setError(`Пароль — не длиннее ${PASSWORD_MAX_LENGTH} символов`);
      return;
    }

    setLoading(true);
    try {
      const result = await register(username, normalizedEmail, password);
      if (result.verificationRequired) {
        try {
          sessionStorage.setItem(DEVICE_RESUME_SESSION_STORAGE_KEY, result.deviceResumeToken);
        } catch {
          /* storage disabled */
        }
        navigate(`/register/pending?email=${encodeURIComponent(result.email)}`, { replace: true });
        return;
      }
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "username_taken") {
        setError("Эта ссылка больше недоступна. Вернитесь и выберите другую.");
      } else if (err instanceof Error && err.message === "email_taken") {
        setError("Этот email уже используется. Войдите или используйте другой.");
      } else {
        setError("Не удалось создать аккаунт. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="auth-bento__back" onClick={onBack} aria-label="Back">
        ←
      </button>
      <p className="auth-bento__kicker">{PUBLIC_BASE_URL}/{username} теперь ваш!</p>
      <h1 className="login-bento__title auth-bento__title">Теперь создайте аккаунт.</h1>

      <form onSubmit={handleSubmit} className="auth-bento__form" noValidate>
        {error && (
          <p className="login-bento__error" role="alert">
            {error}
          </p>
        )}
        <div className="login-bento__row">
          <input
            className="login-bento__input"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Email адрес"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            onBlur={() => {
              const normalized = email.trim().toLowerCase();
              if (normalized && isValidEmailFormat(normalized)) {
                runEmailCheck(normalized);
              }
            }}
            spellCheck={false}
            maxLength={EMAIL_MAX_LENGTH}
            required
            autoFocus
          />
          <input
            className="login-bento__input"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            required
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
          />
        </div>
        {emailChecking && <p className="login-bento__subtitle">Проверка email...</p>}
        {!emailChecking && emailAvailable === true && (
          <p className="login-bento__subtitle">Email доступен</p>
        )}
        {emailError && (
          <p className="login-bento__error" role="alert">
            {emailError}
          </p>
        )}

        <button
          className="login-bento__submit"
          type="submit"
          disabled={
            loading ||
            emailChecking ||
            !!emailError ||
            !email.trim() ||
            emailAvailable === false
          }
        >
          {loading ? "Создание аккаунта…" : "Создать аккаунт"}
        </button>
      </form>

      <p className="login-bento__foot">
        <Link to="/login" state={{ from: "register" }}>Уже есть аккаунт? Войти</Link>
      </p>
    </>
  );
}
