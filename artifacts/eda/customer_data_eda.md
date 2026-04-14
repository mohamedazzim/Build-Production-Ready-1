# Customer Data EDA

Input file: d:/StrangerThings Season 5/cleaned_customer_intake_records_v3.xlsx
Sheet analyzed: Sheet1

## Headline Findings

- Total rows analyzed: 3334
- Exact duplicate groups: 27 (72 rows)
- Repeated mobile numbers: 465 groups (1153 rows)
- Repeated mobiles with multiple name variants: 287 groups
- Rows where first name equals last name: 2325
- Rows with title-like first names: 62
- Rows where name contains address or org text: 89
- Date range: 2000-01-20 to 2026-12-03

## What The Screenshots Are Showing

- The repeated names in the dashboard are mostly source-data issues, not just UI issues.
- Many rows already have identical first_name and last_name values in the cleaned workbook, so the app is displaying what it received.
- Repeated entries are a mix of true repeat service history and candidate duplicate rows. They should be flagged, not blindly deleted.

## Safe Refinement Rules Used

- No rows were removed.
- Original columns were preserved exactly as they appear in the source workbook.
- Refinement was added as new columns only, including refined display name, normalized mobile number, duplicate classification, and quality flags.
- When first_name == last_name, the refined display name keeps a single copy of the name for reporting while preserving both original cells.

## Missingness

- first_name: 5 missing
- last_name: 5 missing
- mobile_number: 269 missing
- service_type: 1978 missing
- address: 1804 missing
- printer_make: 2033 missing
- printer_model: 2831 missing
- device_serial_number: 2504 missing
- notes: 2687 missing

## Top Services

- (blank): 1978
- Cartridge Recharge: 737
- Others: 181
- Printer Service: 171
- Printer Repair: 59
- OEM: 56
- Computer/Laptop Repair: 43
- Cartridge: 17
- Consumables: 12
- Photo Copy: 12
- Toner Refill: 10
- bk: 7

## Top Printer Models

- 1020: 59
- 2900: 46
- 1050: 21
- 1005: 13
- 1007: 13
- 1136: 13
- 12A: 11
- HP INK TANK 419: 11
- 1666: 9
- 3010: 8
- L220: 6
- 1000: 5

## Time Distribution

- 10:00: 3334

## Classification Breakdown

- unique_record: 2175
- same_customer_mobile_name_variant: 715
- repeat_customer_or_repeat_visit: 372
- exact_duplicate_candidate: 72

## Output Files

- Refined workbook: D:\StrangerThings Season 5\Build-Production-Ready-1\Build-Production-Ready-1\artifacts\eda\cleaned_customer_intake_records_refined.xlsx
- JSON summary: D:\StrangerThings Season 5\Build-Production-Ready-1\Build-Production-Ready-1\artifacts\eda\customer_data_eda.json
- Markdown report: D:\StrangerThings Season 5\Build-Production-Ready-1\Build-Production-Ready-1\artifacts\eda\customer_data_eda.md