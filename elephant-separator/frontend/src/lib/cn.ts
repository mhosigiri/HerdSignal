import { clsx, type ClassValue } from "clsx";

/** Merge Tailwind class names, resolving conflicts via clsx. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
