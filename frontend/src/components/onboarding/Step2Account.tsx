import React, { useState, useEffect, useRef, useCallback } from "react";
import { register, checkEmail } from "../../api";
import { Link, useNavigate } from "react-router-dom";
import { REGISTRATION_DECO_SOCIALS, type RegistrationDecoSocial } from "../../lib/registrationDecoSocials";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";
import PhoneMockup from "./PhoneMockup";
import "../../pages/LoginPage.css";

interface Step2AccountProps {
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function Step2Account({ username, onBack, onSuccess }: Step2AccountProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const checkIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    requestAnimationFrame(() => setPhoneVisible(true));
  }, []);

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

    if (password.length < 4) {
      setError("Пароль должен быть не менее 4 символов");
      return;
    }

    setLoading(true);
    try {
      const result = await register(username, normalizedEmail, password);
      if (result.verificationRequired) {
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
    <div className="login-bento min-h-screen">
      <div className="login-bento__inner step2-reg">
        <div className="login-bento__form-col auth-bento__stack">
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
                minLength={4}
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
             <Link to="/login">Уже есть аккаунт? Войти</Link>
           </p>
        </div>

        <div className="step2-reg__right">
          <div className={`step2-reg__phone ${phoneVisible ? "step2-reg__phone--visible" : ""}`}>
            <PhoneMockup>
              <div className="step2-reg__link-pill">{PUBLIC_BASE_URL}/{username}</div>
              <div className="step2-reg__icons">
                {REGISTRATION_DECO_SOCIALS.map((item: RegistrationDecoSocial) => {
                  const Icon = item.Icon;
                  return (
                    <div
                      key={item.label}
                      className="step2-reg__icon-tile"
                      style={{ backgroundColor: item.color }}
                    >
                      <Icon width={32} height={32} fill="white" />
                    </div>
                  );
                })}
              </div>
            </PhoneMockup>
          </div>
        </div>
      </div>
      <style>{`
        .step2-reg__right {
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .step2-reg__phone {
          opacity: 0;
          transform: scale(0.95) translateY(20px);
          transition: opacity 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.2),
            transform 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.2);
        }
        .step2-reg__phone--visible {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        .step2-reg__link-pill {
          font-weight: 600;
          text-align: center;
          padding: 12px 16px;
          background: #e9ecef;
          border-radius: 40px;
          margin-bottom: 20px;
          font-size: 14px;
          color: #1a1a1a;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .step2-reg__icons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          justify-items: center;
        }
        .step2-reg__icon-tile {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        @media (max-width: 900px) {
          .step2-reg {
            align-items: start;
          }
          .step2-reg__right {
            order: -1;
            width: 100%;
            margin-bottom: 24px;
          }
          .step2-reg__icon-tile {
            width: 60px;
            height: 60px;
          }
          .step2-reg__icon-tile svg {
            width: 26px;
            height: 26px;
          }
        }
      `}</style>
    </div>
  );
}
