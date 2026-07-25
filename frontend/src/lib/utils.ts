import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '--';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  } catch {
    return dateStr;
  }
}

export function getDaysUntil(dateStr: string): number {
  if (!dateStr) return 999;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - now.getTime()) / 86400000);
  } catch {
    return 999;
  }
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: 'badge-success',
    active: 'badge-info',
    in_progress: 'badge-info',
    pending: 'badge-neutral',
    waiting: 'badge-warning',
    blocked: 'badge-error',
    on_hold: 'badge-warning',
    cancelled: 'badge-neutral',
    planning: 'badge-info',
  };
  return colors[status] || 'badge-neutral';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'badge-error',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge-neutral',
  };
  return colors[priority] || 'badge-neutral';
}

export function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    critical: 'badge-error',
    high: 'badge-warning',
    medium: 'badge-info',
    low: 'badge-success',
  };
  return colors[risk] || 'badge-neutral';
}

export function getCategoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    property_search: 'Property Search',
    moving: 'Moving',
    utilities: 'Utilities',
    documentation: 'Documentation',
    post_move: 'Post Move',
  };
  return labels[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + '...';
}
