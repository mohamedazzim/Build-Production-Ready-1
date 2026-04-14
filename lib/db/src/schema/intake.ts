import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customerIntakeRecordsTable = pgTable(
  "customer_intake_records",
  {
    id: serial("id").primaryKey(),
    title: text("title"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    mobileNumber: text("mobile_number").notNull(),
    email: text("email"),
    customerType: text("customer_type"),
    address: text("address"),
    printerMake: text("printer_make"),
    printerModel: text("printer_model"),
    cartridgeTonerType: text("cartridge_toner_type"),
    serviceType: text("service_type").notNull(),
    status: text("status").notNull().default("Pending"),
    deviceSerialNumber: text("device_serial_number"),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    serviceDate: text("service_date").notNull(),
    serviceTime: text("service_time").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_mobile_number").on(table.mobileNumber),
    index("idx_service_type").on(table.serviceType),
    index("idx_status").on(table.status),
    index("idx_service_date").on(table.serviceDate),
  ],
);

export const insertIntakeSchema = createInsertSchema(
  customerIntakeRecordsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertIntake = z.infer<typeof insertIntakeSchema>;
export type IntakeRecord = typeof customerIntakeRecordsTable.$inferSelect;
