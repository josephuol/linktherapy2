import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Commission per session for admin revenue and payments calculations
export const ADMIN_COMMISSION_PER_SESSION = 6;

// Anonymous session id for correlating actions before login
export function getOrCreateAnonSessionId(): string {
  try {
    if (typeof window === "undefined") return "server";
    const key = "lt_anon_session_id";
    let sid = window.localStorage.getItem(key);
    if (!sid) {
      sid = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
