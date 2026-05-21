export const AUTH_DECO = {
  ICON_SIZE: 80,
  GAP: 16,
} as const;

export interface DecoSlot {
  label: string;
  col: number;
  row: number;
  colSpan?: number;
  rowSpan?: number;
}

// [tg] [max] [dprofile]
// [tg] [vk]  [vk]
// [git][vk]  [vk]
// [dr] [dr]
export const DECO_LAYOUT_3COL: DecoSlot[] = [
  { label: "Telegram", col: 0, row: 0, rowSpan: 2 },
  { label: "Max", col: 1, row: 0 },
  { label: "Dprofile", col: 2, row: 0 },
  { label: "VK", col: 1, row: 1, colSpan: 2, rowSpan: 2 },
  { label: "GitHub", col: 0, row: 2 },
  { label: "Dribbble", col: 0, row: 3, colSpan: 2 },
];

// [tg] [max]
// [tg] [vk]
// [dp] [vk]
// [dr] [dr]
// [git]
export const DECO_LAYOUT_2COL: DecoSlot[] = [
  { label: "Telegram", col: 0, row: 0, rowSpan: 2 },
  { label: "Max", col: 1, row: 0 },
  { label: "VK", col: 1, row: 1, rowSpan: 2 },
  { label: "Dprofile", col: 0, row: 2 },
  { label: "Dribbble", col: 0, row: 3, colSpan: 2 },
  { label: "GitHub", col: 0, row: 4 },
];
