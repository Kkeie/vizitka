import React, { useEffect, useState } from "react";
import { REGISTRATION_DECO_SOCIALS } from "../../lib/registrationDecoSocials";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";
import { AUTH_DECO, DECO_LAYOUT_3COL, DECO_LAYOUT_2COL } from "../../lib/authSocialConfig";

interface PhonePreviewProps {
  username: string;
  visible?: boolean;
}

export default function PhonePreview({ username, visible = false }: PhonePreviewProps) {
  const [is3Col, setIs3Col] = useState(true);
  const step = AUTH_DECO.ICON_SIZE + AUTH_DECO.GAP;

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
  const maxRow = Math.max(...layout.map(s => s.row + (s.rowSpan ?? 1)));
  const gridW = cols * AUTH_DECO.ICON_SIZE + (cols - 1) * AUTH_DECO.GAP;
  const gridH = maxRow * AUTH_DECO.ICON_SIZE + (maxRow - 1) * AUTH_DECO.GAP;
  const PILL_OFFSET = 56;

  return (
    <div className="step2-reg__right">
      <div className={`step2-reg__phone ${visible ? "step2-reg__phone--visible" : ""}`}>
        <div className="phone-mockup step2-reg__mockup">
          <div className="phone-screen">
            <div className="step2-reg__deco-grid" style={{ width: gridW, height: gridH + PILL_OFFSET }}>
              <div className="step2-reg__link-pill">
                <span className="pill__gray pill__domain">{PUBLIC_BASE_URL}/</span>
                <span className="pill__dark">{username}</span>
              </div>
              {layout.map((slot) => {
                const item = REGISTRATION_DECO_SOCIALS.find(s => s.label === slot.label)!;
                const Icon = item.Icon;
                const cs = slot.colSpan ?? 1;
                const rs = slot.rowSpan ?? 1;
                const left = slot.col * step;
                const top = slot.row * step + PILL_OFFSET;
                const w = cs * AUTH_DECO.ICON_SIZE + (cs - 1) * AUTH_DECO.GAP;
                const h = rs * AUTH_DECO.ICON_SIZE + (rs - 1) * AUTH_DECO.GAP;
                const isSquare = cs === rs;

                return (
                  <div
                    key={slot.label}
                    style={{
                      position: "absolute",
                      top,
                      left,
                      width: w,
                      height: h,
                      backgroundColor: item.color,
                      borderRadius: 20,
                      overflow: "hidden",
                    }}
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
        .phone-mockup {
          background: #e8e8e8;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          width: 300px;
          margin: 0 auto;
        }
        .phone-screen {
          position: relative;
          background: transparent;
        }
        .step2-reg__link-pill {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 280px;
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
        .step2-reg__deco-grid {
          position: relative;
          margin: 0 auto;
        }
        .step2-reg__mockup {
          width: 304px;
        }
        @media (max-width: 836px) {
          .step2-reg { align-items: start; }
          .step2-reg__right {
            order: -1;
            width: 100%;
            margin-bottom: 24px;
          }
        }
        @media (max-width: 369px) {
          .step2-reg__mockup { width: 208px; }
          .step2-reg__link-pill { width: 176px; }
          .pill__domain { display: none; }
        }
      `}</style>
    </div>
  );
}
