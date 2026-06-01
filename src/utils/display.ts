import { formatDistanceToNow } from "date-fns";

export function letters(name: string) {
  const firstWord = name.split(" ")[0] ?? "";
  return firstWord.charAt(0);
}

export function capitalizeFirst(name: string) {
  return `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`;
}

export function formatTimeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
