export const IMPORT_LAST_NAME_PLACEHOLDER = "-";

function normalizeNamePart(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isPlaceholderLastName(value: string | null | undefined) {
  const normalized = normalizeNamePart(value);
  return normalized === "" || normalized === "-" || normalized === "." || normalized === "n/a";
}

export function formatCustomerName(firstName?: string | null, lastName?: string | null) {
  const first = firstName?.trim() ?? "";
  const last = lastName?.trim() ?? "";

  if (!first && !last) return "Unknown";
  if (!first) return isPlaceholderLastName(last) ? "Unknown" : last;
  if (isPlaceholderLastName(last)) return first;
  if (normalizeNamePart(first) === normalizeNamePart(last)) return first;

  return `${first} ${last}`;
}
