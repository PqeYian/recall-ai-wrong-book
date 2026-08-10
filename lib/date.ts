export function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDays(base: Date, days: number) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

export function daysFromNow(days: number) {
  return addDays(new Date(), days).toISOString();
}

export function startOfWeek(base = new Date()) {
  const date = new Date(base);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function formatShortDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function dueLabel(iso: string) {
  const today = todayISO();
  const date = toISODate(new Date(iso));
  if (date === today) return "今天";
  const diff = Math.round(
    (new Date(date).getTime() - new Date(today).getTime()) / 86400000
  );
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  if (diff > 1 && diff <= 7) return `${diff} 天后`;
  if (diff < -1 && diff >= -7) return `${Math.abs(diff)} 天前`;
  return formatDate(iso);
}

export function isDueOn(iso: string, dateISO: string) {
  return toISODate(new Date(iso)) === dateISO;
}
