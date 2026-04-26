import type { FC, SVGProps } from "react";
import {
  InstagramIcon,
  TwitterIcon,
  YouTubeIcon,
  TelegramIcon,
  VKIcon,
  GitHubIcon,
} from "../components/SocialIcons";

export type RegistrationDecoSocial = {
  Icon: FC<SVGProps<SVGSVGElement>>;
  color: string;
  label: string;
};

/** Декоративные «плитки» соцсетей: логин, онбординг регистрации */
export const REGISTRATION_DECO_SOCIALS: RegistrationDecoSocial[] = [
  { Icon: InstagramIcon, color: "#E1306C", label: "Instagram" },
  { Icon: YouTubeIcon, color: "#FF0000", label: "YouTube" },
  { Icon: TelegramIcon, color: "#0088cc", label: "Telegram" },
  { Icon: TwitterIcon, color: "#1DA1F2", label: "X" },
  { Icon: VKIcon, color: "#0077FF", label: "VK" },
  { Icon: GitHubIcon, color: "#333333", label: "GitHub" },
];
