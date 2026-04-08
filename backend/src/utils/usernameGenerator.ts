import { RESERVED_USERNAMES } from "../constants";

// Базовая транслитерация (один вариант)
function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
    'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  };
  return text.toLowerCase().split('').map(ch => map[ch] || ch).join('');
}

// Очистка ввода: оставляем латиницу, цифры, подчёркивание и кириллицу
function sanitizeInput(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_а-яё]/g, '');
}

// Проверка финального username (только a-z0-9_, длина ≥3)
export function isValidUsernameFormat(username: string): boolean {
  return /^[a-z0-9_]{3,}$/.test(username);
}

// Генерация всех возможных замен символов (рекурсивно, с ограничением)
function generateVariations(
  input: string,
  maxVariations: number,
  mapping: Record<string, string[]>
): string[] {
  if (!input) return [];
  const results = new Set<string>();
  let current: string[] = [input];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const replacements = mapping[char] || [];
    const allVariants = [char, ...replacements];

    const next: string[] = [];
    for (const str of current) {
      for (const variant of allVariants) {
        const newStr = str.slice(0, i) + variant + str.slice(i + 1);
        if (!results.has(newStr)) {
          results.add(newStr);
          next.push(newStr);
          if (results.size >= maxVariations) break;
        }
      }
      if (results.size >= maxVariations) break;
    }
    current = next;
    if (results.size >= maxVariations) break;
  }
  return Array.from(results).slice(0, maxVariations);
}

// Добавление префиксов/суффиксов
function addAffixes(base: string, limit: number): Set<string> {
  const result = new Set<string>();
  const prefixes = ['', 'the', 'real'];
  const suffixes = ['', 'official', 'real', 'profile'];
  for (const p of prefixes) {
    for (const s of suffixes) {
      let variant = base;
      if (p) variant = p + '_' + variant;
      if (s) variant = variant + '_' + s;
      if (variant !== base) result.add(variant);
      if (result.size >= limit) return result;
    }
  }
  return result;
}

// Добавление чисел и года
function addNumbers(base: string, limit: number): Set<string> {
  const result = new Set<string>();
  const year = new Date().getFullYear();
  result.add(`${base}${year}`);
  result.add(`${base}_${year}`);
  result.add(`${base}_${year % 100}`);
  for (let i = 1; i <= 20; i++) {
    result.add(`${base}${i}`);
    result.add(`${base}_${i}`);
    if (result.size >= limit) break;
  }
  return result;
}

// Основная функция генерации кандидатов
export function generateCandidates(input: string, limit: number = 50): string[] {
  const candidates = new Set<string>();
  if (!input) return [];

  // 1. Очистка
  const cleaned = sanitizeInput(input);
  if (!cleaned) return [];

  // 2. Базовая транслитерация
  const transliterated = transliterate(cleaned);
  if (transliterated && /[a-z0-9_]+/.test(transliterated)) {
    candidates.add(transliterated);
  }

  // 3. Если есть кириллица – генерируем варианты замен по RU карте
  const hasCyrillic = /[а-яё]/.test(cleaned);
  if (hasCyrillic) {
    // Генерируем до 70% лимита вариантов замен
    const ruVariants = generateVariations(cleaned, Math.floor(limit * 0.7), REPLACEMENT_MAP_RU);
    for (const v of ruVariants) {
      const latin = transliterate(v); // убираем остатки кириллицы
      if (latin && /[a-z0-9_]+/.test(latin)) candidates.add(latin);
      if (candidates.size >= limit) break;
    }
  } else {
    // Для латиницы – leet-варианты
    const enVariants = generateVariations(cleaned, Math.floor(limit * 0.7), REPLACEMENT_MAP_EN);
    for (const v of enVariants) {
      candidates.add(v);
      if (candidates.size >= limit) break;
    }
  }

  // 4. Берем базовое имя для аффиксов (первый кандидат или транслитерация)
  let base = Array.from(candidates)[0] || transliterated;
  if (!base || base.length < 3) base = cleaned.replace(/[^a-z0-9_]/g, '');
  if (base && base.length >= 3) {
    const affixed = addAffixes(base, limit);
    for (const a of affixed) {
      candidates.add(a);
      if (candidates.size >= limit) break;
    }
    const numbered = addNumbers(base, limit);
    for (const n of numbered) {
      candidates.add(n);
      if (candidates.size >= limit) break;
    }
  }

  // 5. Финальная фильтрация
  const result = Array.from(candidates)
    .filter(c => c.length >= 3 && /^[a-z0-9_]+$/.test(c))
    .slice(0, limit);

  // 6. Fallback на случай пустого результата
  if (result.length === 0 && transliterated) {
    return [`${transliterated}`, `${transliterated}_official`, `${transliterated}1`, `${transliterated}2`].slice(0, limit);
  }
  return result;
}

