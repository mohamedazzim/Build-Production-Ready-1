export const SERVICE_STATUSES = ["Pending", "Completed"] as const;

export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export function normalizeServiceStatus(value?: string | null): ServiceStatus {
  return value === "Completed" ? "Completed" : "Pending";
}

export function serviceStatusBadgeStyle(status?: string | null) {
  return normalizeServiceStatus(status) === "Completed"
    ? { backgroundColor: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC" }
    : { backgroundColor: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" };
}