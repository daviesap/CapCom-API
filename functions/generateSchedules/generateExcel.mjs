/*
 * functions/generateSchedules/generateExcel.mjs
 * ---------------------------------------------
 * Generate an Excel workbook from a prepared grouped schedule JSON.
 */
import ExcelJS from "exceljs";
import { Buffer } from "node:buffer";

function safeSheetName(name = "Schedule") {
  const cleaned = String(name || "Schedule")
    .replace(/[\[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (cleaned || "Schedule").slice(0, 31);
}

function normaliseColumns(columns = []) {
  if (!Array.isArray(columns)) return [];

  return columns
    .map((column) => {
      if (!column || typeof column !== "object") return null;
      const field = String(column.field || "").trim();
      if (!field) return null;
      return {
        field,
        label: String(column.label || field).trim() || field,
        width: Number(column.width) || 120,
      };
    })
    .filter(Boolean);
}

function stringifyCellValue(value) {
  if (value == null) return "";
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyCellValue(item))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    return Object.values(value)
      .map((item) => stringifyCellValue(item))
      .filter(Boolean)
      .join(", ");
  }
  return value;
}

function getEntryValue(entry = {}, field) {
  const fields = entry?.fields && typeof entry.fields === "object" ? entry.fields : {};
  if (Object.prototype.hasOwnProperty.call(fields, field)) {
    return stringifyCellValue(fields[field]);
  }
  if (Object.prototype.hasOwnProperty.call(entry, field)) {
    return stringifyCellValue(entry[field]);
  }
  return "";
}

function autosizeColumnWidth(column) {
  const width = Number(column.width) || 120;
  return Math.max(12, Math.min(60, Math.round(width / 7)));
}

export async function generateExcelBuffer(jsonInput = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CapCom";
  workbook.created = new Date();
  workbook.modified = new Date();

  const filenameBase = String(jsonInput?.document?.filename || jsonInput?.filename || "schedule")
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .trim() || "schedule";
  const sheet = workbook.addWorksheet(safeSheetName(filenameBase), {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const columns = normaliseColumns(jsonInput.columns);
  const groups = Array.isArray(jsonInput.groups) ? jsonInput.groups : [];

  sheet.columns = columns.map((column) => ({
    header: column.label,
    key: column.field,
    width: autosizeColumnWidth(column),
    style: { alignment: { vertical: "top", wrapText: true } },
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FFBFBFBF" } } };
  });

  if (!columns.length) {
    sheet.addRow(["No columns defined"]);
  }

  for (const group of groups) {
    const title = String(group?.title || group?.rawKey || "Untitled group").trim();
    const groupRow = sheet.addRow([title]);
    const lastColumn = Math.max(columns.length, 1);
    if (lastColumn > 1) {
      sheet.mergeCells(groupRow.number, 1, groupRow.number, lastColumn);
    }
    groupRow.font = { bold: true };
    groupRow.alignment = { vertical: "middle", wrapText: true };
    groupRow.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };
    });

    const entries = Array.isArray(group?.entries) ? group.entries : [];
    for (const entry of entries) {
      sheet.addRow(columns.map((column) => getEntryValue(entry, column.field)));
    }

    if (entries.length) {
      sheet.addRow([]);
    }
  }

  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.alignment = { ...cell.alignment, vertical: "top", wrapText: true };
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `${filenameBase}.xlsx`;
  return { bytes: Buffer.from(buffer), filename };
}
