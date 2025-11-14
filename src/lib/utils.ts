import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name?: string): string {
  if (!name) return 'U';
  const names = name.split(' ');
  let initials = names[0]?.substring(0, 1) || '';
  if (names.length > 1) {
    initials += names[names.length - 1]?.substring(0, 1) || '';
  } else if (name.length > 1) {
    initials = name.substring(0, 2);
  }
  return initials.toUpperCase();
}

export function getApiPath(path: string) {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    return `${basePath}${path}`;
}