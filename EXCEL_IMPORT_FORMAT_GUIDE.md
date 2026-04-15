# Excel Import Format Guide

This guide explains the exact Excel format required by the Import Excel page in this application.

## 1. File Type and Sheet Rules

- Supported files: `.xlsx`, `.xls`, `.csv`
- The importer reads only the first sheet.
- Row 1 must be headers.
- Data starts from row 2.
- Maximum rows per import API request: 250 (UI automatically batches valid rows).

## 2. Minimum Required Data Per Row

Every row must produce these values:

1. first name
2. mobile number (10 digits)
3. service type
4. service date
5. service time

If any of these is missing or invalid, that row is marked invalid.

## 3. Required and Optional Columns

You can use either modern headers or legacy aliases. Header matching is case-insensitive and ignores spaces/underscores.

### Required fields

- First name:
  - `first_name`, `firstName`, `first name`, `firstname`
- Mobile:
  - `mobile_number`, `mobileNumber`, `mobile`, `phone`, `phone_number`
- Service:
  - `service_type`, `serviceType`, `service`, `service opted`, `serviceOpted`
- Date:
  - `service_date`, `serviceDate`, `date`, `service date`
- Time:
  - `service_time`, `serviceTime`, `time`, `service time`

### Optional fields

- `title`
- Last name: `last_name`, `lastName`, `last name`, `lastname`
- `email`
- Customer type: `customer_type`, `customerType`, `customer type`
- `address`
- Printer make: `printer_make`, `printerMake`, `make`
- Printer model: `printer_model`, `printerModel`, `model`
- Cartridge/toner: `cartridge_toner_type`, `cartridgeTonerType`, `cartridge`, `toner`
- Device serial: `device_serial_number`, `deviceSerialNumber`, `serial`, `serial_number`
- Payment: `payment_method`, `paymentMethod`, `payment`, `payment mode`
- Notes: `notes`, `note`, `remarks`, `comments`

## 4. Date and Time Format

Recommended format:

- `service_date`: `YYYY-MM-DD` (example: `2026-04-15`)
- `service_time`: `HH:mm` 24-hour (example: `14:30`)

Also accepted:

- Excel date/time cells
- `M/d/yyyy`
- `d/M/yyyy`
- Values with AM/PM (example: `2:30 PM`)

## 5. Mobile Number Rules

- Must end up as exactly 10 digits.
- Non-digit characters are stripped.
- If more than 10 digits exist, last 10 digits are used.

## 6. Service and Serial Number Rules

- `Laptop/Computer Service` requires `device_serial_number`.
- `Printer Service` requires `device_serial_number`.
- If service is missing, importer may infer service type from cartridge/model/serial.

## 7. Normalization Performed Automatically

The importer normalizes many values:

- Title values like `mr`, `mrs`, `ms`
- Customer type values to Home/Office/Business forms
- Payment method values like cash/upi/card
- Service synonyms (for example `photocopy` -> `Photo Copy`)
- Email is validated; invalid emails become empty

## 8. Recommended Template (Header Row)

Use this exact header row for clean imports:

```text
first_name,last_name,mobile_number,email,customer_type,address,printer_make,printer_model,cartridge_toner_type,service_type,device_serial_number,payment_method,notes,service_date,service_time
```

## 9. Example Valid Row

```text
Arun,Kumar,9876543210,arun@example.com,Home user,Anna Nagar,HP,1020,Ink,Printer Service,PRN1020SN123,Cash,Walk-in customer,2026-04-15,10:45
```

## 10. Import Tips

- Keep one consistent header style across the sheet.
- Avoid merged cells.
- Remove fully blank rows.
- Fix invalid rows shown in preview before importing.
- Start with 20-50 rows for first-time testing.
