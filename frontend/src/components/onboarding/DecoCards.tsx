import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { REGISTRATION_DECO_SOCIALS } from "../../lib/registrationDecoSocials";
import { AUTH_DECO, DECO_LAYOUT_3COL, DECO_LAYOUT_2COL } from "../../lib/authSocialConfig";
import { PUBLIC_BASE_URL } from "../../lib/publicBaseUrl";

type DecoMode = "floating" | "floating-nopill" | "phone";

interface DecoCardsProps {
  username: string;
  mode: DecoMode;
  enterAnimated?: boolean;
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

export default function DecoCards({ username, mode, enterAnimated = false }: DecoCardsProps) {
  const [is3Col, setIs3Col] = useState(true);

  useEffect(() => {
    const check = () => {
      setIs3Col(window.innerWidth >= 370);
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
  const isFloating = mode === "floating" || mode === "floating-nopill";
  const ps = SCATTER.pill ?? { sx: 0, sy: 0, sr: 0, dur: 6 };

  const prevMode = useRef<DecoMode>(mode);
  const [enteringFloating, setEnteringFloating] = useState(() => isFloating && !!enterAnimated);
  const [loopMode, setLoopMode] = useState(() => {
    if (isFloating && enterAnimated) return false;
    return isFloating;
  });

  if (prevMode.current !== mode) {
    const wasPhone = prevMode.current === "phone";
    prevMode.current = mode;

    if (wasPhone && isFloating) {
      if (!enteringFloating || loopMode) {
        setEnteringFloating(true);
        setLoopMode(false);
      }
    } else {
      if (enteringFloating) setEnteringFloating(false);
      if (loopMode !== isFloating) setLoopMode(isFloating);
    }
  }

  useEffect(() => {
    if (enteringFloating) {
      const t1 = setTimeout(() => setEnteringFloating(false), 1500);
      const t2 = setTimeout(() => setLoopMode(true), 1100);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [enteringFloating]);

  return (
    <div className="deco-cards">
      <div className="deco-cards__inner" style={{ width: gridW, height: gridH + PILL_OFFSET }}>
        <AnimatePresence>
          {mode === "phone" && (
            <motion.div
              key="phone-bg"
              className="deco-cards__phone-bg"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, delay: 0.15 }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {mode !== "floating-nopill" && (
            <motion.div
              key="pill"
              className="deco-cards__pill-wrap"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                style={{ width: "fit-content" }}
                initial={(isFloating && !enterAnimated) ? { x: ps.sx, y: ps.sy, rotate: ps.sr } : { x: 0, y: 0, rotate: 0 }}
                animate={isFloating ? (
                  loopMode ? {
                    x: [ps.sx, ps.sx + 8, ps.sx - 6, ps.sx + 12, ps.sx],
                    y: [ps.sy, ps.sy - 14, ps.sy - 20, ps.sy - 8, ps.sy],
                    rotate: [ps.sr, ps.sr + 6, ps.sr - 5, ps.sr + 4, ps.sr],
                  } : {
                    x: ps.sx, y: ps.sy, rotate: ps.sr,
                  }
                ) : { x: 0, y: 0, rotate: 0 }}
                transition={isFloating ? (
                  loopMode ? {
                    duration: ps.dur,
                    repeat: Infinity,
                    ease: "easeInOut",
                  } : {
                    duration: 0.8,
                    delay: enteringFloating ? 0.25 : 0,
                    ease: "easeOut",
                  }
                ) : { duration: 0.3 }}
              >
                <div className="deco-cards__pill">
                  <span className="pill__gray pill__domain">{PUBLIC_BASE_URL}/</span>
                  <span className="pill__dark">{username || "ваш-логин"}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
            <motion.div
              key={slot.label}
              className="deco-card"
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
              initial={(isFloating && !enterAnimated) ? { x: s.sx, y: s.sy, rotate: s.sr } : { x: 0, y: 0, rotate: 0 }}
              animate={isFloating ? (
                loopMode ? {
                  x: [s.sx, s.sx + 8, s.sx - 6, s.sx + 12, s.sx],
                  y: [s.sy, s.sy - 14, s.sy - 20, s.sy - 8, s.sy],
                  rotate: [s.sr, s.sr + 6, s.sr - 5, s.sr + 4, s.sr],
                } : {
                  x: s.sx, y: s.sy, rotate: s.sr,
                }
              ) : { x: 0, y: 0, rotate: 0 }}
              transition={isFloating ? (
                loopMode ? {
                  duration: s.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                } : {
                  duration: 0.8,
                  delay: enteringFloating ? 0.25 : 0,
                  ease: "easeOut",
                }
              ) : { duration: 0.3 }}
            >
              <Icon
                width={isSquare ? w : AUTH_DECO.ICON_SIZE}
                height={isSquare ? h : AUTH_DECO.ICON_SIZE}
                fill="#ffffff"
              />
            </motion.div>
          );
        })}
      </div>

      <style>{`
        .deco-cards {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 500px;
          pointer-events: none;
        }
        .deco-cards__inner {
          position: relative;
          width: fit-content;
          margin: 0 auto;
        }
        .deco-cards__phone-bg {
          position: absolute;
          top: -16px;
          left: -16px;
          right: -16px;
          bottom: -16px;
          background: #e8e8e8;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .deco-cards__pill-wrap {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          z-index: 1;
          pointer-events: none;
        }
        .deco-cards__pill {
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
        @media (max-width: 836px) {
          .deco-cards { min-height: 300px; align-items: flex-start; padding-top: 20px; }
        }
        @media (max-width: 369px) {
          .deco-cards__pill { width: 176px; }
          .pill__domain { display: none; }
        }
      `}</style>
    </div>
  );
}
