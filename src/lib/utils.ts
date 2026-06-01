import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 0): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// https://medium.com/with-orus/the-5-commandments-of-clean-error-handling-in-typescript-93a9cbdf1af5

export function ensureError(value: unknown): Error {
  if (value instanceof Error) return value;

  let stringified = "[Unable to stringify the thrown value]";
  try {
    stringified = JSON.stringify(value);
  } catch {}

  const error = new Error(
    `This value was thrown as is, not through an Error: ${stringified}`,
  );
  return error;
}

export function displayNumber(num?: number): string {
  if (num === undefined) return "";
  num = Number(num);
  if (isNaN(num)) return "";
  return ("" + Math.round(num * 100) / 100).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ",",
  );
}

export function formatDecimal(num: number, decimals = 2): number {
  return Number(num.toFixed(decimals));
}

export function pluralize(count: number, singular: string, plural: string) {
  const value = count === 1 ? singular : plural;
  return ` ${value} `;
}

export const formatEmail = (email: string) => {
  return email.toLowerCase().trim();
};
