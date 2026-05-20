import React from "react";
import { REGISTRATION_DECO_SOCIALS, type RegistrationDecoSocial } from "../lib/registrationDecoSocials";
import SocialIconCard from "./SocialIconCard";
import "../pages/LoginPage.css";

const DECO_FRAMES: Array<{
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  rot: number;
  z: number;
}> = [
  { top: "2%",  left: "8%",  rot: -8, z: 3 },
  { top: "0",   left: "48%", rot: 4,  z: 2 },
  { top: "30%", left: "4%",  rot: -3, z: 4 },
  { top: "28%", left: "50%", rot: 6,  z: 3 },
  { top: "58%", left: "12%", rot: -5, z: 2 },
  { top: "56%", left: "54%", rot: 3,  z: 3 },
];

export default function AuthSocialCollage() {
  return (
    <div className="login-bento__art" aria-hidden="true">
      <div className="login-bento__art-inner">
        {REGISTRATION_DECO_SOCIALS.map((item: RegistrationDecoSocial, i: number) => {
          const frame = DECO_FRAMES[i];
          if (!frame) return null;
          const { Icon } = item;
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
            <div key={item.label} className="login-bento__tile-group" style={groupStyle}>
              <SocialIconCard Icon={Icon} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
