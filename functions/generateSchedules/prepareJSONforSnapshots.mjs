/*
 * functions/generateSchedules/prepareJSONforSnapshots.mjs
 * -------------------------------------------------------
 * Build grouped and sorted views for each group preset. This module reads a
 * `groupPresets.json` file and materializes groups (e.g., date/tag/location) from
 * an incoming payload of schedule rows.
 * Requirements:
 *  - The module loads a presets JSON file; the path should be resolved relative to
 *    this module (not to process.cwd()) to avoid working-dir issues.
 *  - The payload shape expected: payload.data.scheduleDetail is an array of rows.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Build grouped & sorted views for each preset.
 * Assumptions:
 * - payload.data[].date is "YYYY-MM-DD"
 * - payload.groupMeta.<bucket> is an array: [{ id/tagId/truckId/date, data:{ above:"", below:"" } }, ...]
 * - payload.dicts.groupMeta.<bucket> is a map: { "key": { above:"", below:"" }, ... }
 * - Time is text; sort lexicographically when needed.
 */
export async function prepareJSONGroups(
  payload,
  { presetsPath } = {}
) {
  // Resolve presets path relative to this module to avoid depending on process.cwd()
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const defaultPresets = path.join(__dirname, "assets", "groupPresets.json");
  const presetsAbs = path.isAbsolute(presetsPath || "")
    ? (presetsPath || defaultPresets)
    : path.resolve(__dirname, presetsPath || defaultPresets);
  // 1) Load presets
  const { groupPresets } = JSON.parse(await fs.readFile(presetsAbs, "utf8"));

  // 2) Build quick meta indexes keyed by `groupMetaData`
  const groupMetaIndexes = indexGroupMeta(payload);
  const metaByDate = groupMetaIndexes.dates || groupMetaIndexes.scheduleDetail || {};

  // 3) Materialize rows (augment with friendly dateKey when available)
  const rows = Array.isArray(payload?.data?.scheduleDetail)
    ? payload.data.scheduleDetail.map(row => {
        const cloned = { ...row };
        if (cloned.date && !cloned.dateKey) {
          const friendly = metaByDate[cloned.date]?.title;
          cloned.dateKey = friendly || cloned.date;
        }
        return cloned;
      })
    : [];

  // 4) For each preset, group + sort + attach meta
  const result = {};
  for (const preset of (Array.isArray(groupPresets) ? groupPresets : [])) {
    if (!preset?.groupBy) continue;

    const groupBy = preset.groupBy;                 // "date" | "tagId" | "locationId" | "truckId"
    const outKey = preset.id || preset.label || groupBy;
    const groups = groupRows(rows, groupBy);

    // Attach metadata per preset bucket (fallback to dates for legacy presets)
    const metaBucket =
      (preset.groupMetaData && groupMetaIndexes[preset.groupMetaData]) ||
      (groupBy === "date" ? metaByDate : null);
    if (metaBucket) {
      for (const g of groups) {
        const m = metaBucket[g.rawKey];
        if (m) g.meta = m; // { title, above, below }
      }
    }

    // Sort groups & entries
    sortGroupsInPlace(groups, preset);
    for (const g of groups) sortEntriesInPlace(g.entries, groupBy, preset);

    // Columns: take from preset.columns if present
    const columns = Array.isArray(preset.columns) ? preset.columns.map(c => ({ ...c })) : [];

    result[outKey] = {
      label: preset.label || outKey,
      groupBy,
      columns,
      groups,
    };
  }

  return result;
}

/* ---------------- helpers (lean) ---------------- */

function indexGroupMeta(payload) {
  const meta = Object.create(null);

  const assign = (bucket, key, data) => {
    if (!bucket || !key) return;
    const { title = "", above = "", below = "" } = data || {};
    if (!meta[bucket]) meta[bucket] = Object.create(null);
    meta[bucket][key] = { title, above, below };
  };

  const arrayBuckets = payload?.groupMeta;
  if (arrayBuckets && typeof arrayBuckets === "object") {
    for (const [bucket, entries] of Object.entries(arrayBuckets)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (!entry || typeof entry !== "object") continue;
        const data = (entry.data && typeof entry.data === "object") ? entry.data : entry;
        const key =
          entry.id ??
          entry.date ??
          entry.tagId ??
          entry.locationId ??
          entry.truckId ??
          entry.key ??
          entry.groupKey;
        assign(bucket, key, data);
      }
    }
  }

  const dictBuckets = payload?.dicts?.groupMeta;
  if (dictBuckets && typeof dictBuckets === "object") {
    for (const [bucket, mapForm] of Object.entries(dictBuckets)) {
      if (!mapForm || typeof mapForm !== "object") continue;
      for (const [key, data] of Object.entries(mapForm)) {
        assign(bucket, key, data);
      }
    }
  }

  return meta;
}

