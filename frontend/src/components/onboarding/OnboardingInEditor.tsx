import React, { useState } from "react";
import {
  TelegramIcon, VKIcon, YouTubeIcon, InstagramIcon, GitHubIcon, LinkedInIcon,
  TwitterIcon, DribbbleIcon, BehanceIcon,
} from "../SocialIcons";

type SocialType = "telegram" | "vk" | "instagram" | "twitter" | "linkedin" | "github" | "youtube" | "dribbble" | "behance";

const SOCIAL_OPTIONS: Array<{
  type: SocialType;
  label: string;
  icon: React.ComponentType<{ width?: number; height?: number; fill?: string }>;
  color: string;
  placeholder: string;
}> = [
  { type: "telegram", label: "Telegram", icon: TelegramIcon, color: "#0088cc", placeholder: "@username" },
  { type: "vk", label: "VK", icon: VKIcon, color: "#0077FF", placeholder: "username" },
  { type: "youtube", label: "YouTube", icon: YouTubeIcon, color: "#FF0000", placeholder: "@channel or link" },
  { type: "instagram", label: "Instagram", icon: InstagramIcon, color: "#E4405F", placeholder: "@username" },
  { type: "github", label: "GitHub", icon: GitHubIcon, color: "#24292e", placeholder: "username" },
  { type: "linkedin", label: "LinkedIn", icon: LinkedInIcon, color: "#0A66C2", placeholder: "username" },
  { type: "twitter", label: "Twitter", icon: TwitterIcon, color: "#1DA1F2", placeholder: "@username" },
  { type: "dribbble", label: "Dribbble", icon: DribbbleIcon, color: "#EA4C89", placeholder: "username" },
  { type: "behance", label: "Behance", icon: BehanceIcon, color: "#1769FF", placeholder: "username" },
];

interface OnboardingInEditorProps {
  onAddBlock: (type: "social" | "link", data: any) => Promise<void>;
  onComplete: () => void;
}

export default function OnboardingInEditor({ onAddBlock, onComplete }: OnboardingInEditorProps) {
  const [step, setStep] = useState<"social" | "link">("social");
  const [loading, setLoading] = useState(false);
  const [socialValues, setSocialValues] = useState<Record<string, string>>({});
  const [linkUrl, setLinkUrl] = useState("");

  const addSocial = async (socialType: SocialType, value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    try {
      let url = value.trim();
      if (!url.startsWith("http")) {
        if (socialType === "telegram") url = `https://t.me/${url.replace(/^@/, "")}`;
        else if (socialType === "instagram") url = `https://instagram.com/${url.replace(/^@/, "")}`;
        else if (socialType === "twitter") url = `https://twitter.com/${url.replace(/^@/, "")}`;
        else if (socialType === "youtube") url = `https://youtube.com/@${url.replace(/^@/, "")}`;
        else if (socialType === "github") url = `https://github.com/${url}`;
        else if (socialType === "linkedin") url = `https://linkedin.com/in/${url}`;
        else if (socialType === "vk") url = `https://vk.com/${url}`;
        else if (socialType === "dribbble") url = `https://dribbble.com/${url}`;
        else if (socialType === "behance") url = `https://behance.net/${url}`;
      }
      await onAddBlock("social", { socialType, socialUrl: url });
      setSocialValues(prev => ({ ...prev, [socialType]: "" }));
    } finally {
      setLoading(false);
    }
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    setLoading(true);
    try {
      let url = linkUrl.trim();
      if (!url.startsWith("http")) url = "https://" + url;
      await onAddBlock("link", { linkUrl: url });
      setLinkUrl("");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === "social") {
      setStep("link");
    } else {
      onComplete();
    }
  };

  const skip = () => {
    onComplete();
  };

  return (
    <div className="oe-container">
      <div className="oe-panel">
        {step === "social" ? (
          <>
            <h3 className="oe-title">Добавьте социальные сети</h3>
            <div className="oe-list">
              {SOCIAL_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const value = socialValues[opt.type] || "";
                return (
                  <div key={opt.type} className="oe-row">
                    <div className="oe-icon" style={{ backgroundColor: opt.color }}>
                      <Icon width={24} height={24} fill="white" />
                    </div>
                    <div className="oe-input-wrapper">
                      <input
                        type="text"
                        className="oe-input"
                        placeholder={opt.placeholder}
                        value={value}
                        onChange={e => setSocialValues({ ...socialValues, [opt.type]: e.target.value })}
                      />
                      {value.length > 0 && (
                        <button className="oe-add-btn" onClick={() => addSocial(opt.type, value)} disabled={loading}>
                          Добавить
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <h3 className="oe-title">Добавьте произвольную ссылку</h3>
            <div className="oe-row oe-link-row">
              <div className="oe-input-wrapper">
                <input
                  type="text"
                  className="oe-input"
                  placeholder="https://example.com"
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                />
                {linkUrl.trim().length > 0 && (
                  <button className="oe-add-btn" onClick={addLink} disabled={loading}>
                    Добавить
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        <div className="oe-actions">
          <button className="oe-btn oe-btn-ghost" onClick={skip}>Пропустить</button>
          <button className="oe-btn oe-btn-primary" onClick={nextStep}>
            {step === "social" ? "Далее →" : "Завершить"}
          </button>
        </div>
      </div>
      <style>{`
        .oe-container {
          width: 100%;
          max-width: 440px;
          margin: 0;
          padding: 0;
        }
        .oe-panel {
          background: var(--surface, #ffffff);
          border-radius: 20px;
          padding: 24px;
          border: 1px solid var(--border, #e5e5e5);
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .oe-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 20px;
          color: var(--text, #1a1a1a);
        }
        .oe-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }
        .oe-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .oe-link-row {
          margin-bottom: 24px;
        }
        .oe-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .oe-input-wrapper {
          position: relative;
          flex: 1;
        }
        .oe-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid var(--border, #e5e5e5);
          border-radius: 12px;
          font-size: 14px;
          background: var(--surface, white);
          color: var(--text, #1a1a1a);
          outline: none;
          transition: border 0.2s;
        }
        .oe-input:focus {
          border-color: var(--primary, #000);
        }
        .oe-add-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          background: #22c55e;
          border: none;
          padding: 6px 14px;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }
        .oe-add-btn:hover {
          background: #16a34a;
        }
        .oe-add-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
        .oe-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 8px;
        }
        .oe-btn {
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .oe-btn-ghost {
          background: transparent;
          border-color: var(--border, #e5e5e5);
          color: var(--text, #1a1a1a);
        }
        .oe-btn-ghost:hover {
          background: var(--accent, #f5f5f5);
        }
        .oe-btn-primary {
          background: var(--primary, #000);
          color: white;
        }
        .oe-btn-primary:hover {
          background: var(--primary-hover, #333);
        }
        @media (max-width: 768px) {
          .oe-panel {
            padding: 16px;
          }
          .oe-icon {
            width: 36px;
            height: 36px;
          }
          .oe-input {
            padding: 10px 12px;
          }
          .oe-add-btn {
            padding: 4px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}