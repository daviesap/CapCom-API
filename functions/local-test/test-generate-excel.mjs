import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { generateExcelBuffer } from "../generateSchedules/generateExcel.mjs";

const { bytes, filename } = await generateExcelBuffer({
  document: { filename: "Full Schedule" },
  columns: [
    { field: "time", label: "Time", width: 80 },
    { field: "description", label: "Description", width: 220 },
    { field: "tags", label: "Tags", width: 100 },
  ],
  groups: [
    {
      title: "Sunday, 21 June 2026",
      entries: [
        {
          fields: {
            time: "09:00 - 20:00",
            description: "Load in",
            tags: ["Trucking", "Crew"],
          },
        },
      ],
    },
    {
      title: "Monday, 22 June 2026",
      entries: [
        {
          time: "10:00 - 11:00",
          description: "Show crew meeting",
          tags: [],
        },
      ],
    },
  ],
});

assert.equal(filename, "Full Schedule.xlsx");
assert.ok(Buffer.isBuffer(bytes));
assert.ok(bytes.length > 0);

const outputPath = path.join(os.tmpdir(), `capcom-test-${Date.now()}.xlsx`);
fs.writeFileSync(outputPath, bytes);

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(outputPath);
const sheet = workbook.getWorksheet("Full Schedule");

assert.ok(sheet);
assert.equal(sheet.getCell("A1").value, "Time");
assert.equal(sheet.getCell("B1").value, "Description");
assert.equal(sheet.getCell("A2").value, "Sunday, 21 June 2026");
assert.equal(sheet.getCell("A3").value, "09:00 - 20:00");
assert.equal(sheet.getCell("B3").value, "Load in");
assert.equal(sheet.getCell("C3").value, "Trucking, Crew");
assert.equal(sheet.getCell("A5").value, "Monday, 22 June 2026");
assert.equal(sheet.getCell("B6").value, "Show crew meeting");

fs.unlinkSync(outputPath);
console.log("generate excel tests passed");
