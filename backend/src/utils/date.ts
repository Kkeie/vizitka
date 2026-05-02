export function getEkaterinburgViewDate(): string {
  const now = new Date();
  // Екатеринбург = UTC+5 (YEKT, без перевода на летнее)
  const local = new Date(now.getTime() + 5 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const hour = local.getUTCHours();
  // День начинается в 3:00
  if (hour < 3) {
    // Относим к предыдущему дню
    const prevDay = new Date(Date.UTC(year, month, day - 1));
    return prevDay.toISOString().slice(0, 10);
  }
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}