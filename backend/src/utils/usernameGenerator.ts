import { RESERVED_USERNAMES } from "../constants";

// Транслитерация кириллицы в латиницу (простая)
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

// Очистка: только латинские буквы, цифры, подчёркивание
function filterEn(username: string): string {
  return username.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

export function isValidUsername(username: string): boolean {
  return username.length >= 3 && username.toLowerCase() === username;
}

// Генерирует все возможные варианты замены символов в строке
export function generateVariations(
  input: string,
  maxVariations: number = 50,
  mapping: Record<string, string[]>
): string[] {
  if (!input) return [];

  const results = new Set<string>();
  let current: string[] = [input];

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    const replacements = mapping[char] || [];

    const allVariants = [char, ...replacements];
    
    const next: string[] = [];
    for (const str of current) {
      for (const variant of allVariants) {
        const newStr = str.slice(0, i) + variant + str.slice(i + 1);
        if (!results.has(newStr)) {
          results.add(newStr);
          next.push(newStr);
        }
      }
    }
    current = next;

    if (maxVariations > 0 && results.size >= maxVariations) {
      break;
    }
  }

  return Array.from(results).slice(0, maxVariations);
}

// Генерирует массив кандидатов на основе исходного имени в следующем порядке:
export function generateCandidates(base: string, limit: number = 50): string[] {
  const candidates = new Set<string>();
  if (!base) return [];

  const filteredBase = filterEn(base);
  if (filteredBase) candidates.add(filteredBase);

  const transliteratedBase = transliterate(base);
  if (transliteratedBase) candidates.add(transliteratedBase);

  const filteredTransliterated = filterEn(transliteratedBase);
  if (filteredTransliterated) candidates.add(filteredTransliterated);

  const cleanBase = filteredBase.length >= 3 ? filteredBase : base.toLowerCase();
  if (!cleanBase) return [];

  for (const prefix of PREFIXES) {
    for (const suffix of SUFFIXES) {
    //   const variant1 = (prefix ? prefix : '') + cleanBase + (suffix ? suffix : '');
    //   if (variant1 !== cleanBase) candidates.add(variant1);
      const variant2 = (prefix ? prefix + '_' : '') + cleanBase + (suffix ? '_' + suffix : '');
      if (variant2 !== cleanBase) candidates.add(variant2);

      if (candidates.size >= limit) break;
    }
  }

  if (candidates.size < limit) {
    const year = new Date().getFullYear();
    candidates.add(`${cleanBase}${year}`);
    candidates.add(`${cleanBase}_${year}`);
    candidates.add(`${cleanBase}_${year % 100}`);
  }

  if (candidates.size < limit) {
    const variations = generateVariations(cleanBase, limit - candidates.size, REPLACEMENT_MAP_EN);
    for (const v of variations) {
      candidates.add(v);
      if (candidates.size >= limit) break;
    }
  }

  if (candidates.size < limit) {
    const variations = generateVariations(base, limit - candidates.size, REPLACEMENT_MAP_RU);
    for (const v of variations) {
      candidates.add(v);
      if (candidates.size >= limit) break;
    }
  }

  return Array.from(candidates).slice(0, limit);
}

// Находит первые N свободных username, проверяя их по одному
export async function findAvailableUsernames(
  db: any,
  base: string,
  maxSuggestions: number = 10
): Promise<string[]> {
  const candidates = generateCandidates(base, maxSuggestions * 2); // генерируем больше, чтобы наверняка найти нужное количество
  const available: string[] = [];

  // Поочерёдно проверяем каждого кандидата
  for (const candidate of candidates) {
    if (available.length >= maxSuggestions) break;

    // Пропускаем зарезервированные имена
    if (RESERVED_USERNAMES.includes(candidate)) continue;

    // Проверяем существование в БД
    const exists = db.prepare("SELECT 1 FROM Profile WHERE username = ?").get(candidate);
    if (!exists) {
      available.push(candidate);
    }
  }

  // Если не набрали нужное количество, генерируем дополнительные кандидаты с числами
  if (available.length < maxSuggestions) {
    let counter = 1;
    while (available.length < maxSuggestions && counter < 100) {
      const candidate = `${filterEn(transliterate(base))}${counter}`;
      if (!RESERVED_USERNAMES.includes(candidate)) {
        const exists = db.prepare("SELECT 1 FROM Profile WHERE username = ?").get(candidate);
        if (!exists) available.push(candidate);
      }
      counter++;
    }
  }

  return available.slice(0, maxSuggestions);
}

// Списки для генерации вариантов
const SUFFIXES = [
  '', 'official', 'real', 'profile'
];

const PREFIXES = [
  '', 'the', 'real'
];

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
  's': ['5', '$'],
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
  'S': ['5', '$'],
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