import { format as formatDate, isValid, parse } from "date-fns";
import * as xlsx from "xlsx";
import type { CreateIntakeRecord } from "@workspace/api-client-react";
import { z } from "zod";
import { IMPORT_LAST_NAME_PLACEHOLDER } from "@/lib/customer-name";

type SpreadsheetRow = Record<string, unknown>;

type ServiceInference = {
  serviceType: string;
  reason: string;
};

const FIELD_ALIASES = {
  title: ["title"],
  firstName: ["firstName", "first_name", "first name", "firstname"],
  lastName: ["lastName", "last_name", "last name", "lastname"],
  mobileNumber: ["mobileNumber", "mobile_number", "mobile", "phone", "phone_number"],
  email: ["email", "mail"],
  customerType: ["customerType", "customer_type", "custType", "customer type", "cust type"],
  address: ["address", "location"],
  printerMake: ["printerMake", "printer_make", "make", "printer make"],
  printerModel: ["printerModel", "printer_model", "model", "printer model"],
  cartridgeTonerType: [
    "cartridgeTonerType",
    "cartridge_toner_type",
    "cartridge",
    "cartridge type",
    "toner",
  ],
  serviceType: ["serviceType", "service_type", "serviceOpted", "service opted", "service"],
  deviceSerialNumber: [
    "deviceSerialNumber",
    "device_serial_number",
    "serial",
    "serial_number",
    "device serial number",
  ],
  paymentMethod: ["paymentMethod", "payment_method", "payment", "payment mode"],
  notes: ["notes", "note", "remarks", "comments"],
  serviceDate: ["serviceDate", "service_date", "date", "service date"],
  serviceTime: ["serviceTime", "service_time", "time", "service time"],
} as const;

const EMPTY_MARKERS = new Set(["", "-", "na", "n/a", "null", "undefined"]);

const TITLE_MAP: Record<string, string> = {
  mr: "Mr",
  "mr.": "Mr",
  mrs: "Mrs",
  "mrs.": "Mrs",
  ms: "Ms",
  "ms.": "Ms",
  miss: "Miss",
  "miss.": "Miss",
};

const CUSTOMER_TYPE_MAP: Record<string, string> = {
  home: "Home user",
  "home user": "Home user",
  residential: "Home user",
  office: "Office user",
  "office user": "Office user",
  business: "Business user",
  "business user": "Business user",
  company: "Business user",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  creditcard: "Card",
  debitcard: "Card",
};

const SERVICE_TYPE_MAP: Record<string, string> = {
  photocopy: "Photo Copy",
  photocopies: "Photo Copy",
  "photo copy": "Photo Copy",
  xerox: "Photo Copy",
  inkrefill: "Ink Refill",
  "ink refill": "Ink Refill",
  tonerrefill: "Toner Refill",
  "toner refill": "Toner Refill",
  printout: "Printouts",
  printouts: "Printouts",
  printing: "Printouts",
  scan: "Scanning",
  scanning: "Scanning",
  laminate: "Lamination",
  lamination: "Lamination",
  computerrepair: "Laptop/Computer Service",
  laptoprepair: "Laptop/Computer Service",
  "computer/laptop repair": "Laptop/Computer Service",
  "laptop/computer service": "Laptop/Computer Service",
  printerrepair: "Printer Repair",
  "printer repair": "Printer Repair",
};

const DATE_PATTERNS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "M/d/yyyy, h:mm:ss a",
  "M/d/yyyy, h:mm a",
  "M/d/yyyy H:mm:ss",
  "M/d/yyyy H:mm",
  "M/d/yyyy",
  "d/M/yyyy, h:mm:ss a",
  "d/M/yyyy, h:mm a",
  "d/M/yyyy H:mm:ss",
  "d/M/yyyy H:mm",
  "d/M/yyyy",
  "dd-MM-yyyy",
  "MM-dd-yyyy",
] as const;

const emailSchema = z.string().email();

export type ParsedImportRow = {
  rowNumber: number;
  errors: string[];
  record: CreateIntakeRecord | null;
};

export type ParsedWorkbook = {
  fileName: string;
  sheetName: string;
  headers: string[];
  totalRows: number;
  validRows: CreateIntakeRecord[];
  invalidRows: ParsedImportRow[];
  previewRows: ParsedImportRow[];
};

type WorkbookScore = {
  workbook: xlsx.WorkBook;
  score: number;
};

function getWorkbookScore(workbook: xlsx.WorkBook): number {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return -1;

  const matrix = xlsx.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
    raw: false,
  });

  if (matrix.length === 0) return 0;

  const headerWidth = (matrix[0] ?? []).filter((cell) => cell !== null && String(cell).trim() !== "").length;
  const dataRows = Math.max(matrix.length - 1, 0);

  // Prioritize files with clear multi-column headers and actual data rows.
  return dataRows * 100 + headerWidth;
}

