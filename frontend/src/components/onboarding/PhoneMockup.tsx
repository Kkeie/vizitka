import React from "react";

interface PhoneMockupProps {
  children?: React.ReactNode;
  className?: string;
}

export default function PhoneMockup({ children, className = "" }: PhoneMockupProps) {
  return (
    <div className={`phone-mockup ${className}`}>
      <div className="phone-screen">{children}</div>
      <style>{`
        .phone-mockup {
          background: #f5f5f5;
          border-radius: 24px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          width: 300px;
          margin: 0 auto;
        }
        .phone-screen {
          background: transparent;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        @media (max-width: 768px) {
          .phone-mockup { width: 260px; }
        }
      `}</style>
    </div>
  );
}