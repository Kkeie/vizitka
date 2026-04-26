import React from "react";
import { REGISTRATION_DECO_SOCIALS } from "../data/registrationDecoSocials";
import "../pages/LoginPage.css";

const DECO_FRAMES: Array<{
  w: number;
  h: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rot: number;
  z: number;
  iconW: number;
  border?: string;
  radius?: number;
}> = [
  { w: 64, h: 140, top: "4%", left: "8%", rot: -8, z: 3, iconW: 32 },
  { w: 88, h: 88, top: "0", left: "32%", rot: 4, z: 2, iconW: 40 },
  { w: 80, h: 80, top: "6%", right: "10%", rot: -3, z: 2, iconW: 40 },
  { w: 200, h: 86, top: "36%", left: "18%", rot: -2, z: 4, iconW: 32 },
  { w: 80, h: 80, top: "36%", right: "4%", rot: 6, z: 3, iconW: 40, border: "1px solid #30363d" },
  { w: 88, h: 88, bottom: "6%", right: "8%", rot: -5, z: 2, iconW: 40 },
];

/**
 * Правая колонка на логине: плавающие плитки; подпись сети — на самой плитке (как на шаге 1 регистрации).
 */
export default function AuthSocialCollage() {
  return (
    <div className="login-bento__art" aria-hidden="true">
      <div className="login-bento__art-inner">
        {REGISTRATION_DECO_SOCIALS.map((item, i) => {
          const frame = DECO_FRAMES[i];
          if (!frame) return null;
          const { Icon, color, label } = item;
          const groupStyle: React.CSSProperties = {
            zIndex: frame.z,
            ["--tilt" as string]: `${frame.rot}deg`,
            animationName: "loginBentoFloat",
            animationDuration: `${6 + i}s`,
            animationDelay: `${i * 0.3}s`,
            animationIterationCount: "infinite",
            animationTimingFunction: "ease-in-out",
            animationFillMode: "both",
            willChange: "transform",
          };
          if (frame.top != null) groupStyle.top = frame.top;
          if (frame.left != null) groupStyle.left = frame.left;
          if (frame.right != null) groupStyle.right = frame.right;
          if (frame.bottom != null) groupStyle.bottom = frame.bottom;

          return (
            <div key={label} className="login-bento__tile-group" style={groupStyle}>
              <div
                className="login-bento__tile"
                style={{
                  width: frame.w,
                  height: frame.h,
                  background: color,
                  borderRadius: frame.radius ?? 12,
                  border: frame.border,
                }}
              >
                <div className="login-bento__tile-icon-wrap">
                  <Icon
                    width={frame.iconW}
                    height={frame.iconW}
                    fill="#ffffff"
                    className="login-bento__tile-icon"
                    aria-hidden
                  />
                </div>
                <span className="login-bento__tile-label">{label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
