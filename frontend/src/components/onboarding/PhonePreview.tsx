import React from "react";
import { REGISTRATION_DECO_SOCIALS, type RegistrationDecoSocial } from "../../lib/registrationDecoSocials";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";
import PhoneMockup from "./PhoneMockup";
import SocialIconCard from "../SocialIconCard";

interface PhonePreviewProps {
  username: string;
  visible?: boolean;
}

export default function PhonePreview({ username, visible = false }: PhonePreviewProps) {
  return (
    <div className="step2-reg__right">
      <div className={`step2-reg__phone ${visible ? "step2-reg__phone--visible" : ""}`}>
        <PhoneMockup>
          <div className="step2-reg__link-pill">{PUBLIC_BASE_URL}/{username}</div>
          <div className="step2-reg__icons">
            {REGISTRATION_DECO_SOCIALS.map((item: RegistrationDecoSocial) => {
              const Icon = item.Icon;
              return (
                <div key={item.label} className="step2-reg__icon-tile">
                  <SocialIconCard Icon={Icon} />
                </div>
              );
            })}
          </div>
        </PhoneMockup>
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
          width: 88px;
          height: 88px;
          display: flex;
          align-items: center;
          justify-content: center;
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
            width: 72px;
            height: 72px;
          }
          .step2-reg__icon-tile svg {
            width: 72px;
            height: 72px;
          }
        }
      `}</style>
    </div>
  );
}
