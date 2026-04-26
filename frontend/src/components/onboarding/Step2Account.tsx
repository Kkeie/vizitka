import React, { useState, useEffect } from "react";
import { register } from "../../api";
import { Link } from "react-router-dom";
import { REGISTRATION_DECO_SOCIALS, type RegistrationDecoSocial } from "../../lib/registrationDecoSocials";
import PhoneMockup from "./PhoneMockup";
import "../../pages/LoginPage.css";

interface Step2AccountProps {
  username: string;
  onBack: () => void;
  onSuccess: () => void;
}

export default function Step2Account({ username, onBack, onSuccess }: Step2AccountProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setPhoneVisible(true));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      const emailToSend = email.trim() || undefined;
      await register(username, password, emailToSend);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "username_taken") {
        setError("This link is no longer available. Go back and choose another.");
      } else {
        setError("Could not create your account. Try again later.");
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
          <p className="auth-bento__kicker">bento.me/{username} is yours!</p>
          <h1 className="login-bento__title auth-bento__title">Now, create your account.</h1>

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
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                spellCheck={false}
                required
                autoFocus
              />
              <input
                className="login-bento__input"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={4}
              />
            </div>

            <button className="login-bento__submit" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="login-bento__foot">
            <Link to="/login">Already have an account? Log in</Link>
          </p>
        </div>

        <div className="step2-reg__right">
          <div className={`step2-reg__phone ${phoneVisible ? "step2-reg__phone--visible" : ""}`}>
            <PhoneMockup>
              <div className="step2-reg__link-pill">bento.me/{username}</div>
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
