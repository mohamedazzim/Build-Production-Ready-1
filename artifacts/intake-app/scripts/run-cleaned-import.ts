import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as xlsx from "xlsx";
import { parseWorkbookFile } from "../src/lib/intake-import";

const inputFile = process.env.IMPORT_FILE;
const rejectedOutput = process.env.REJECTED_OUTPUT;
const importBaseUrl = process.env.IMPORT_BASE_URL;
const batchSize = Number(process.env.IMPORT_BATCH_SIZE ?? "100");

if (!inputFile) {
  throw new Error("IMPORT_FILE is required");
}

if (!rejectedOutput) {
  throw new Error("REJECTED_OUTPUT is required");
}

type CreateIntakeRecord = NonNullable<
  ReturnType<typeof parseWorkbookFile>["validRows"][number]
>;

function deriveMissingFields(errors: string[]): string[] {
  const fields = new Set<string>();

  for (const error of errors) {
    const normalized = error.toLowerCase();

    if (normalized.includes("first name")) fields.add("firstName");
    if (normalized.includes("last name")) fields.add("lastName");
    if (normalized.includes("mobile")) fields.add("mobileNumber");
    if (normalized.includes("service type")) fields.add("serviceType");
    if (normalized.includes("service date")) fields.add("serviceDate");
    if (normalized.includes("service time")) fields.add("serviceTime");
    if (normalized.includes("device serial number")) fields.add("deviceSerialNumber");
  }

  return [...fields];
}

async function importBatch(records: CreateIntakeRecord[]) {
  const response = await fetch(`${importBaseUrl}/api/records/import`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.details || payload?.error || `HTTP ${response.status}`);
  }

  return payload as { imported: number };
}

async function main() {
  const buffer = readFileSync(inputFile);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );

  const parsed = parseWorkbookFile(inputFile, arrayBuffer);

  const rejectedRows = parsed.invalidRows.map((row) => ({
    rowNumber: row.rowNumber,
    missingFields: deriveMissingFields(row.errors).join(", "),
    reasonRejected: row.errors.join(" | "),
  }));

  mkdirSync(path.dirname(rejectedOutput), { recursive: true });
  const ws = xlsx.utils.json_to_sheet(rejectedRows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "RejectedRows");
  xlsx.writeFile(wb, rejectedOutput);

  let imported = 0;

  if (importBaseUrl) {
    for (let index = 0; index < parsed.validRows.length; index += batchSize) {
      const batch = parsed.validRows.slice(index, index + batchSize);
      const result = await importBatch(batch);
      imported += result.imported;
    }
  }

  console.log(
    JSON.stringify(
      {
        inputFile,
        rejectedOutput,
        totalRows: parsed.totalRows,
        validRows: parsed.validRows.length,
        invalidRows: parsed.invalidRows.length,
        importedRows: imported,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
