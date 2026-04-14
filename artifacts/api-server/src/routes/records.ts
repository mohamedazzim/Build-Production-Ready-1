import { Router, type IRouter, type Request, type Response } from "express";
import { db, customerIntakeRecordsTable } from "@workspace/db";
import { eq, like, ilike, and, gte, lte, desc, asc, or, count } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

const createRecordSchema = z.object({
  title: z.string().optional().nullable(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  mobileNumber: z.string().regex(/^\d{10}$/, "Mobile number must be 10 digits"),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  customerType: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  printerMake: z.string().optional().nullable(),
  printerModel: z.string().optional().nullable(),
  cartridgeTonerType: z.string().optional().nullable(),
  serviceType: z.string().min(1, "Service type is required"),
  status: z.enum(["Pending", "Completed"]).optional().nullable(),
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
      message: "Device serial number is required for Laptop/Computer Service and Printer Service",
      path: ["deviceSerialNumber"],
    });
  }
});

const importRecordsSchema = z.object({
  records: z.array(createRecordSchema).min(1).max(250),
});

function formatRecord(record: typeof customerIntakeRecordsTable.$inferSelect) {
  return {
    id: record.id,
    title: record.title,
    firstName: record.firstName,
    lastName: record.lastName,
    mobileNumber: record.mobileNumber,
    email: record.email,
    customerType: record.customerType,
    address: record.address,
    printerMake: record.printerMake,
    printerModel: record.printerModel,
    cartridgeTonerType: record.cartridgeTonerType,
    serviceType: record.serviceType,
    status: record.status ?? "Pending",
    deviceSerialNumber: record.deviceSerialNumber,
    paymentMethod: record.paymentMethod,
    notes: record.notes,
    serviceDate: record.serviceDate,
    serviceTime: record.serviceTime,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, mobile, serviceType, status, printerModel, dateFrom, dateTo, sortBy, limit, offset } = req.query as Record<string, string>;

    const parsePositiveInt = (value: string | undefined, name: string) => {
      if (value === undefined) {
        return { value: undefined as number | undefined };
      }

      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        return { error: `${name} must be a positive integer` };
      }

      return { value: parsed };
    };

    const parseNonNegativeInt = (value: string | undefined, name: string) => {
      if (value === undefined) {
        return { value: 0 };
      }

      const parsed = Number.parseInt(value, 10);
      if (Number.isNaN(parsed) || parsed < 0) {
        return { error: `${name} must be a non-negative integer` };
      }

      return { value: parsed };
    };

    const limitResult = parsePositiveInt(limit, "limit");
    if ("error" in limitResult) {
      res.status(400).json({ error: limitResult.error });
      return;
    }

    const offsetResult = parseNonNegativeInt(offset, "offset");
    if ("error" in offsetResult) {
      res.status(400).json({ error: offsetResult.error });
      return;
    }

    const searchTerm = search?.trim() || "";
    const effectiveLimit = limitResult.value ?? (searchTerm ? undefined : 100);
    const effectiveOffset = offsetResult.value;

    const conditions = [];

    if (searchTerm) {
      conditions.push(
        or(
          ilike(customerIntakeRecordsTable.firstName, `%${searchTerm}%`),
          ilike(customerIntakeRecordsTable.lastName, `%${searchTerm}%`),
          like(customerIntakeRecordsTable.mobileNumber, `%${searchTerm}%`),
          ilike(customerIntakeRecordsTable.printerModel, `%${searchTerm}%`),
        )
      );
    }

    if (mobile) {
      conditions.push(like(customerIntakeRecordsTable.mobileNumber, `%${mobile}%`));
    }

    if (serviceType) {
      conditions.push(eq(customerIntakeRecordsTable.serviceType, serviceType));
    }

    if (status) {
      conditions.push(eq(customerIntakeRecordsTable.status, status));
    }

    if (printerModel) {
      conditions.push(ilike(customerIntakeRecordsTable.printerModel, `%${printerModel}%`));
    }

    if (dateFrom) {
      conditions.push(gte(customerIntakeRecordsTable.serviceDate, dateFrom));
    }

    if (dateTo) {
      conditions.push(lte(customerIntakeRecordsTable.serviceDate, dateTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    let orderBy;
    if (sortBy === "oldest") {
      orderBy = asc(customerIntakeRecordsTable.createdAt);
    } else if (sortBy === "serviceDate") {
      orderBy = desc(customerIntakeRecordsTable.serviceDate);
    } else {
      orderBy = desc(customerIntakeRecordsTable.createdAt);
    }

    const baseQuery = db
      .select()
      .from(customerIntakeRecordsTable)
      .where(whereClause)
      .orderBy(orderBy);

    const records = effectiveLimit !== undefined
      ? await baseQuery.limit(effectiveLimit).offset(effectiveOffset)
      : await baseQuery;

    res.json(records.map(formatRecord));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch records");
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

router.get("/analytics", async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split("T")[0];

    const [todayResult, weekResult, monthResult, totalResult, serviceBreakdown] = await Promise.all([
      db.select({ count: count() }).from(customerIntakeRecordsTable).where(eq(customerIntakeRecordsTable.serviceDate, todayStr)),
      db.select({ count: count() }).from(customerIntakeRecordsTable).where(gte(customerIntakeRecordsTable.serviceDate, weekAgoStr)),
      db.select({ count: count() }).from(customerIntakeRecordsTable).where(gte(customerIntakeRecordsTable.serviceDate, monthAgoStr)),
      db.select({ count: count() }).from(customerIntakeRecordsTable),
      db.select({
        serviceType: customerIntakeRecordsTable.serviceType,
        count: count(),
      })
        .from(customerIntakeRecordsTable)
        .groupBy(customerIntakeRecordsTable.serviceType)
        .orderBy(desc(count())),
    ]);

    const serviceTypeBreakdown = serviceBreakdown.map((row) => ({
      serviceType: row.serviceType,
      count: Number(row.count),
    }));

    const mostCommonService = serviceTypeBreakdown.length > 0 ? serviceTypeBreakdown[0].serviceType : null;

    res.json({
      todayCount: Number(todayResult[0]?.count ?? 0),
      weekCount: Number(weekResult[0]?.count ?? 0),
      monthCount: Number(monthResult[0]?.count ?? 0),
      totalCount: Number(totalResult[0]?.count ?? 0),
      serviceTypeBreakdown,
      mostCommonService,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch analytics");
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

router.get("/lookup-mobile", async (req: Request, res: Response) => {
  try {
    const { mobile } = req.query as { mobile: string };

    if (!mobile) {
      res.status(400).json({ error: "Mobile number is required" });
      return;
    }

    const records = await db
      .select()
      .from(customerIntakeRecordsTable)
      .where(eq(customerIntakeRecordsTable.mobileNumber, mobile))
      .orderBy(desc(customerIntakeRecordsTable.createdAt))
      .limit(1);

    if (records.length === 0) {
      res.status(404).json({ error: "No customer found with this mobile number" });
      return;
    }

    res.json(formatRecord(records[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to lookup mobile");
    res.status(500).json({ error: "Failed to lookup mobile" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid record ID" });
      return;
    }

    const records = await db
      .select()
      .from(customerIntakeRecordsTable)
      .where(eq(customerIntakeRecordsTable.id, id))
      .limit(1);

    if (records.length === 0) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json(formatRecord(records[0]));
  } catch (err) {
    req.log.error({ err }, "Failed to fetch record");
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

router.post("/import", async (req: Request, res: Response) => {
  try {
    const parsed = importRecordsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues.map((issue) => issue.message).join(", "),
      });
      return;
    }

    const values = parsed.data.records.map((data) => ({
      title: data.title || null,
      firstName: data.firstName,
      lastName: data.lastName,
      mobileNumber: data.mobileNumber,
      email: data.email || null,
      customerType: data.customerType || null,
      address: data.address || null,
      printerMake: data.printerMake || null,
      printerModel: data.printerModel || null,
      cartridgeTonerType: data.cartridgeTonerType || null,
      serviceType: data.serviceType,
      status: data.status || "Pending",
      deviceSerialNumber: data.deviceSerialNumber || null,
      paymentMethod: data.paymentMethod || null,
      notes: data.notes || null,
      serviceDate: data.serviceDate,
      serviceTime: data.serviceTime,
    }));

    const inserted = await db
      .insert(customerIntakeRecordsTable)
      .values(values)
      .returning({ id: customerIntakeRecordsTable.id });

    res.status(201).json({
      imported: inserted.length,
      message: `Imported ${inserted.length} records successfully`,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to import records");
    res.status(500).json({ error: "Failed to import records" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = createRecordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues.map((i) => i.message).join(", "),
      });
      return;
    }

    const data = parsed.data;

    const [record] = await db
      .insert(customerIntakeRecordsTable)
      .values({
        title: data.title || null,
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        email: data.email || null,
        customerType: data.customerType || null,
        address: data.address || null,
        printerMake: data.printerMake || null,
        printerModel: data.printerModel || null,
        cartridgeTonerType: data.cartridgeTonerType || null,
        serviceType: data.serviceType,
        status: data.status || "Pending",
        deviceSerialNumber: data.deviceSerialNumber || null,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        serviceDate: data.serviceDate,
        serviceTime: data.serviceTime,
      })
      .returning();

    res.status(201).json(formatRecord(record));
  } catch (err) {
    req.log.error({ err }, "Failed to create record");
    res.status(500).json({ error: "Failed to create record" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid record ID" });
      return;
    }

    const parsed = createRecordSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.issues.map((i) => i.message).join(", "),
      });
      return;
    }

    const data = parsed.data;

    const [record] = await db
      .update(customerIntakeRecordsTable)
      .set({
        title: data.title || null,
        firstName: data.firstName,
        lastName: data.lastName,
        mobileNumber: data.mobileNumber,
        email: data.email || null,
        customerType: data.customerType || null,
        address: data.address || null,
        printerMake: data.printerMake || null,
        printerModel: data.printerModel || null,
        cartridgeTonerType: data.cartridgeTonerType || null,
        serviceType: data.serviceType,
        status: data.status || "Pending",
        deviceSerialNumber: data.deviceSerialNumber || null,
        paymentMethod: data.paymentMethod || null,
        notes: data.notes || null,
        serviceDate: data.serviceDate,
        serviceTime: data.serviceTime,
        updatedAt: new Date(),
      })
      .where(eq(customerIntakeRecordsTable.id, id))
      .returning();

    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json(formatRecord(record));
  } catch (err) {
    req.log.error({ err }, "Failed to update record");
    res.status(500).json({ error: "Failed to update record" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid record ID" });
      return;
    }

    const [deleted] = await db
      .delete(customerIntakeRecordsTable)
      .where(eq(customerIntakeRecordsTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json({ success: true, message: "Record deleted successfully" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete record");
    res.status(500).json({ error: "Failed to delete record" });
  }
});

export default router;