function decodeCsvText(fileBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(fileBuffer);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

  // UTF-16 CSVs often include many NUL bytes when read as UTF-8.
  if (utf8.includes("\u0000")) {
    return new TextDecoder("utf-16le", { fatal: false }).decode(bytes);
  }

  return utf8;
}

function readWorkbookWithCsvFallback(fileName: string, fileBuffer: ArrayBuffer): xlsx.WorkBook {
  const baseWorkbook = xlsx.read(fileBuffer, { type: "array", cellDates: true });
  const isCsv = /\.csv$/i.test(fileName);

  if (!isCsv) {
    return baseWorkbook;
  }

  const csvText = decodeCsvText(fileBuffer);
  const delimiterCandidates = [",", ";", "\t", "|"];
  const scoredWorkbooks: WorkbookScore[] = [
    {
      workbook: baseWorkbook,
      score: getWorkbookScore(baseWorkbook),
    },
  ];

  for (const delimiter of delimiterCandidates) {
    try {
      const parsed = xlsx.read(csvText, {
        type: "string",
        cellDates: true,
        raw: false,
        FS: delimiter,
      });

      scoredWorkbooks.push({
        workbook: parsed,
        score: getWorkbookScore(parsed),
      });
    } catch {
      // Ignore parser attempts that fail and continue evaluating other delimiters.
    }
  }

  scoredWorkbooks.sort((a, b) => b.score - a.score);
  return scoredWorkbooks[0].workbook;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (value instanceof Date) return true;
  return !EMPTY_MARKERS.has(String(value).trim().toLowerCase());
}

function buildNormalizedRow(row: SpreadsheetRow): Map<string, unknown> {
  const normalized = new Map<string, unknown>();

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeKey(key);
    const existing = normalized.get(normalizedKey);

    if (!normalized.has(normalizedKey) || (!hasMeaningfulValue(existing) && hasMeaningfulValue(value))) {
      normalized.set(normalizedKey, value);
    }
  }

  return normalized;
}

