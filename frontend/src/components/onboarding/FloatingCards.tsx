import React from "react";
import { REGISTRATION_DECO_SOCIALS, type RegistrationDecoSocial } from "../../lib/registrationDecoSocials";
import { AUTH_DECO } from "../../lib/authSocialConfig";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";
import SocialIconCard from "../SocialIconCard";

interface FloatingCardsProps {
  username: string;
  withLinkCard?: boolean;
}

export default function FloatingCards({ username, withLinkCard = true }: FloatingCardsProps) {
  // Распределённые позиции: top и left в процентах
  const positions = [
    { top: 5, left: 5 },
    { top: 20, left: 70 },
    { top: 45, left: 15 },
    { top: 60, left: 60 },
    { top: 75, left: 20 },
    { top: 35, left: 85 },
  ];

  return (
    <div className="floating-cards-container">
      {REGISTRATION_DECO_SOCIALS.map((social: RegistrationDecoSocial, idx: number) => {
        const Icon = social.Icon;
        const pos = positions[idx % positions.length];
        return (
          <div
            key={social.label}
            className="floating-card"
            style={{
              top: `${pos.top}%`,
              left: `${pos.left}%`,
              animationDelay: `${idx * 0.3}s`,
              animationDuration: `${6 + idx}s`,
            }}
          >
            <SocialIconCard Icon={Icon} size={AUTH_DECO.ICON_SIZE} />
          </div>
        );
      })}
      {withLinkCard && (
        <div
          className="floating-card link-card"
          style={{
            top: "82%",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#f0f0f0",
            animationDelay: "0.5s",
            animationDuration: "7s",
          }}
        >
          <div className="link-card-content">
            <span className="link-card__text">
              <span className="pill__gray">{PUBLIC_BASE_URL}/</span>
              <span className="pill__dark">{username || "ваш-логин"}</span>
            </span>
          </div>
        </div>
      )}
      <style>{`
        .floating-cards-container {
          position: relative;
          width: 100%;
          height: 500px;
          pointer-events: none;
        }
        .floating-card {
          position: absolute;
          background: none;
          animation: floatAround 8s infinite ease-in-out;
          will-change: transform;
          pointer-events: none;
        }
        .link-card {
          width: 280px;
          padding: 12px 16px;
          border-radius: 20px;
          background: #f8f9fa !important;
          backdrop-filter: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .link-card-content {
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--login-font, "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
        }
        .link-card__text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
          font-size: 14px;
          font-weight: 500;
        }
        .pill__gray { color: #9ca3af; }
        .pill__dark { color: #1a1a1a; }
        @keyframes floatAround {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(6px, -10px) rotate(2deg); }
          50% { transform: translate(-4px, -16px) rotate(-2deg); }
          75% { transform: translate(10px, -6px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @media (max-width: 768px) {
          .floating-cards-container { height: 300px; }
          .link-card { width: 240px; }
        }
      `}</style>
    </div>
  );
}