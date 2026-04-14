import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { 
  useGetRecords, 
  useGetAnalytics, 
  useDeleteRecord,
  getGetRecordsQueryKey,
  getGetAnalyticsQueryKey
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatCustomerName } from "@/lib/customer-name";
import { exportToCSV, exportToExcel, exportToJSON } from "@/lib/export";
import { formatServiceTime } from "@/lib/time";
import { SERVICE_STATUSES, normalizeServiceStatus, serviceStatusBadgeStyle } from "@/lib/status";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { 
  Search, 
  Download, 
  FileText, 
  FileSpreadsheet, 
  FileJson, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  Calendar,
  Users,
  Activity,
  ArrowUpDown
} from "lucide-react";

const PAGE_SIZE = 100;

export default function DashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Completed">("all");
  const [sortBy, setSortBy] = useState<"latest" | "oldest" | "serviceDate">("latest");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [browseLimit, setBrowseLimit] = useState(PAGE_SIZE);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const searchTerm = debouncedSearch.trim();
  const isSearching = searchTerm.length > 0;

  const { data: analytics, isLoading: analyticsLoading } = useGetAnalytics({
    query: { queryKey: getGetAnalyticsQueryKey() }
  });

  const baseRecordParams = {
    status: statusFilter === "all" ? undefined : statusFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sortBy
  };

  const browseParams = {
    ...baseRecordParams,
    limit: browseLimit,
    offset: 0,
  };

  const searchParams = {
    ...baseRecordParams,
    search: searchTerm || undefined,
  };

  const { data: browseRecords, isLoading: browseRecordsLoading, isFetching: browseRecordsFetching } = useGetRecords(browseParams, {
    query: {
      queryKey: getGetRecordsQueryKey(browseParams),
      enabled: !isSearching,
      placeholderData: (previousData) => previousData,
    }
  });

  const { data: searchRecords, isLoading: searchRecordsLoading, isFetching: searchRecordsFetching } = useGetRecords(searchParams, {
    query: {
      queryKey: getGetRecordsQueryKey(searchParams),
      enabled: isSearching,
      placeholderData: (previousData) => previousData,
    }
  });

  const records = isSearching ? searchRecords : browseRecords;
  const recordsList = Array.isArray(records) ? records : [];
  const visibleRecordsList = isSearching ? recordsList : recordsList.slice(0, browseLimit);
  const recordsLoading = isSearching ? searchRecordsLoading : browseRecordsLoading;
  const recordsFetching = isSearching ? searchRecordsFetching : browseRecordsFetching;
  const hasMoreRecords = !isSearching && recordsList.length >= browseLimit;

  useEffect(() => {
    setBrowseLimit(PAGE_SIZE);
  }, [dateFrom, dateTo, statusFilter, sortBy, isSearching]);

  const deleteRecord = useDeleteRecord({
    mutation: {
      onSuccess: () => {
        toast({ title: "Record deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getGetRecordsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAnalyticsQueryKey() });
        setRecordToDelete(null);
      },
      onError: () => {
        toast({ title: "Failed to delete record", variant: "destructive" });
        setRecordToDelete(null);
      }
    }
  });

  const handleDelete = () => {
    if (recordToDelete) {
      deleteRecord.mutate({ id: recordToDelete });
    }
  };

  const handleExport = (type: 'csv' | 'excel' | 'json') => {
    if (visibleRecordsList.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const exportData = visibleRecordsList.map(r => ({
      ID: r.id,
      Date: r.serviceDate,
      Time: formatServiceTime(r.serviceTime),
      Customer: formatCustomerName(r.firstName, r.lastName),
      Mobile: r.mobileNumber,
      Service: r.serviceType,
      Make: r.printerMake || '-',
      Model: r.printerModel || '-',
      Payment: r.paymentMethod || '-'
    }));

    const filename = `JanusImprints_Records_${format(new Date(), "yyyy-MM-dd")}`;

    if (type === 'csv') exportToCSV(exportData, filename);
    if (type === 'excel') exportToExcel(exportData, filename);
    if (type === 'json') exportToJSON(exportData, filename);
  };

  return (
    <Layout>
      <div className="flex flex-col gap-8">
        
        {/* Analytics Overview */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today */}
            <Card
              className="rounded-xl border-0 shadow-md overflow-hidden"
              style={{ borderTop: "4px solid #FFD400", boxShadow: "0 2px 12px rgba(11,76,194,0.09)" }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Today's Entries</CardTitle>
                <Calendar className="w-4 h-4" style={{ color: "#0B4CC2" }} />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? <Skeleton className="h-8 w-16" /> : (
                  <div className="text-3xl font-bold" style={{ color: "#0B4CC2" }}>{analytics?.todayCount || 0}</div>
                )}
              </CardContent>
            </Card>
            
            {/* This Week */}
            <Card
              className="rounded-xl border-0 shadow-md overflow-hidden"
              style={{ borderTop: "4px solid #FFD400", boxShadow: "0 2px 12px rgba(11,76,194,0.09)" }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? <Skeleton className="h-8 w-16" /> : (
                  <div className="text-3xl font-bold">{analytics?.weekCount || 0}</div>
                )}
              </CardContent>
            </Card>
            
            {/* This Month */}
            <Card
              className="rounded-xl border-0 shadow-md overflow-hidden"
              style={{ borderTop: "4px solid #FFD400", boxShadow: "0 2px 12px rgba(11,76,194,0.09)" }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? <Skeleton className="h-8 w-16" /> : (
                  <div className="text-3xl font-bold">{analytics?.monthCount || 0}</div>
                )}
              </CardContent>
            </Card>
            
            {/* Top Service */}
            <Card
              className="rounded-xl border-0 shadow-md overflow-hidden"
              style={{ borderTop: "4px solid #FFD400", boxShadow: "0 2px 12px rgba(11,76,194,0.09)" }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Service</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {analyticsLoading ? <Skeleton className="h-8 w-full" /> : (
                  <div className="text-xl font-semibold truncate" title={analytics?.mostCommonService || "None"}>
                    {analytics?.mostCommonService || "None"}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Data Table Section */}
        <Card className="overflow-hidden rounded-xl border border-black/5 shadow-md" style={{ boxShadow: "0 6px 16px rgba(11,76,194,0.08)" }}>
          <CardHeader className="border-b border-black/5 px-4 py-3 sm:px-6" style={{ backgroundColor: "#FFF9E0" }}>
            <div className="flex flex-col items-stretch gap-2 xl:flex-row xl:items-center xl:justify-between">
              <CardTitle className="text-2xl font-bold tracking-tight">Intake Records</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end xl:flex-nowrap">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name, mobile..."
                    className="w-full bg-background pl-8 sm:w-[190px]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-background sm:w-[148px]"
                  title="Date From"
                />
                <span className="self-center text-sm text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-background sm:w-[148px]"
                  title="Date To"
                />
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "Pending" | "Completed") }>
                  <SelectTrigger className="w-full bg-background sm:w-[148px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {SERVICE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setSortBy(prev => prev === "latest" ? "oldest" : "latest")}
                  title="Toggle Sort Order"
                  className="shrink-0 self-start sm:self-auto"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="w-full font-semibold text-black sm:ml-auto sm:w-auto"
                      style={{ backgroundColor: "#FFD400", borderColor: "#FFD400" }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" /> Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      <FileText className="w-4 h-4 mr-2 text-blue-600" /> CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('json')}>
                      <FileJson className="w-4 h-4 mr-2 text-orange-600" /> JSON
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="md:hidden">
                  {recordsLoading ? (
                <div className="space-y-4 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="rounded-xl border shadow-sm">
                      <CardContent className="space-y-3 p-4">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : visibleRecordsList.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No records found matching your filters.
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  {visibleRecordsList.map((record) => (
                    <Card key={record.id} className="overflow-hidden rounded-xl border shadow-sm">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">#{record.id}</div>
                              <div className="text-xs leading-tight text-muted-foreground">
                              {format(new Date(record.serviceDate), "dd MMM yy")}
                              <br />
                              {formatServiceTime(record.serviceTime)}
                            </div>
                          </div>
                          <Badge
                            variant="secondary"
                            className="max-w-[11rem] text-center font-semibold leading-snug whitespace-normal"
                            style={{ backgroundColor: "#FFD400", color: "#000", border: "none" }}
                          >
                            {record.serviceType}
                          </Badge>
                        </div>

                        <div>
                          <div className="font-semibold leading-tight">{formatCustomerName(record.firstName, record.lastName)}</div>
                          <div className="text-sm leading-tight text-muted-foreground">{record.mobileNumber}</div>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="text-muted-foreground">
                            Status: <Badge variant="secondary" style={serviceStatusBadgeStyle(record.status)}>{normalizeServiceStatus(record.status)}</Badge>
                          </div>
                          <div className="text-muted-foreground">
                            Device:{" "}
                            <span className="text-foreground">
                              {record.printerMake || record.printerModel
                                ? `${record.printerMake ?? ""} ${record.printerModel ?? ""}`.trim()
                                : "-"}
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            Payment: <span className="text-foreground">{record.paymentMethod || "-"}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button asChild variant="outline" className="flex-1">
                            <Link href={`/edit/${record.id}`}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                            onClick={() => setRecordToDelete(record.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table className="min-w-[860px]">
                <TableHeader>
                  <TableRow style={{ backgroundColor: "#FFD400" }} className="hover:bg-[#FFD400]">
                    <TableHead className="w-[140px] pl-6 font-bold text-black">ID / Date</TableHead>
                    <TableHead className="font-bold text-black">Customer</TableHead>
                    <TableHead className="font-bold text-black">Service</TableHead>
                    <TableHead className="font-bold text-black">Status</TableHead>
                    <TableHead className="font-bold text-black">Device / Printer</TableHead>
                    <TableHead className="pr-6 text-right font-bold text-black">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="pl-6"><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-10 w-10 ml-auto" /></TableCell>
                        <TableCell className="pr-6"><Skeleton className="h-10 w-10 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : visibleRecordsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No records found matching your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visibleRecordsList.map((record) => (
                      <TableRow
                        key={record.id}
                        className="group cursor-default transition-colors"
                        style={{ transition: "background-color 0.15s" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#FFF6CC")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "")}
                      >
                        <TableCell className="pl-6 align-top">
                          <div className="font-semibold tracking-tight">#{record.id}</div>
                          <div className="mt-1 text-xs leading-tight text-muted-foreground">
                            {format(new Date(record.serviceDate), "dd MMM yy")}
                            <br/>
                            {formatServiceTime(record.serviceTime)}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="font-semibold leading-tight text-slate-900">{formatCustomerName(record.firstName, record.lastName)}</div>
                          <div className="mt-1 text-sm leading-tight text-muted-foreground">{record.mobileNumber}</div>
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge
                            variant="secondary"
                            className="mb-1 rounded-full px-3 py-1 font-semibold shadow-sm"
                            style={{ backgroundColor: "#FFD400", color: "#000", border: "none" }}
                          >
                            {record.serviceType}
                          </Badge>
                          {record.paymentMethod && <div className="mt-1 text-xs text-muted-foreground">Pay: {record.paymentMethod}</div>}
                        </TableCell>
                        <TableCell className="align-top">
                          <Badge variant="secondary" className="rounded-full px-3 py-1 shadow-sm" style={serviceStatusBadgeStyle(record.status)}>
                            {normalizeServiceStatus(record.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          {record.printerMake || record.printerModel ? (
                            <div className="text-sm leading-tight text-slate-800">
                              {record.printerMake} {record.printerModel}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right align-top">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-100">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <Link href={`/edit/${record.id}`}>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Pencil className="w-4 h-4 mr-2" /> Edit Record
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                onClick={() => setRecordToDelete(record.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {!isSearching && hasMoreRecords && (
              <div className="border-t border-black/5 px-4 py-4 sm:px-6">
                <div className="flex justify-center md:justify-end">
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setBrowseLimit((currentLimit) => currentLimit + PAGE_SIZE)}
                    disabled={recordsFetching}
                  >
                    {recordsFetching ? "Loading more..." : "Load more data"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete intake record
              #{recordToDelete} from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteRecord.isPending ? "Deleting..." : "Delete Record"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Layout>
  );
}
