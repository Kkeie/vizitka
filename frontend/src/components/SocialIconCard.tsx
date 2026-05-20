import type { FC, SVGProps } from "react";

interface SocialIconCardProps {
  Icon: FC<SVGProps<SVGSVGElement>>;
  size?: number;
}

export default function SocialIconCard({ Icon, size = 88 }: SocialIconCardProps) {
  return <Icon width={size} height={size} fill="#ffffff" />;
}
