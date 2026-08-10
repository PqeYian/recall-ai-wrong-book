import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid() {
  return crypto.randomUUID();
}

export function normalizeText(text: string) {
  return text.replace(/\s+/g, "").toLowerCase();
}

export function similarity(a: string, b: string) {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const short = x.length < y.length ? x : y;
  const long = x.length < y.length ? y : x;
  if (short.length < 4) return 0;
  let hit = 0;
  const step = Math.max(1, Math.floor(short.length / 8));
  for (let i = 0; i < short.length; i += step) {
    const token = short.slice(i, i + Math.max(4, Math.floor(short.length / 8)));
    if (long.includes(token)) hit += 1;
  }
  return Math.min(1, hit / Math.max(1, Math.ceil(short.length / step)));
}

export function clampScore(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}
