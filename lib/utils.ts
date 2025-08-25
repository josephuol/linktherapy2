import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Commission per session for admin revenue and payments calculations
export const ADMIN_COMMISSION_PER_SESSION = 6;
