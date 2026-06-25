export function toDateOnly(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(dateOnly: string, days: number): string {
  const date = parseDateOnly(dateOnly);
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function compareDateOnly(a: string, b: string): number {
  return parseDateOnly(a).getTime() - parseDateOnly(b).getTime();
}

export function isDateInRange(value: string, start: string, end: string): boolean {
  return compareDateOnly(value, start) >= 0 && compareDateOnly(value, end) <= 0;
}

export function formatDateTimeForTitle(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
