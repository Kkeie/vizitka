// Форматирование российского номера телефона
export function formatPhoneNumber(value: string): string {
  // Удаляем все нецифровые символы
  const cleaned = value.replace(/\D/g, '');
  
  // Если номер начинается с 8, заменяем на 7
  const normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
  
  // Форматируем в формат +7 (999) 123-45-67
  if (normalized.length === 0) return '';
  if (normalized.length <= 1) return `+${normalized}`;
  if (normalized.length <= 4) return `+${normalized.slice(0, 1)} (${normalized.slice(1)}`;
  if (normalized.length <= 7) return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4)}`;
  if (normalized.length <= 9) return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7)}`;
  return `+${normalized.slice(0, 1)} (${normalized.slice(1, 4)}) ${normalized.slice(4, 7)}-${normalized.slice(7, 9)}-${normalized.slice(9, 11)}`;
}

// Валидация российского номера телефона
export function validatePhoneNumber(value: string): boolean {
  const cleaned = value.replace(/\D/g, '');
  const normalized = cleaned.startsWith('8') ? '7' + cleaned.slice(1) : cleaned;
  return normalized.length === 11 && normalized.startsWith('7');
}


