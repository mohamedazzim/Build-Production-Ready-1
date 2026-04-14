import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lookupByMobile } from "@workspace/api-client-react";
import { format } from "date-fns";
import { User, Printer, Wrench, CreditCard, Clock, Save, RotateCcw } from "lucide-react";
import { SERVICE_STATUSES } from "@/lib/status";

export const recordFormSchema = z.object({
  title: z.string().optional().nullable(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  mobileNumber: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  email: z.string().email("Invalid email").optional().or(z.literal("")).nullable(),
  customerType: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  printerMake: z.string().optional().nullable(),
  printerModel: z.string().optional().nullable(),
  cartridgeTonerType: z.string().optional().nullable(),
  serviceType: z.string().min(1, "Service type is required"),
  status: z.enum(SERVICE_STATUSES),
  deviceSerialNumber: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  serviceDate: z.string().min(1, "Service date is required"),
  serviceTime: z.string().min(1, "Service time is required"),
}).superRefine((data, ctx) => {
  if (
    (
      data.serviceType === "Laptop/Computer Service" ||
      data.serviceType === "Computer/Laptop Repair" ||
      data.serviceType === "Printer Service"
    ) &&
    (!data.deviceSerialNumber || data.deviceSerialNumber.trim() === "")
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Device Serial Number is required for Printer Service and Laptop/Computer Service",
      path: ["deviceSerialNumber"],
    });
  }
});

export type RecordFormValues = z.infer<typeof recordFormSchema>;

export const TITLES = ["Mr", "Miss", "Ms", "Mrs"];
export const CUSTOMER_TYPES = ["Home user", "Office user", "Business user"];
export const PRINTER_MAKES = ["HP", "Canon", "Epson", "Brother", "Samsung", "Other"];
export const SERVICE_TYPES = [
  "Photo Copy", "Ink Refill", "Toner Refill", "Printouts", 
  "Scanning", "Lamination", "Laptop/Computer Service", "Printer Service"
];
export const PAYMENT_METHODS = ["Cash", "UPI", "Card"];
export const CARTRIDGE_TONER_TYPES = ["Ink", "Toner"];

interface RecordFormProps {
  initialValues?: Partial<RecordFormValues>;
  onSubmit: (data: RecordFormValues) => void;
  isSubmitting?: boolean;
}

