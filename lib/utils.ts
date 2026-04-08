import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateInvoiceNumber(prefix = 'INV'): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export function generatePONumber(): string {
  return generateInvoiceNumber('PO');
}

export function generateVendorCode(): string {
  return `VND-${Date.now().toString().slice(-6)}`;
}

export function generateEmployeeId(): string {
  return `EMP-${Date.now().toString().slice(-6)}`;
}

export function formatDate(date: Date | string, locale = 'en-SA'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string, locale = 'en-SA'): string {
  return new Date(date).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getDaysUntilExpiry(expiryDate: Date | string): number {
  const expiry = new Date(expiryDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getExpiryColor(daysLeft: number): string {
  if (daysLeft < 0) return 'text-red-500';
  if (daysLeft <= 7) return 'text-red-400';
  if (daysLeft <= 30) return 'text-yellow-400';
  return 'text-emerald-400';
}

export function getExpiryBadgeClass(daysLeft: number): string {
  if (daysLeft < 0) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (daysLeft <= 7) return 'bg-red-400/20 text-red-300 border-red-400/30';
  if (daysLeft <= 30) return 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30';
  return 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30';
}

export function safeNumber(val: unknown, fallback = 0): number {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
}

export function truncate(str: string, maxLen = 30): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
