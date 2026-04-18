import { useRef, useState, type ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { formatCustomerName } from "@/lib/customer-name";
import { formatServiceTime } from "@/lib/time";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getGetAnalyticsQueryKey, getGetRecordsQueryKey, type CreateIntakeRecord } from "@workspace/api-client-react";
import { parseWorkbookFile, type ParsedWorkbook } from "@/lib/intake-import";

const IMPORT_BATCH_SIZE = 100;
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000" : "");

function resolveApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

type ImportBatchResponse = {
  imported: number;
};

async function importRecordBatch(records: CreateIntakeRecord[]): Promise<ImportBatchResponse> {
  const response = await fetch(resolveApiUrl("/api/records/import"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ records }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.details ||
      payload?.error ||
      `Import failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload as ImportBatchResponse;
}

export default function ImportRecordsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbook | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setParsedWorkbook(null);
    setImportedCount(0);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbookFile(file.name, buffer);
      setParsedWorkbook(parsed);

      toast({
        title: "Workbook parsed",
        description: `${parsed.validRows.length} valid rows and ${parsed.invalidRows.length} invalid rows found.`,
      });
    } catch (error) {
      toast({
        title: "Unable to read workbook",
        description: error instanceof Error ? error.message : "Please check the file format.",
        variant: "destructive",
      });
    } finally {
      setIsParsing(false);
      event.target.value = "";
    }
  };

  const handleImport = async () => {
    if (!parsedWorkbook || parsedWorkbook.validRows.length === 0) {
      return;
    }

    setIsImporting(true);
    setImportedCount(0);

    try {
      for (let index = 0; index < parsedWorkbook.validRows.length; index += IMPORT_BATCH_SIZE) {
        const batch = parsedWorkbook.validRows.slice(index, index + IMPORT_BATCH_SIZE);
        const result = await importRecordBatch(batch);
        setImportedCount((count) => count + result.imported);
      }

      queryClient.invalidateQueries({ queryKey: getGetRecordsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });

      toast({
        title: "Import complete",
        description: `${parsedWorkbook.validRows.length} records imported successfully.`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Something went wrong during import.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Import Spreadsheet</h2>
          <p className="text-muted-foreground mt-1">
            Upload Excel or CSV files using either the legacy workbook headers or the cleaned snake_case headers.
          </p>
        </div>

        <Card className="shadow-md rounded-xl border-0" style={{ boxShadow: "0 2px 16px rgba(11,76,194,0.10)" }}>
          <CardHeader style={{ backgroundColor: "#FFF9E0" }} className="border-b">
            <CardTitle>Workbook Upload</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                onClick={handlePickFile}
                disabled={isParsing || isImporting}
                className="w-full font-semibold text-black sm:w-auto"
                style={{ backgroundColor: "#FFD400", borderColor: "#FFD400" }}
              >
                {isParsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Choose File (.xlsx, .xls, .csv)
              </Button>

              <Button
                onClick={handleImport}
                disabled={!parsedWorkbook || parsedWorkbook.validRows.length === 0 || isImporting}
                className="w-full font-semibold sm:w-auto"
                style={{ backgroundColor: "#0B4CC2" }}
              >
                {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                Import Valid Rows
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              The importer now supports both formats:
              <span className="font-medium text-foreground"> `firstName/mobile/serviceOpted/date` </span>
              and
              <span className="font-medium text-foreground"> `first_name/mobile_number/service_type/service_date/service_time`</span>.
            </div>

            {parsedWorkbook && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="rounded-xl border" style={{ borderColor: "#FFD400" }}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Workbook</div>
                    <div className="font-semibold break-words">{parsedWorkbook.fileName}</div>
                    <div className="text-xs text-muted-foreground mt-1">Sheet: {parsedWorkbook.sheetName}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border" style={{ borderColor: "#FFD400" }}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Rows</div>
                    <div className="text-3xl font-bold">{parsedWorkbook.totalRows}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border" style={{ borderColor: "#FFD400" }}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Valid</div>
                    <div className="text-3xl font-bold text-green-700">{parsedWorkbook.validRows.length}</div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border" style={{ borderColor: "#FFD400" }}>
                  <CardContent className="pt-6">
                    <div className="text-sm text-muted-foreground">Invalid</div>
                    <div className="text-3xl font-bold text-red-600">{parsedWorkbook.invalidRows.length}</div>
                    {isImporting && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Imported {importedCount} / {parsedWorkbook.validRows.length}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>

        {parsedWorkbook && (
          <Card className="shadow-md rounded-xl overflow-hidden border-0" style={{ boxShadow: "0 2px 16px rgba(11,76,194,0.10)" }}>
            <CardHeader className="border-b" style={{ backgroundColor: "#FFF9E0" }}>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="md:hidden">
                <div className="space-y-3 p-4">
                  {parsedWorkbook.previewRows.map((row) => (
                    <Card key={row.rowNumber} className="rounded-xl border shadow-sm">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-medium">Row {row.rowNumber}</div>
                          {row.record ? (
                            <Badge className="bg-green-600 text-white hover:bg-green-600">
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Invalid
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="font-semibold">
                            {row.record ? formatCustomerName(row.record.firstName, row.record.lastName) : "Validation Error"}
                          </div>
                          <div className="text-muted-foreground">{row.record?.mobileNumber ?? "-"}</div>
                          <div className="text-muted-foreground">{row.record?.serviceType ?? "-"}</div>
                          <div className="text-muted-foreground">
                            {row.record ? `${row.record.serviceDate} ${formatServiceTime(row.record.serviceTime)}` : "-"}
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground break-words">
                          {row.record?.notes || row.errors.join(", ")}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: "#FFD400" }} className="hover:bg-[#FFD400]">
                      <TableHead className="font-bold text-black">Row</TableHead>
                      <TableHead className="font-bold text-black">Status</TableHead>
                      <TableHead className="font-bold text-black">Customer</TableHead>
                      <TableHead className="font-bold text-black">Mobile</TableHead>
                      <TableHead className="font-bold text-black">Service</TableHead>
                      <TableHead className="font-bold text-black">Date / Time</TableHead>
                      <TableHead className="font-bold text-black">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedWorkbook.previewRows.map((row) => (
                      <TableRow key={row.rowNumber}>
                        <TableCell className="font-medium">{row.rowNumber}</TableCell>
                        <TableCell>
                          {row.record ? (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.record ? (
                            <div className="font-semibold">
                              {formatCustomerName(row.record.firstName, row.record.lastName)}
                            </div>
                          ) : (
                            <div className="text-sm text-destructive">{row.errors.join(", ")}</div>
                          )}
                        </TableCell>
                        <TableCell>{row.record?.mobileNumber ?? "-"}</TableCell>
                        <TableCell>{row.record?.serviceType ?? "-"}</TableCell>
                        <TableCell>
                          {row.record ? `${row.record.serviceDate} ${formatServiceTime(row.record.serviceTime)}` : "-"}
                        </TableCell>
                        <TableCell className="max-w-[320px]">
                          <div className="truncate text-sm text-muted-foreground">
                            {row.record?.notes || row.errors.join(", ")}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
