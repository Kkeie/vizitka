import type { CSSProperties } from "react";
import type { NoteTextStyle } from "../api";

const FONT_MAP: Record<NonNullable<NoteTextStyle["fontFamily"]>, string> = {
  default: "inherit",
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", Times, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

export function noteStyleToTextCss(ns: NoteTextStyle | null | undefined): CSSProperties {
  if (!ns) {
    return {
      color: "var(--text)",
      textAlign: "left",
      fontWeight: 400,
      fontStyle: "normal",
    };
  }
  const ff = ns.fontFamily && ns.fontFamily !== "default" ? FONT_MAP[ns.fontFamily] : undefined;
  return {
    textAlign: ns.align || "left",
    backgroundColor: ns.backgroundColor || undefined,
    color: ns.textColor || "var(--text)",
    fontFamily: ff,
    fontWeight: ns.bold ? 700 : 400,
    fontStyle: ns.italic ? "italic" : "normal",
  };
}