export function RecordForm({ initialValues, onSubmit, isSubmitting }: RecordFormProps) {
  const { toast } = useToast();
  
  const defaultDate = format(new Date(), "yyyy-MM-dd");
  const defaultTime = format(new Date(), "HH:mm");

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: {
      title: "",
      firstName: "",
      lastName: "",
      mobileNumber: "",
      email: "",
      customerType: "",
      address: "",
      printerMake: "",
      printerModel: "",
      cartridgeTonerType: "",
      serviceType: "",
      status: "Pending",
      deviceSerialNumber: "",
      paymentMethod: "",
      notes: "",
      serviceDate: defaultDate,
      serviceTime: defaultTime,
      ...initialValues,
    },
  });

  const watchServiceType = form.watch("serviceType");
  const watchMobile = form.watch("mobileNumber");
  const watchPrinterMake = form.watch("printerMake") || "";
  const [isOtherPrinterMake, setIsOtherPrinterMake] = useState(
    !!initialValues?.printerMake && !PRINTER_MAKES.includes(initialValues.printerMake),
  );

  useEffect(() => {
    const handleLookup = async () => {
      if (watchMobile?.length === 10) {
        try {
          const record = await lookupByMobile({ mobile: watchMobile });
          if (record) {
            form.setValue("title", record.title || "");
            form.setValue("firstName", record.firstName);
            form.setValue("lastName", record.lastName);
            form.setValue("email", record.email || "");
            form.setValue("customerType", record.customerType || "");
            form.setValue("address", record.address || "");
            toast({
              title: "Customer Info Loaded",
              description: "Previous customer details have been auto-filled.",
            });
          }
        } catch (error) {
          // Ignore 404s, it just means no existing customer
        }
      }
    };
    
    if (!initialValues?.firstName) {
      handleLookup();
    }
  }, [watchMobile, toast, form, initialValues]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Customer Details */}
        <Card className="shadow-sm border-border rounded-xl cw-card-accent" style={{ boxShadow: "0 2px 12px rgba(11,76,194,0.07)" }}>
          <CardHeader className="pb-4 border-b" style={{ backgroundColor: "#FFF9E0" }}>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" style={{ color: "#0B4CC2" }} />
              Customer Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Title</Label>
                <Select value={form.watch("title") || ""} onValueChange={(v) => form.setValue("title", v)}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {TITLES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input {...form.register("firstName")} />
                {form.formState.errors.firstName && <p className="text-xs text-destructive">{form.formState.errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input {...form.register("lastName")} />
                {form.formState.errors.lastName && <p className="text-xs text-destructive">{form.formState.errors.lastName.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mobile Number <span className="text-destructive">*</span></Label>
                <Input {...form.register("mobileNumber")} maxLength={10} placeholder="10 digits" />
                {form.formState.errors.mobileNumber && <p className="text-xs text-destructive">{form.formState.errors.mobileNumber.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" {...form.register("email")} />
                {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer Type</Label>
              <Select value={form.watch("customerType") || ""} onValueChange={(v) => form.setValue("customerType", v)}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {CUSTOMER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea {...form.register("address")} rows={2} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Service Details */}
          <Card className="shadow-sm border-border rounded-xl cw-card-accent" style={{ boxShadow: "0 2px 12px rgba(11,76,194,0.07)" }}>
            <CardHeader className="pb-4 border-b" style={{ backgroundColor: "#FFF9E0" }}>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5" style={{ color: "#0B4CC2" }} />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label>Service Type <span className="text-destructive">*</span></Label>
                <Select value={form.watch("serviceType") || ""} onValueChange={(v) => form.setValue("serviceType", v)}>
                  <SelectTrigger className={form.formState.errors.serviceType ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select service required..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.formState.errors.serviceType && <p className="text-xs text-destructive">{form.formState.errors.serviceType.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Status <span className="text-destructive">*</span></Label>
                <Select value={form.watch("status") || "Pending"} onValueChange={(v) => form.setValue("status", v as (typeof SERVICE_STATUSES)[number])}>
                  <SelectTrigger className={form.formState.errors.status ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.status && <p className="text-xs text-destructive">{form.formState.errors.status.message}</p>}
              </div>

              {(watchServiceType === "Laptop/Computer Service" || watchServiceType === "Computer/Laptop Repair" || watchServiceType === "Printer Service") && (
                <div className="space-y-2 p-4 rounded-md border border-[#FFD400] bg-[#FFF9E0] animate-in fade-in slide-in-from-top-4">
                  <Label>Device Serial Number <span className="text-destructive">*</span></Label>
                  <Input {...form.register("deviceSerialNumber")} placeholder="Enter serial number" />
                  {form.formState.errors.deviceSerialNumber && <p className="text-xs text-destructive">{form.formState.errors.deviceSerialNumber.message}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Printer Details */}
          <Card className="shadow-sm border-border rounded-xl cw-card-accent" style={{ boxShadow: "0 2px 12px rgba(11,76,194,0.07)" }}>
            <CardHeader className="pb-4 border-b" style={{ backgroundColor: "#FFF9E0" }}>
              <CardTitle className="text-lg flex items-center gap-2">
                <Printer className="w-5 h-5" style={{ color: "#0B4CC2" }} />
                Device/Printer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Make</Label>
                  <Select
                    value={isOtherPrinterMake ? "Other" : watchPrinterMake}
                    onValueChange={(v) => {
                      if (v === "Other") {
                        setIsOtherPrinterMake(true);
                        if (PRINTER_MAKES.includes(watchPrinterMake)) {
                          form.setValue("printerMake", "");
                        }
                        return;
                      }

                      setIsOtherPrinterMake(false);
                      form.setValue("printerMake", v);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select make..." /></SelectTrigger>
                    <SelectContent>
                      {PRINTER_MAKES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input {...form.register("printerModel")} />
                </div>
              </div>
              {isOtherPrinterMake && (
                <div className="space-y-2">
                  <Label>Other Make Name</Label>
                  <Input
                    value={watchPrinterMake}
                    onChange={(e) => form.setValue("printerMake", e.target.value)}
                    placeholder="Type printer make"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Cartridge / Toner Type</Label>
                <Select value={form.watch("cartridgeTonerType") || ""} onValueChange={(v) => form.setValue("cartridgeTonerType", v)}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {CARTRIDGE_TONER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment & Time */}
        <Card className="shadow-sm border-border rounded-xl cw-card-accent lg:col-span-2" style={{ boxShadow: "0 2px 12px rgba(11,76,194,0.07)" }}>
          <CardHeader className="pb-4 border-b" style={{ backgroundColor: "#FFF9E0" }}>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" style={{ color: "#0B4CC2" }} />
              Payment & Time
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2 md:gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Method</Label>
                <Select value={form.watch("paymentMethod") || ""} onValueChange={(v) => form.setValue("paymentMethod", v)}>
                  <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes / Observations</Label>
                <Textarea {...form.register("notes")} rows={4} placeholder="Any specific issues or requests from customer..." />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 rounded-md border p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Service Date</Label>
                  <Input type="date" {...form.register("serviceDate")} />
                  {form.formState.errors.serviceDate && <p className="text-xs text-destructive">{form.formState.errors.serviceDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Service Time</Label>
                  <Input type="time" {...form.register("serviceTime")} />
                  {form.formState.errors.serviceTime && <p className="text-xs text-destructive">{form.formState.errors.serviceTime.message}</p>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className="mt-8 flex flex-col gap-3 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:justify-end md:sticky md:bottom-4"
        style={{ borderColor: "#FFD400", borderWidth: "1px" }}
      >
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => form.reset()}
          disabled={isSubmitting}
          className="w-full font-semibold sm:w-auto sm:min-w-32"
          style={{ backgroundColor: "#FFD400", color: "#000", borderColor: "#FFD400" }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full text-base font-semibold text-white shadow-md sm:w-auto sm:min-w-48"
          style={{ backgroundColor: "#0B4CC2" }}
        >
          <Save className="w-5 h-5 mr-2" />
          {isSubmitting ? "Saving..." : "Save Entry"}
        </Button>
      </div>
    </form>
  );
}