function groupRows(rows, groupBy) {
  const bucket = new Map();

  for (const r of rows) {
    let keys = [];

    if (groupBy === "date") {
      if (r.date) keys = [r.date]; // already "YYYY-MM-DD"
    } else if (groupBy === "tagId") {
      keys = Array.isArray(r.tagIds) ? r.tagIds : [];
    } else if (groupBy === "locationId") {
      keys = Array.isArray(r.locationIds) ? r.locationIds : [];
    } else if (groupBy === "truckId") {
      keys = r.truckId ? [r.truckId] : [];
    } else {
      continue;
    }

    for (const k of keys) {
      if (!k) continue;
      if (!bucket.has(k)) bucket.set(k, []);
      bucket.get(k).push(r);
    }
  }

  const groups = [];
  for (const [rawKey, entries] of bucket.entries()) {
    groups.push({
      rawKey,
      title: makeGroupTitle(rawKey, groupBy, entries),
      entries,
      meta: undefined,
    });
  }
  return groups;
}

function makeGroupTitle(rawKey, groupBy, entries) {
  if (groupBy === "date") return rawKey; // already yyyy-mm-dd
  if (groupBy === "tagId") {
    const name = entries?.find(e => Array.isArray(e.tags) && e.tags.length)?.tags?.[0];
    return name || rawKey;
  }
  if (groupBy === "truckId") {
    const name =
      entries?.find(e => typeof e.truckName === "string" && e.truckName.trim())?.truckName?.trim() ||
      entries?.find(e => Array.isArray(e.tags) && e.tags.length)?.tags?.[0];
    return name || rawKey;
  }
  if (groupBy === "locationId") {
    const name = entries?.find(e => Array.isArray(e.locations) && e.locations.length)?.locations?.[0];
    return name || rawKey;
  }
  return String(rawKey);
}

function sortGroupsInPlace(groups, preset) {
  const tokens = Array.isArray(preset?.groupSort) ? preset.groupSort : [];
  if (!tokens.length) {
    // sensible default: by key ascending
    groups.sort((a, b) => (a.rawKey > b.rawKey ? 1 : a.rawKey < b.rawKey ? -1 : 0));
    return;
  }
  const cmp = buildComparator(tokens, (g, field) => {
    switch (field) {
      case "date":
      case "dateKey": return g.rawKey;
      case "tagName":
      case "locationName":
      default: return g.title ?? g.rawKey;
    }
  });
  groups.sort(cmp);
}

function sortEntriesInPlace(entries, groupBy, preset) {
  const tokens = Array.isArray(preset?.entrySort) ? preset.entrySort : (
    groupBy === "date"
      ? ["time:asc", "description:asc"]          // time is text; lexical
      : ["date:asc", "time:asc", "description:asc"]
  );

  const cmp = buildComparator(tokens, (e, field) => {
    switch (field) {
      case "date": return e.date;                     // "YYYY-MM-DD"
      case "time": return (e.time ?? "").toLowerCase(); // lexical sort
      case "description": return (e.description ?? "").toLowerCase();
      default: return e[field];
    }
  });
  entries.sort(cmp);
}

function buildComparator(tokens, getter) {
  const rules = tokens.map(tok => {
    const [field, dir = "asc"] = String(tok).split(":");
    const mul = dir.toLowerCase() === "desc" ? -1 : 1;
    return { field: field.trim(), mul };
  });

  return (a, b) => {
    for (const { field, mul } of rules) {
      const av = getter(a, field);
      const bv = getter(b, field);
      if (av == null && bv == null) continue;
      if (av == null) return 1;    // nulls last
      if (bv == null) return -1;

      if (typeof av === "number" && typeof bv === "number") {
        if (av !== bv) return (av - bv) * mul;
      } else {
        const as = String(av);
        const bs = String(bv);
        if (as !== bs) return (as > bs ? 1 : -1) * mul;
      }
    }
    return 0;
  };
}
