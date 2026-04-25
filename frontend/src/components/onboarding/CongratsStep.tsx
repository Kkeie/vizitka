import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface CongratsStepProps {
  onComplete: () => void;
}

export default function CongratsStep({ onComplete }: CongratsStepProps) {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 20, spread: 360, ticks: 60, zIndex: 2000 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        startVelocity: 25,
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="congrats-step">
      <div className="congrats-card">
        <h2 className="congrats-title">Поздравляем!</h2>
        <p className="congrats-message">
          Вы успешно настроили свою визитку. <br />
          Теперь вы можете добавлять любые блоки, менять их размер и порядок.
        </p>
        <button className="btn btn-primary congrats-button" onClick={onComplete}>
          Перейти к редактированию
        </button>
      </div>
      <style>{`
        .congrats-step {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          padding: 0;
        }
        .congrats-card {
          background: var(--surface, #ffffff);
          border-radius: 28px;
          padding: 32px 24px;
          text-align: center;
          box-shadow: var(--shadow-lg);
          border: 1px solid var(--border);
          animation: scaleUp 0.5s cubic-bezier(0.2, 0.9, 0.4, 1.2);
        }
        .congrats-title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #f5af19, #f12711, #f5af19);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradientShift 3s ease infinite;
        }
        .congrats-message {
          font-size: 16px;
          line-height: 1.6;
          color: var(--muted);
          margin-bottom: 32px;
        }
        .congrats-button {
          font-size: 16px;
          padding: 14px 20px;
          background: var(--primary, #000);
          color: white;
          border-radius: 40px;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
          width: auto;
          min-width: 200px;
          display: inline-block;
        }
        @keyframes scaleUp {
          from {
            opacity: 0;
            transform: scale(0.92);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @media (max-width: 560px) {
          .congrats-card {
            padding: 24px 16px;
          }
          .congrats-button {
            width: 100%;
            font-size: 15px;
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}