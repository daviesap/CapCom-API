import { tmpdir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseISO, format } from "date-fns";
import { getStorage } from "firebase-admin/storage";

import { buildExcel } from "./buildExcel.js";
import { buildHtml } from "./buildHtml.js";

const DESC_FONT_SIZE = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nowNs = () => process.hrtime.bigint();
const nsToMs = (ns) => Number(ns) / 1e6;

function toPositiveNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

function normalizeDate(value, fieldName) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}: ${value}`);
  }
  return date.toISOString();
}

function normalizeSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    throw new Error("Missing or invalid 'slots' array.");
  }

  const seen = new Set();
  const normalized = [];

  for (const slot of slots) {
    const slotNumber = Number(slot?.slot);
    if (!Number.isInteger(slotNumber) || slotNumber <= 0) {
      throw new Error("Each slot requires a positive integer 'slot' value.");
    }
    if (seen.has(slotNumber)) {
      throw new Error(`Duplicate slot definition for slot ${slotNumber}.`);
    }
    seen.add(slotNumber);

    const abb = String(slot?.abb ?? "").trim();
    if (!abb) {
      throw new Error(`Slot ${slotNumber} requires a non-empty 'abb' value.`);
    }

    normalized.push({
      slot: slotNumber,
      name: String(slot?.name ?? `Slot ${slotNumber}`).trim() || `Slot ${slotNumber}`,
      abb,
      location: String(slot?.location ?? "").trim()
    });
  }

  return normalized.sort((a, b) => a.slot - b.slot);
}

export function buildPivotModel(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Request body must be a JSON object.");
  }
  if (!Array.isArray(body.data)) {
    throw new Error("Missing or invalid 'data' array.");
  }

  const sortedSlots = normalizeSlots(body.slots);
  const slotNumbers = new Set(sortedSlots.map((slot) => slot.slot));
  const slotMap = new Map(sortedSlots.map((slot) => [`Slot${slot.slot}Total`, slot.abb]));
  const peopleMap = new Map();
  const datesByIso = new Map();
  const pivot = {};
  const accommodatedByPerson = new Map();

  for (const row of body.data) {
    if (!row || typeof row !== "object") continue;

    const personId = String(row.name ?? "").trim();
    if (!personId) {
      throw new Error("Each data row requires a non-empty 'name'.");
    }

    const isoDate = normalizeDate(row.date, "data[].date");
    if (!datesByIso.has(isoDate)) {
      datesByIso.set(isoDate, {
        date: isoDate,
        description: String(row.description ?? row.dateDescription ?? "").trim()
      });
    }

    if (!peopleMap.has(personId)) {
      peopleMap.set(personId, {
        name: personId,
        company: String(row.company ?? "").trim(),
        role: String(row.role ?? "").trim()
      });
    }

    if (row.accommodated === true) accommodatedByPerson.set(personId, true);
    if (!pivot[personId]) pivot[personId] = {};
    if (!pivot[personId][isoDate]) pivot[personId][isoDate] = {};

    for (const [key, value] of Object.entries(row)) {
      const match = key.match(/^Slot(\d+)Total$/i);
      if (!match) continue;

      const slotNumber = Number(match[1]);
      if (!slotNumbers.has(slotNumber)) {
        throw new Error(`${key} has no matching slot definition.`);
      }

      const qty = toPositiveNumber(value);
      if (qty === null) continue;

      const abb = slotMap.get(`Slot${slotNumber}Total`);
      pivot[personId][isoDate][abb] = (pivot[personId][isoDate][abb] || 0) + qty;
    }
  }

  const allDates = Array.from(datesByIso.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((dateEntry) => dateEntry.date);

  const dateLabels = allDates.map((date) => format(parseISO(date), "EEE d MMM"));
  const descByIso = new Map(
    Array.from(datesByIso.values()).map((dateEntry) => [dateEntry.date, dateEntry.description])
  );

  const cmp = (a, b) => {
    const A = peopleMap.get(a) || { company: "", name: a, role: "" };
    const B = peopleMap.get(b) || { company: "", name: b, role: "" };
    const company = A.company.localeCompare(B.company, undefined, { sensitivity: "base" });
    if (company !== 0) return company;
    const name = A.name.localeCompare(B.name, undefined, { sensitivity: "base" });
    if (name !== 0) return name;
    return A.role.localeCompare(B.role, undefined, { sensitivity: "base" });
  };

  const personIds = Array.from(peopleMap.keys());
  const accommodatedIds = personIds.filter((pid) => accommodatedByPerson.get(pid) === true).sort(cmp);
  const otherIds = personIds.filter((pid) => accommodatedByPerson.get(pid) !== true).sort(cmp);

  return {
    allDates,
    dateLabels,
    sortedSlots,
    descByIso,
    peopleMap,
    pivot,
    accommodatedIds,
    otherIds
  };
}

export async function mealsPivotV2Handler(req, res) {
  try {
    const hasData = Array.isArray(req.body?.data) && req.body.data.length > 0;
    const buildExcelFile = hasData;

    const totalStart = nowNs();
    const startedAt = new Date().toISOString();

    const {
      allDates,
      dateLabels,
      sortedSlots,
      descByIso,
      peopleMap,
      pivot,
      accommodatedIds,
      otherIds
    } = buildPivotModel(req.body);

    const eventNameRaw = typeof req.body?.eventNameRaw === "string" ? req.body.eventNameRaw : "";
    const eventName = eventNameRaw.trim() || req.body?.event?.name || req.body?.eventName || "Event";
    const safeApp = (req.body?.appName ?? "App").toString();
    const safeEvent = (req.body?.eventName ?? "Event").toString();
    const stamp = format(new Date(), "yyyyMMdd_HHmmss");
    const xlsxFileName = `${safeEvent}_Catering_${stamp}.xlsx`;
    const localHtmlFileName = `${safeEvent}_Catering_local.html`;
    const cloudHtmlFileName = `${safeEvent}_Catering_${stamp}.html`;
    const generatedAtText = format(new Date(), "EEEE d MMM yyyy, h:mm a");
    const isRunningLocally = process.env.FUNCTIONS_EMULATOR === "true";

    let excelMs = null;
    let excelUrl = null;
    let excelHrefForHtml = null;
    let localXlsxPath = null;

    if (buildExcelFile) {
      if (isRunningLocally) {
        const fs = await import("fs");
        const localDir = "/Users/apndavies/Coding/flair-pdf-generator/functions/local-emulator/output/mealsPivotv2";
        if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
        localXlsxPath = `${localDir}/${xlsxFileName}`;
      } else {
        localXlsxPath = join(tmpdir(), xlsxFileName);
      }

      const excelStart = nowNs();
      await buildExcel({
        outputPath: localXlsxPath,
        eventName,
        allDates,
        dateLabels,
        sortedSlots,
        descByIso,
        peopleMap,
        pivot,
        accommodatedIds,
        otherIds,
        descFontSize: DESC_FONT_SIZE
      });
      excelMs = Math.round(nsToMs(nowNs() - excelStart));

      if (!isRunningLocally) {
        const bucket = getStorage().bucket();
        const xlsxDest = `public/${safeApp}/${safeEvent}/${xlsxFileName}`;
        await bucket.upload(localXlsxPath, {
          destination: xlsxDest,
          metadata: {
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            cacheControl: "no-cache, max-age=0"
          }
        });
        await bucket.file(xlsxDest);
        excelUrl = `https://vox.capcom.london/${safeApp}/${safeEvent}/${xlsxFileName}`;
        excelHrefForHtml = excelUrl;
      } else {
        excelHrefForHtml = xlsxFileName;
      }
    }

    let htmlMs = null;
    let localHtmlPath = null;

    if (isRunningLocally) {
      const fs = await import("fs");
      const localDir = "/Users/apndavies/Coding/flair-pdf-generator/functions/local-emulator/output/mealsPivotv2";
      if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
      localHtmlPath = `${localDir}/${localHtmlFileName}`;
    } else {
      localHtmlPath = join(tmpdir(), cloudHtmlFileName);
    }

    const htmlStart = nowNs();
    const htmlString = await buildHtml({
      eventName,
      dateLabels,
      allDates,
      sortedSlots,
      descByIso,
      peopleMap,
      pivot,
      accommodatedIds,
      otherIds,
      generatedAtText,
      excelHref: excelHrefForHtml,
      cssPath: join(__dirname, "mealsPivot.css"),
      htmlTemplatePath: join(__dirname, "mealsPivot.html")
    });

    const fs = await import("fs");
    await fs.promises.writeFile(localHtmlPath, htmlString, "utf8");
    htmlMs = Math.round(nsToMs(nowNs() - htmlStart));

    if (!isRunningLocally) {
      let htmlUrl = null;
      const bucket = getStorage().bucket();
      const htmlDest = `public/${safeApp}/${safeEvent}/${cloudHtmlFileName}`;
      await bucket.upload(localHtmlPath, {
        destination: htmlDest,
        metadata: {
          contentType: "text/html; charset=utf-8",
          cacheControl: "public, max-age=0, must-revalidate"
        }
      });
      await bucket.file(htmlDest);
      htmlUrl = `https://vox.capcom.london/${safeApp}/${safeEvent}/${cloudHtmlFileName}`;

      const totalMs = Math.round(nsToMs(nowNs() - totalStart));
      const finishedAt = new Date().toISOString();
      return res.json({
        status: "✅ success",
        fileUrl: excelUrl,
        htmlUrl,
        timings: { startedAt, finishedAt, totalMs, excelMs, htmlMs }
      });
    }

    const totalMs = Math.round(nsToMs(nowNs() - totalStart));
    const finishedAt = new Date().toISOString();
    return res.json({
      status: "✅ success",
      localXlsxPath: buildExcelFile ? localXlsxPath : null,
      localHtmlPath,
      timings: { startedAt, finishedAt, totalMs, excelMs, htmlMs }
    });
  } catch (err) {
    console.error("❌ Error in mealsPivotV2Handler:", err);
    const status = err.message?.startsWith("Invalid")
      || err.message?.startsWith("Missing")
      || err.message?.startsWith("Each")
      || err.message?.startsWith("Request body")
      || err.message?.startsWith("Duplicate")
      || err.message?.startsWith("Slot")
      || err.message?.startsWith("The 'data'")
      || err.message?.includes("requires")
      || err.message?.includes("matching slot")
      ? 400
      : 500;
    return res.status(status).json({
      error: status === 400 ? "Invalid mealsPivotv2 payload" : "Server error",
      details: err.message
    });
  }
}
