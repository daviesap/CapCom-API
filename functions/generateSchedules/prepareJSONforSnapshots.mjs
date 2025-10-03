// prepareJSONGroups.mjs
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Build grouped & sorted views for each preset.
 * Assumptions:
 * - payload.data[].date is "YYYY-MM-DD"
 * - payload.groupMeta is an array: [{ date:"YYYY-MM-DD", data:{ above:"", below:"" } }, ...]
 *   OR payload.dicts.groupMeta.date is a map: { "YYYY-MM-DD": { above:"", below:"" }, ... }
 * - Time is text; sort lexicographically when needed.
 */
export async function prepareJSONGroups(
  payload,
  { presetsPath = "./generateSchedules/assets/groupPresets.json" } = {}
) {
  // 1) Load presets
  const presetsAbs = path.resolve(presetsPath);
  const { groupPresets } = JSON.parse(await fs.readFile(presetsAbs, "utf8"));

  // 2) Build quick meta index by dateKey (strings only)
  const metaByDate = indexDateMeta(payload);

  // 3) Materialize rows (no normalization needed per your guarantees)
  const rows = Array.isArray(payload?.data?.scheduleDetail)
    ? payload.data.scheduleDetail.slice()
    : [];

  // 4) For each preset, group + sort + attach meta
  const result = {};
  for (const preset of (Array.isArray(groupPresets) ? groupPresets : [])) {
    if (!preset?.groupBy) continue;

    const groupBy = preset.groupBy;                 // "date" | "tagId" | "locationId"
    const outKey = preset.id || preset.label || groupBy;
    const groups = groupRows(rows, groupBy);

    // Attach date meta only (extend later if you add other meta types)
    if (groupBy === "date") {
      for (const g of groups) {
        const m = metaByDate[g.rawKey];
        if (m) g.meta = m; // { above:"", below:"" }
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

function indexDateMeta(payload) {
  const meta = Object.create(null);

  // Array form: [{ date, data: { title, above, below } }]
  if (Array.isArray(payload?.groupMeta?.scheduleDates)) {
    for (const it of payload.groupMeta.scheduleDates) {
      if (!it?.date) continue;
      const { title = "", above = "", below = "" } = it.data || {};
      meta[it.date] = { title, above, below };
    }
  }

  // Map form: dicts.groupMeta.date = { [dateKey]: { title, above, below } }
  const mapForm = payload?.dicts?.groupMeta?.date;
  if (mapForm && typeof mapForm === "object") {
    for (const k of Object.keys(mapForm)) {
      const { title = "", above = "", below = "" } = mapForm[k] || {};
      meta[k] = { title, above, below };
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