// Поиск доступных username в БД
export async function findAvailableUsernames(
  db: any,
  base: string,
  maxSuggestions: number = 10
): Promise<string[]> {
  const candidates = generateCandidates(base, maxSuggestions * 2);
  const available: string[] = [];
  for (const candidate of candidates) {
    if (available.length >= maxSuggestions) break;
    if (RESERVED_USERNAMES.includes(candidate)) continue;
    const exists = db.prepare("SELECT 1 FROM Profile WHERE username = ?").get(candidate);
    if (!exists) available.push(candidate);
  }
  // Если не хватает, добавляем простые числа
  if (available.length < maxSuggestions && candidates.length > 0) {
    const baseName = candidates[0].replace(/[0-9_]+$/, '');
    let counter = 1;
    while (available.length < maxSuggestions && counter < 100) {
      const cand = `${baseName}${counter}`;
      if (!RESERVED_USERNAMES.includes(cand)) {
        const exists = db.prepare("SELECT 1 FROM Profile WHERE username = ?").get(cand);
        if (!exists) available.push(cand);
      }
      counter++;
    }
  }
  return available.slice(0, maxSuggestions);
}

const REPLACEMENT_MAP_EN: Record<string, string[]> = {
  'a': ['4'],
  'b': ['8'],
  'c': [],
  'd': ['cl'],
  'e': ['3'],
  'f': [],
  'g': ['9'],
  'h': ['l1'],
  'i': ['1'],
  'j': [],
  'k': ['lc'],
  'l': ['1'],
  'm': ['l11'],
  'n': ['l1'],
  'o': ['0'],
  'p': [],
  'q': [],
  'r': [],
  's': ['5'],
  't': ['7'],
  'u': [],
  'v': [],
  'w': ['vv'],
  'x': [],
  'y': [],
  'z': ['2'],

  'A': ['4'],
  'B': ['8'],
  'C': [],
  'D': [],
  'E': ['3'],
  'F': [],
  'G': ['9'],
  'H': [],
  'I': ['1'],
  'J': [],
  'K': ['IC'],
  'L': ['1'],
  'M': [],
  'N': [],
  'O': ['0'],
  'P': [],
  'Q': [],
  'R': [],
  'S': ['5'],
  'T': ['7'],
  'U': [],
  'V': [],
  'W': ['VV'],
  'X': [],
  'Y': [],
  'Z': ['2'],
}


const REPLACEMENT_MAP_RU: Record<string, string[]> = {
  'а': ['a', '4'],
  'б': ['b', '6'],
  'в': ['v', 'b', 'l3'],
  'г': ['g'],
  'д': ['d', 'g'],
  'е': ['e'],
  'ё': ['e'],
  'ж': ['zh', 'lll'],
  'з': ['z', '3'],
  'и': ['i', '1', 'l1'],
  'й': ['y', 'i', 'i1'],
  'к': ['k'],
  'л': ['l', 'jl'],
  'м': ['m'],
  'н': ['n'],
  'о': ['o', '0'],
  'п': ['p'],
  'р': ['r', 'p'],
  'с': ['s', 'c', '5'],
  'т': ['t', '7'],
  'у': ['u', 'y'],
  'ф': ['f', 'cp'],
  'х': ['h', 'x'],
  'ц': ['ts', 'c', 'Ll'],
  'ч': ['ch', '4'],
  'ш': ['sh', 'LLI'],
  'щ': ['sch', 'LLL'],
  'ъ': ['b'],
  'ы': ['y', 'i', 'bl'],
  'ь': ['b'],
  'э': ['e'],
  'ю': ['yu', 'u', 'lo', 'l0'],
  'я': ['ya', 'a'],

  'А': ['A', '4'],
  'Б': ['B', '6'],
  'В': ['V', 'B', 'l3'],
  'Г': ['G'],
  'Д': ['D'],
  'Е': ['E', '3'],
  'Ё': ['E'],
  'Ж': ['ZH', 'lll'],
  'З': ['Z', '3'],
  'И': ['I', '1', 'I1'],
  'Й': ['Y', 'I', 'I1'],
  'К': ['K', 'IC'],
  'Л': ['L', '1', 'JI'],
  'М': ['M'],
  'Н': ['N', 'H'],
  'О': ['O', '0'],
  'П': ['P', 'ГI'],
  'Р': ['R', 'P'],
  'С': ['S', 'C'],
  'Т': ['T', '7'],
  'У': ['U', 'Y'],
  'Ф': ['F', 'CP'],
  'Х': ['H', 'X'],
  'Ц': ['TS', 'C', 'LL'],
  'Ч': ['CH', '4'],
  'Ш': ['SH', 'LLI'],
  'Щ': ['SCH', 'LLL'],
  'Ъ': ['b'],
  'Ы': ['Y', 'I', 'bI'],
  'Ь': ['b'],
  'Э': ['E'],
  'Ю': ['YU', 'U', 'IO', 'I0'],
  'Я': ['YA', 'A']
};