function getRawValue(row: SpreadsheetRow, aliases: readonly string[]): unknown {
  const normalizedRow = buildNormalizedRow(row);

  for (const alias of aliases) {
    const value = normalizedRow.get(normalizeKey(alias));
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function toRawString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function toOptionalText(value: unknown): string | null {
  const text = toRawString(value);
  if (EMPTY_MARKERS.has(text.toLowerCase())) {
    return null;
  }
  return text;
}

function toDisplayText(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeTitle(value: unknown): string | null {
  const text = toOptionalText(value);
  if (!text) return null;
  return TITLE_MAP[text.toLowerCase()] ?? text.replace(/\.$/, "");
}

function normalizeCustomerType(value: unknown): string | null {
  const text = toOptionalText(value);
  if (!text) return null;

  const normalized = CUSTOMER_TYPE_MAP[text.toLowerCase()];
  return normalized ?? toDisplayText(text);
}

function normalizePaymentMethod(value: unknown): string | null {
  const text = toOptionalText(value);
  if (!text) return null;

  const compact = normalizeKey(text);
  return PAYMENT_METHOD_MAP[compact] ?? PAYMENT_METHOD_MAP[text.toLowerCase()] ?? toDisplayText(text);
}

function normalizeServiceType(value: unknown): string | null {
  const text = toOptionalText(value);
  if (!text) return null;

  const compact = normalizeKey(text);
  return SERVICE_TYPE_MAP[compact] ?? SERVICE_TYPE_MAP[text.toLowerCase()] ?? toDisplayText(text);
}

function looksLikeComputerSerial(value: string | null): boolean {
  if (!value) return false;

  const compact = value.replace(/[^A-Za-z0-9]/g, "");
  if (compact.length < 6 || compact.length > 32) return false;

  const hasLetter = /[A-Za-z]/.test(compact);
  const hasDigit = /\d/.test(compact);

  return hasLetter && hasDigit;
}

function inferServiceType(row: SpreadsheetRow): ServiceInference {
  const cartridge = toOptionalText(getRawValue(row, FIELD_ALIASES.cartridgeTonerType))?.toLowerCase();
  const model = toOptionalText(getRawValue(row, FIELD_ALIASES.printerModel));
  const serial = toOptionalText(getRawValue(row, FIELD_ALIASES.deviceSerialNumber));

  if (cartridge === "toner") {
    return {
      serviceType: "Toner Refill",
      reason: `cartridge="${toOptionalText(getRawValue(row, FIELD_ALIASES.cartridgeTonerType))}"`,
    };
  }

  if (cartridge === "ink") {
    return {
      serviceType: "Ink Refill",
      reason: `cartridge="${toOptionalText(getRawValue(row, FIELD_ALIASES.cartridgeTonerType))}"`,
    };
  }

  if (model && !cartridge) {
    return {
      serviceType: "Printer Service",
      reason: `model="${model}" with empty cartridge`,
    };
  }

  if (looksLikeComputerSerial(serial)) {
    return {
      serviceType: "Laptop/Computer Service",
      reason: `serial="${serial}"`,
    };
  }

  return {
    serviceType: "General Service",
    reason: "fallback",
  };
}

function appendInferenceNote(
  notes: string | null,
  inference: ServiceInference | null,
): string | null {
  if (!inference) return notes;

  const detail = `Service inferred as "${inference.serviceType}" from ${inference.reason}.`;
  return notes ? `${notes}\n[Import Note] ${detail}` : `[Import Note] ${detail}`;
}

function appendMissingLastNameNote(notes: string | null): string | null {
  const detail = "[Import Note] Placeholder last name used because source data had only a single name value.";

  if (!notes) return detail;
  if (notes.includes(detail)) return notes;

  return `${notes}\n${detail}`;
}

function normalizeMobileNumber(value: unknown): string | null {
  const text = toOptionalText(value);
  if (!text) return null;

  const digits = text.replace(/\D+/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-10);
}

function normalizeEmail(value: unknown): string | null {
  const text = toOptionalText(value);
  if (!text) return null;

  return emailSchema.safeParse(text).success ? text : null;
}

function formatDateValue(date: Date): string {
  return formatDate(date, "yyyy-MM-dd");
}

function formatTimeValue(date: Date): string {
  return formatDate(date, "HH:mm");
}

function parseExcelDateCode(value: number): Date | null {
  const parsed = xlsx.SSF.parse_date_code(value);
  if (!parsed) return null;

  return new Date(
    parsed.y,
    (parsed.m || 1) - 1,
    parsed.d || 1,
    parsed.H || 0,
    parsed.M || 0,
    Math.floor(parsed.S || 0),
  );
}

function parseDateFromString(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  for (const pattern of DATE_PATTERNS) {
    const parsed = parse(trimmed, pattern, new Date());
    if (isValid(parsed)) {
      return parsed;
    }
  }

  const nativeDate = new Date(trimmed);
  if (isValid(nativeDate)) {
    return nativeDate;
  }

  return null;
}

function normalizeDateOnly(value: unknown): string | null {
  if (value instanceof Date && isValid(value)) {
    return formatDateValue(value);
  }

  if (typeof value === "number") {
    const parsed = parseExcelDateCode(value);
    return parsed ? formatDateValue(parsed) : null;
  }

  const text = toOptionalText(value);
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  const parsed = parseDateFromString(text);
  return parsed ? formatDateValue(parsed) : null;
}

function normalizeTimeOnly(value: unknown): string | null {
  if (value instanceof Date && isValid(value)) {
    return formatTimeValue(value);
  }

  if (typeof value === "number") {
    const parsed = parseExcelDateCode(value);
    return parsed ? formatTimeValue(parsed) : null;
  }

  const text = toOptionalText(value);
  if (!text) return null;

  const timeMatch = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M)?$/i);
  if (!timeMatch) {
    const parsed = parseDateFromString(text);
    return parsed ? formatTimeValue(parsed) : null;
  }

  let hours = Number(timeMatch[1]);
  const minutes = timeMatch[2];
  const meridiem = timeMatch[3]?.toUpperCase();

  if (meridiem === "PM" && hours < 12) {
    hours += 12;
  } else if (meridiem === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function hasExplicitTimeComponent(value: unknown): boolean {
  if (value instanceof Date) {
    return value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
  }

  if (typeof value === "number") {
    return !Number.isInteger(value);
  }

  const text = toOptionalText(value);
  if (!text) return false;

  return /:\d{2}/.test(text) || /\b(am|pm)\b/i.test(text);
}

function getDateTimeParts(row: SpreadsheetRow): { serviceDate: string | null; serviceTime: string | null } {
  const explicitDate = getRawValue(row, FIELD_ALIASES.serviceDate);
  const explicitTime = getRawValue(row, FIELD_ALIASES.serviceTime);

  const normalizedDate = normalizeDateOnly(explicitDate);
  const normalizedTime = normalizeTimeOnly(explicitTime);

  if (normalizedDate && normalizedTime) {
    return { serviceDate: normalizedDate, serviceTime: normalizedTime };
  }

  const combined = normalizeDateOnly(explicitDate);
  if (combined && normalizedTime) {
    return { serviceDate: combined, serviceTime: normalizedTime };
  }

  const combinedText = toOptionalText(explicitDate);
  if (combinedText && hasExplicitTimeComponent(explicitDate)) {
    const parsed = parseDateFromString(combinedText);
    if (parsed) {
      return {
        serviceDate: formatDateValue(parsed),
        serviceTime: normalizedTime ?? formatTimeValue(parsed),
      };
    }
  }

  return { serviceDate: normalizedDate, serviceTime: normalizedTime };
}

function splitNameFallback(firstName: string | null, lastName: string | null) {
  if (!firstName || lastName) {
    return { firstName, lastName };
  }

  const parts = firstName.split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    return { firstName, lastName };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function parseImportRow(row: SpreadsheetRow, rowNumber: number): ParsedImportRow {
  const errors: string[] = [];

  let firstName = toOptionalText(getRawValue(row, FIELD_ALIASES.firstName));
  let lastName = toOptionalText(getRawValue(row, FIELD_ALIASES.lastName));
  const mobileNumber = normalizeMobileNumber(getRawValue(row, FIELD_ALIASES.mobileNumber));
  let serviceType = normalizeServiceType(getRawValue(row, FIELD_ALIASES.serviceType));
  const { serviceDate, serviceTime } = getDateTimeParts(row);
  const inferredService = serviceType ? null : inferServiceType(row);
  serviceType = serviceType ?? inferredService?.serviceType ?? null;

  ({ firstName, lastName } = splitNameFallback(firstName, lastName));

  const missingLastName = !lastName;
  const notes = appendInferenceNote(
    toOptionalText(getRawValue(row, FIELD_ALIASES.notes)),
    inferredService,
  );

  if (!firstName) errors.push("Missing first name");
  if (!mobileNumber) errors.push("Missing or invalid mobile number");
  if (!serviceType) errors.push("Missing service type");
  if (!serviceDate) errors.push("Missing or invalid service date");
  if (!serviceTime) errors.push("Missing or invalid service time");

  const deviceSerialNumber = toOptionalText(
    getRawValue(row, FIELD_ALIASES.deviceSerialNumber),
  );

  if (
    (
      serviceType === "Laptop/Computer Service" ||
      serviceType === "Computer/Laptop Repair" ||
      serviceType === "Printer Service"
    ) &&
    !deviceSerialNumber
  ) {
    errors.push("Device serial number is required for Laptop/Computer Service and Printer Service");
  }

  if (errors.length > 0) {
    return { rowNumber, errors, record: null };
  }

  return {
    rowNumber,
    errors,
    record: {
      title: normalizeTitle(getRawValue(row, FIELD_ALIASES.title)),
      firstName: firstName!,
      lastName: lastName ?? IMPORT_LAST_NAME_PLACEHOLDER,
      mobileNumber: mobileNumber!,
      email: normalizeEmail(getRawValue(row, FIELD_ALIASES.email)),
      customerType: normalizeCustomerType(getRawValue(row, FIELD_ALIASES.customerType)),
      address: toOptionalText(getRawValue(row, FIELD_ALIASES.address)),
      printerMake: toOptionalText(getRawValue(row, FIELD_ALIASES.printerMake)),
      printerModel: toOptionalText(getRawValue(row, FIELD_ALIASES.printerModel)),
      cartridgeTonerType: toOptionalText(
        getRawValue(row, FIELD_ALIASES.cartridgeTonerType),
      ),
      serviceType: serviceType!,
      deviceSerialNumber,
      paymentMethod: normalizePaymentMethod(
        getRawValue(row, FIELD_ALIASES.paymentMethod),
      ),
      notes: missingLastName ? appendMissingLastNameNote(notes) : notes,
      serviceDate: serviceDate!,
      serviceTime: serviceTime!,
    },
  };
}

export function parseWorkbookFile(fileName: string, fileBuffer: ArrayBuffer): ParsedWorkbook {
  const workbook = readWorkbookWithCsvFallback(fileName, fileBuffer);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("The workbook does not contain any sheets.");
  }

  const rows = xlsx.utils.sheet_to_json<SpreadsheetRow>(sheet, {
    defval: null,
    raw: false,
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error("The selected sheet does not contain any data rows.");
  }

  const parsedRows = rows.map((row, index) => parseImportRow(row, index + 2));

  return {
    fileName,
    sheetName,
    headers: Object.keys(rows[0] ?? {}),
    totalRows: rows.length,
    validRows: parsedRows.flatMap((row) => (row.record ? [row.record] : [])),
    invalidRows: parsedRows.filter((row) => !row.record),
    previewRows: parsedRows.slice(0, 12),
  };
}
