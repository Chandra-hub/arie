import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function durationString(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const secs = Math.round((end - start) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.round(secs / 60)}m`;
}

export const SECTOR_LABELS: Record<string, string> = {
  water: 'Water',
  chemical: 'Chemical',
  manufacturing: 'Manufacturing',
  energy: 'Energy',
  waste: 'Waste',
  transportation: 'Transportation',
  mining: 'Mining',
  general: 'General',
};

export const STATUS_COLORS: Record<string, string> = {
  compliant: 'text-accent border-accent',
  non_compliant: 'text-danger border-danger',
  review_required: 'text-warn border-warn',
  completed: 'text-accent',
  failed: 'text-danger',
  running: 'text-warn',
  queued: 'text-muted',
};
