import React, { useEffect, useState } from "react";
import { REGISTRATION_DECO_SOCIALS } from "../../lib/registrationDecoSocials";
import { AUTH_DECO, DECO_LAYOUT_3COL, DECO_LAYOUT_2COL } from "../../lib/authSocialConfig";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";

interface FloatingCardsProps {
  username: string;
  withLinkCard?: boolean;
}

interface ScatterConfig {
  sx: number;
  sy: number;
  sr: number;
  dur: number;
}

const SCATTER: Record<string, ScatterConfig> = {
  Telegram:  { sx: -18, sy: -8,  sr: -5, dur: 7  },
  Max:       { sx:   0, sy: -16, sr:  4, dur: 9  },
  Dprofile:  { sx:  14, sy: -6,  sr: -5, dur: 6  },
  VK:        { sx:   8, sy:  10, sr:  3, dur: 10 },
  GitHub:    { sx: -14, sy:  12, sr:  7, dur: 8  },
  Dribbble:  { sx:  -6, sy:  18, sr: -5, dur: 7  },
  pill:      { sx:   0, sy: -22, sr:  4, dur: 6  },
};

export default function FloatingCards({ username, withLinkCard = true }: FloatingCardsProps) {
  const [is3Col, setIs3Col] = useState(true);

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setIs3Col(w >= 370);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const layout = is3Col ? DECO_LAYOUT_3COL : DECO_LAYOUT_2COL;
  const cols = is3Col ? 3 : 2;
  const step = AUTH_DECO.ICON_SIZE + AUTH_DECO.GAP;
  const maxRow = Math.max(...layout.map(s => s.row + (s.rowSpan ?? 1)));
  const gridW = cols * AUTH_DECO.ICON_SIZE + (cols - 1) * AUTH_DECO.GAP;
  const gridH = maxRow * AUTH_DECO.ICON_SIZE + (maxRow - 1) * AUTH_DECO.GAP;
  const PILL_OFFSET = 56;
  const ps = SCATTER.pill ?? { sx: 0, sy: 0, sr: 0, dur: 6 };

  return (
    <div className="floating-cards-container">
      <div className="floating-cards__grid" style={{ width: gridW, height: gridH + PILL_OFFSET }}>
        {withLinkCard && (
          <div
            className="floating-cards__pill-wrap"
            style={{
              position: "absolute",
              top: 4,
              left: 0,
              width: "100%",
              animationDuration: `${ps.dur}s`,
              "--sx": `${ps.sx}px`,
              "--sy": `${ps.sy}px`,
              "--sr": `${ps.sr}deg`,
            } as React.CSSProperties}
          >
            <div className="floating-cards__pill">
              <span className="pill__gray pill__domain">{PUBLIC_BASE_URL}/</span>
              <span className="pill__dark">{username || "ваш-логин"}</span>
            </div>
          </div>
        )}
        {layout.map((slot) => {
          const item = REGISTRATION_DECO_SOCIALS.find(s => s.label === slot.label)!;
          const Icon = item.Icon;
          const cs = slot.colSpan ?? 1;
          const rs = slot.rowSpan ?? 1;
          const s = SCATTER[slot.label] ?? { sx: 0, sy: 0, sr: 0, dur: 8 };
          const left = slot.col * step;
          const top = slot.row * step + PILL_OFFSET;
          const w = cs * AUTH_DECO.ICON_SIZE + (cs - 1) * AUTH_DECO.GAP;
          const h = rs * AUTH_DECO.ICON_SIZE + (rs - 1) * AUTH_DECO.GAP;
          const isSquare = cs === rs;

          return (
            <div
              key={slot.label}
              className="floating-card"
              style={{
                position: "absolute",
                top,
                left,
                width: w,
                height: h,
                backgroundColor: item.color,
                borderRadius: 20,
                overflow: "hidden",
                animationDuration: `${s.dur}s`,
                "--sx": `${s.sx}px`,
                "--sy": `${s.sy}px`,
                "--sr": `${s.sr}deg`,
              } as React.CSSProperties}
            >
              <Icon
                width={isSquare ? w : AUTH_DECO.ICON_SIZE}
                height={isSquare ? h : AUTH_DECO.ICON_SIZE}
                fill="#ffffff"
              />
            </div>
          );
        })}
      </div>
      <style>{`
        .floating-cards-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
          pointer-events: none;
        }
        .floating-cards__grid {
          position: relative;
        }
        .floating-card {
          animation: floatAround 8s infinite ease-in-out;
          will-change: transform;
          pointer-events: none;
        }
        .floating-cards__pill-wrap {
          animation: floatAround 8s infinite ease-in-out;
          will-change: transform;
          pointer-events: none;
        }
        .floating-cards__pill {
          width: 280px;
          margin: 0 auto;
          padding: 12px 16px;
          background: #f8f9fa;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pill__gray { color: #9ca3af; }
        .pill__dark { color: #1a1a1a; }
        @keyframes floatAround {
          0%   { transform: translate(var(--sx, 0), var(--sy, 0))                               rotate(var(--sr, 0deg)); }
          25%  { transform: translate(calc(var(--sx, 0) + 8px), calc(var(--sy, 0) - 14px))  rotate(6deg); }
          50%  { transform: translate(calc(var(--sx, 0) - 6px), calc(var(--sy, 0) - 20px))  rotate(-5deg); }
          75%  { transform: translate(calc(var(--sx, 0) + 12px), calc(var(--sy, 0) - 8px))  rotate(4deg); }
          100% { transform: translate(var(--sx, 0), var(--sy, 0))                               rotate(var(--sr, 0deg)); }
        }
        @media (max-width: 836px) {
          .floating-cards-container { min-height: 300px; align-items: flex-start; padding-top: 20px; }
        }
        @media (max-width: 768px) {
          .floating-cards__pill { width: 280px; }
        }
        @media (max-width: 369px) {
          .floating-cards__pill { width: 176px; }
          .pill__domain { display: none; }
        }
      `}</style>
    </div>
  );
}
