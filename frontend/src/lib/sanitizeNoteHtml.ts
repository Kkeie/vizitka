/** Санитизация HTML заметки — допускаем только b, i, em, strong, span (color), br, p */
const ALLOWED = new Set(["b", "i", "em", "strong", "span", "br", "p"]);

function sanitizeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (!ALLOWED.has(tag)) {
    return Array.from(node.childNodes).map(sanitizeNode).join("");
  }
  let attrs = "";
  if (tag === "span" && el.style?.color) {
    const c = el.style.color;
    if (/^#[0-9a-fA-F]{3,8}$/.test(c) || /^rgb\(/.test(c)) {
      attrs = ` style="color:${c}"`;
    }
  }
  const inner = Array.from(node.childNodes).map(sanitizeNode).join("");
  if (tag === "br") return "<br>";
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

export function sanitizeNoteHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return Array.from(div.childNodes).map(sanitizeNode).join("").trim();
}

/** Содержит ли строка HTML-теги */
export function looksLikeHtml(s: string): boolean {
  return /<[a-z][a-z0-9]*[\s>]/.test(s ?? "");
}
