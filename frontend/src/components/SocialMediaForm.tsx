import React, { useState } from "react";

// Иконки соцсетей (SVG)
const TwitterIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const InstagramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);
const LinkedInIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);
const GitHubIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);
const YouTubeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);
const DribbbleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.369-4.057 3.392-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm4.44 12.834c-.218.29-1.107 1.545-3.51 2.647-.297-.97-.556-2.045-.768-3.243 2.31-.477 5.162-.315 6.163-.205.044.308.07.614.07.92 0 .934-.132 1.84-.376 2.702z" />
  </svg>
);
const BehanceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 2.106 5.375 4.252 0 0 .244 1.683-.407 1.683h-8.399c.069 1.584.759 2.732 2.446 2.732 1.214 0 2.214-.666 2.607-1.399h2.557zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988h-6.466v-13.988h6.953c5.476.081 5.49 5.444 2.058 6.953 3.107 1.363 3.346 7.035-2.545 7.035zm-3.008-8.988h3.491c3.19 0 3.2-4.941-.479-4.941h-3.012v4.941zm3.464 2.988c4.039 0 4.007 5.908-.474 5.908h-2.99v-5.908h2.964z" />
  </svg>
);
const TelegramIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);
const VKIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M21.546 7.135c.143-.466 0-.814-.68-.814h-2.244c-.57 0-.83.3-.972.63 0 0-1.14 2.784-2.752 4.592-.52.51-.757.68-1.045.68-.143 0-.35-.17-.35-.66V7.135c0-.57-.16-.815-.63-.815H9.35c-.35 0-.56.26-.56.5 0 .52.78.63.86 2.06v3.3c0 .72-.13.83-.42.83-.76 0-2.6-2.8-3.7-6-.22-.63-.44-.88-1.02-.88H2.26c-.64 0-.77.3-.77.63 0 .59.76 3.5 3.55 7.35 1.87 2.64 4.5 3.9 6.89 3.9 1.43 0 1.61-.32 1.61-.88v-2.03c0-.65.14-.78.6-.78.34 0 .93.17 2.3 1.5 1.58 1.58 1.84 2.28 2.73 2.28h2.24c.64 0 .97-.32.78-.95-.21-.64-1.0-1.57-2.03-2.67-.56-.66-1.4-1.37-1.66-1.77-.35-.45-.25-.65 0-1.05 0 0 2.94-4.14 3.25-5.54z" />
  </svg>
);

interface SocialPlatform {
  id: string;
  name: string;
  icon: React.ReactNode;
  placeholder: string;
  socialType: "telegram" | "vk" | "instagram";
  urlPrefix: string;
}

const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "twitter", name: "Twitter", icon: <TwitterIcon />, placeholder: "@username", socialType: "telegram", urlPrefix: "https://twitter.com/" },
  { id: "instagram", name: "Instagram", icon: <InstagramIcon />, placeholder: "@username", socialType: "instagram", urlPrefix: "https://instagram.com/" },
  { id: "linkedin", name: "LinkedIn", icon: <LinkedInIcon />, placeholder: "username", socialType: "telegram", urlPrefix: "https://linkedin.com/in/" },
  { id: "github", name: "GitHub", icon: <GitHubIcon />, placeholder: "@username", socialType: "telegram", urlPrefix: "https://github.com/" },
  { id: "youtube", name: "YouTube", icon: <YouTubeIcon />, placeholder: "@channel", socialType: "telegram", urlPrefix: "https://youtube.com/" },
  { id: "dribbble", name: "Dribbble", icon: <DribbbleIcon />, placeholder: "@username", socialType: "telegram", urlPrefix: "https://dribbble.com/" },
  { id: "behance", name: "Behance", icon: <BehanceIcon />, placeholder: "@username", socialType: "telegram", urlPrefix: "https://behance.net/" },
  { id: "telegram", name: "Telegram", icon: <TelegramIcon />, placeholder: "@username", socialType: "telegram", urlPrefix: "https://t.me/" },
  { id: "vk", name: "VK", icon: <VKIcon />, placeholder: "username", socialType: "vk", urlPrefix: "https://vk.com/" },
];

export type SocialSubmitItem =
  | { type: "social"; socialType: string; socialUrl: string; sort: number }
  | { type: "link"; linkUrl: string; sort: number };

interface SocialMediaFormProps {
  onSubmit: (blocks: SocialSubmitItem[]) => Promise<void>;
  onCancel?: () => void;
}

export default function SocialMediaForm({ onSubmit, onCancel }: SocialMediaFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (platformId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [platformId]: value.trim(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedPlatforms = SOCIAL_PLATFORMS.filter((platform) => {
      const value = formData[platform.id];
      return value && value.length > 0;
    });

    if (selectedPlatforms.length === 0) {
      alert("Выберите хотя бы одну платформу");
      return;
    }

    setSubmitting(true);
    try {
      const blocks: SocialSubmitItem[] = selectedPlatforms.map((platform, index) => {
        let url = formData[platform.id];
        
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          const username = url.replace(/^@/, '').trim();
          url = platform.urlPrefix + username;
        }

        const sort = index + 1;
        if (platform.socialType === 'telegram' && platform.id === 'telegram') {
          return { type: "social", socialType: "telegram", socialUrl: url, sort };
        }
        if (platform.socialType === 'vk') {
          return { type: "social", socialType: "vk", socialUrl: url, sort };
        }
        if (platform.socialType === 'instagram') {
          return { type: "social", socialType: "instagram", socialUrl: url, sort };
        }
        return { type: "link", linkUrl: url, sort };
      });

      await onSubmit(blocks);
    } catch (error) {
      console.error("Ошибка создания блоков:", error);
      alert("Не удалось добавить соцсети. Попробуйте еще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card reveal reveal-in" style={{ 
      padding: 40, 
      maxWidth: 600, 
      margin: "0 auto",
      boxShadow: "var(--shadow-lg)",
    }}>
      <h2 style={{ 
        fontSize: 24, 
        fontWeight: 700, 
        marginBottom: 8, 
        color: "var(--text)",
        textAlign: "center",
      }}>
        Add your social media accounts to your Bento
      </h2>
      <p style={{ 
        fontSize: 14, 
        color: "var(--muted)", 
        marginBottom: 32,
        textAlign: "center",
      }}>
        Начните с добавления ссылок на ваши социальные сети
      </p>

      <form onSubmit={handleSubmit}>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: 12,
          maxHeight: "60vh",
          overflowY: "auto",
          paddingRight: 8,
          marginBottom: 24,
        }}>
          {SOCIAL_PLATFORMS.map((platform) => (
            <div
              key={platform.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderRadius: "var(--radius-sm)",
                background: formData[platform.id] ? "var(--accent)" : "transparent",
                border: "1px solid var(--border)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ 
                width: 32, 
                height: 32, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                flexShrink: 0,
                color: "var(--text)",
              }}>
                {platform.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  placeholder={platform.placeholder}
                  value={formData[platform.id] || ""}
                  onChange={(e) => handleInputChange(platform.id, e.target.value)}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    fontSize: 15,
                    color: "var(--text)",
                    outline: "none",
                    padding: 0,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-ghost"
              style={{ fontSize: 14, padding: "10px 20px" }}
            >
              Пропустить
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ 
              fontSize: 14, 
              padding: "10px 24px",
              background: "var(--primary)",
              color: "white",
            }}
          >
            {submitting ? "Добавление..." : "Add Selected Platforms"}
          </button>
        </div>
      </form>
    </div>
  );
}
