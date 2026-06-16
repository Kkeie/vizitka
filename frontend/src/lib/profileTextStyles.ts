import type React from "react";

/** Как у текста блока «заметка» по умолчанию */
export const DEFAULT_NAME_COLOR = "#0a0a0a";
export const DEFAULT_BIO_COLOR = "#0a0a0a";

export const PROFILE_BIO_TEXT_STYLE: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
  fontWeight: 400,
};

const LEGACY_DEFAULT_BIO_COLOR = "#737373";

export function resolveBioColor(bioColor: string | null | undefined): string {
  if (!bioColor) return DEFAULT_BIO_COLOR;
  if (bioColor.toLowerCase() === LEGACY_DEFAULT_BIO_COLOR) return DEFAULT_BIO_COLOR;
  return bioColor;
}
