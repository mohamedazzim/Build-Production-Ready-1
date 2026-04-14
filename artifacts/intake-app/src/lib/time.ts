import { format, isValid, parse } from "date-fns";

const TIME_PATTERNS = ["HH:mm:ss", "H:mm:ss", "HH:mm", "H:mm", "hh:mm:ss a", "h:mm:ss a", "hh:mm a", "h:mm a"];

export function formatServiceTime(value?: string | null): string {
  if (!value) return "-";

  const normalized = value.trim();
  if (!normalized) return "-";

  for (const pattern of TIME_PATTERNS) {
    const parsed = parse(normalized, pattern, new Date());
    if (isValid(parsed)) {
      return format(parsed, "hh:mm a");
    }
  }

  return normalized;
}