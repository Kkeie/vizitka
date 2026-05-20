import type { FC, SVGProps } from "react";
import {
  TelegramIcon,
  VKIcon,
  GitHubIcon,
  DprofileIcon,
  MaxIcon,
  DribbbleIcon,
} from "../components/SocialIconsWithBg";

export type RegistrationDecoSocial = {
  Icon: FC<SVGProps<SVGSVGElement>>;
  color: string;
  label: string;
};

/** Декоративные «плитки» соцсетей: логин, онбординг регистрации */
export const REGISTRATION_DECO_SOCIALS: RegistrationDecoSocial[] = [
  { Icon: TelegramIcon, color: "#0088cc", label: "Telegram" },
  { Icon: VKIcon, color: "#0077FF", label: "VK" },
  { Icon: GitHubIcon, color: "#24292e", label: "GitHub" },
  { Icon: DprofileIcon, color: "#1E2A3A", label: "Dprofile" },
  { Icon: MaxIcon, color: "#000000", label: "Max" },
  { Icon: DribbbleIcon, color: "#EA4C89", label: "Dribbble" },
];
