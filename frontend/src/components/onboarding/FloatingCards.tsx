import React from "react";
import { REGISTRATION_DECO_SOCIALS, type RegistrationDecoSocial } from "../../lib/registrationDecoSocials";

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
              backgroundColor: social.color,
              top: `${pos.top}%`,
              left: `${pos.left}%`,
              animationDelay: `${idx * 0.3}s`,
              animationDuration: `${6 + idx}s`,
            }}
          >
            <div className="card-icon">
              <Icon width={28} height={28} fill="white" />
            </div>
            <div className="card-label">{social.label}</div>
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
            <span className="link-icon">🔒</span>
            <span className="link-url">bento.me/{username || "ваш-логин"}</span>
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
          width: 110px;
          padding: 12px 6px;
          border-radius: 20px;
          background: rgba(20,20,20,0.9);
          backdrop-filter: blur(4px);
          color: white;
          text-align: center;
          font-weight: 600;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: transform 0.2s ease;
          animation: floatAround 8s infinite ease-in-out;
          will-change: transform;
          pointer-events: none;
        }
        .link-card {
          width: 200px;
          background: #f8f9fa !important;
          backdrop-filter: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }
        .link-card-content {
          display: flex;
          align-items: center;
          gap: 6px;
          justify-content: center;
          font-family: monospace;
        }
        .link-icon {
          font-size: 14px;
          color: #6c757d;
        }
        .link-url {
          font-size: 12px;
          color: #1a1a1a;
          font-weight: 500;
          word-break: break-all;
        }
        .card-icon {
          margin-bottom: 6px;
          display: flex;
          justify-content: center;
        }
        .card-label {
          font-size: 11px;
        }
        @keyframes floatAround {
          0% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(6px, -10px) rotate(2deg); }
          50% { transform: translate(-4px, -16px) rotate(-2deg); }
          75% { transform: translate(10px, -6px) rotate(1deg); }
          100% { transform: translate(0, 0) rotate(0deg); }
        }
        @media (max-width: 768px) {
          .floating-cards-container { height: 300px; }
          .floating-card { width: 80px; padding: 8px 4px; }
          .link-card { width: 160px; }
          .card-icon svg { width: 20px; height: 20px; }
          .card-label { font-size: 9px; }
        }
      `}</style>
    </div>
  );
}