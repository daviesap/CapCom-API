import { formatFriendlyDateUTC } from "../utils/prettyDate.mjs";

const FIELD_LABELS = {
  date: "Date",
  time: "Time",
  description: "Description",
  notes: "Notes",
  tags: "Tags",
  locations: "Locations",
  suppliers: "Suppliers",
};

function normalizeString(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeString(item))
      .filter(Boolean)
      .join(", ");
  }
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function rowEntryId(row) {
  return normalizeString(row?.entryId ?? row?.EntryId ?? row?.id ?? row?._id);
}

function rowDate(row) {
  return normalizeString(row?.date ?? row?.dateKey ?? row?.day);
}

function rowTime(row) {
  return normalizeString(row?.time ?? row?.startTime ?? row?.Time);
}

function rowDescription(row) {
  return normalizeString(row?.description ?? row?.title ?? row?.name ?? row?.Description);
}

function formatDateLabel(dateValue) {
  const date = normalizeString(dateValue);
  if (!date) return "No date";

  const friendly = formatFriendlyDateUTC(date);
  return friendly.replace(",", "");
}

function formatLine(row) {
  const time = rowTime(row) || "-";
  const description = rowDescription(row) || "Untitled line";
  return `${time}, ${description}`;
}

function sortDateKey(dateValue) {
  const date = normalizeString(dateValue);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toISOString();
}

function getPayloadData(payload, key) {
  return payload?.[key] ?? payload?.[key[0].toUpperCase() + key.slice(1)] ?? {};
}

function hasPayloadKey(payload, key) {
  return Object.prototype.hasOwnProperty.call(payload || {}, key) ||
    Object.prototype.hasOwnProperty.call(payload || {}, key[0].toUpperCase() + key.slice(1));
}

function datasetsFrom(data) {
  if (Array.isArray(data)) return new Map([["items", data]]);
  if (!data || typeof data !== "object") return new Map();

  const datasets = new Map();
  for (const [dataset, rows] of Object.entries(data)) {
    if (Array.isArray(rows)) datasets.set(dataset, rows);
  }
  return datasets;
}

function addChange(groups, dateValue, change) {
  const date = rowDate({ date: dateValue });
  const groupKey = date || "No date";

  if (!groups.has(groupKey)) {
    groups.set(groupKey, {
      date: groupKey,
      dateLabel: formatDateLabel(groupKey),
      changes: [],
    });
  }

  groups.get(groupKey).changes.push(change);
}

function indexRows(rows) {
  const indexed = new Map();
  for (const row of rows) {
    const entryId = rowEntryId(row);
    if (!entryId) continue;
    indexed.set(entryId, row);
  }
  return indexed;
}

function comparableFieldValue(row, field) {
  if (field === "tags") return normalizeString(row?.tags ?? row?.tagNames ?? row?.tagIds);
  if (field === "locations") return normalizeString(row?.locations ?? row?.locationNames ?? row?.locationIds);
  if (field === "suppliers") return normalizeString(row?.suppliers ?? row?.supplierNames ?? row?.supplierIds);
  return normalizeString(row?.[field]);
}

function changedFields(previousRow, currentRow) {
  return Object.keys(FIELD_LABELS).filter(field => (
    comparableFieldValue(previousRow, field) !== comparableFieldValue(currentRow, field)
  ));
}

function buildFieldChangeMessage(field, previousRow, currentRow) {
  const previousValue = comparableFieldValue(previousRow, field) || "-";
  const currentValue = comparableFieldValue(currentRow, field) || "-";
  const description = rowDescription(currentRow) || rowDescription(previousRow) || "Untitled line";

  if (field === "time") {
    return `Time changed for "${description}" from ${previousValue} to ${currentValue}`;
  }

  if (field === "date") {
    return `Date changed for "${description}" from ${formatDateLabel(previousValue)} to ${formatDateLabel(currentValue)}`;
  }

  return `${FIELD_LABELS[field]} changed for "${description}" from ${previousValue} to ${currentValue}`;
}

function buildText(groups) {
  if (!groups.length) return "No changes.";

  return groups
    .map(group => [
      group.dateLabel,
      "",
      ...group.changes.map(change => `- ${change.message}`),
    ].join("\n"))
    .join("\n\n");
}

export function buildDataDiff(payload = {}) {
  if (!hasPayloadKey(payload, "previousData")) {
    return {
      hasChanges: false,
      changeCount: 0,
      skippedRows: 0,
      groups: [],
      text: "No previousData supplied.",
    };
  }

  const currentData = getPayloadData(payload, "data");
  const previousData = getPayloadData(payload, "previousData");
  const currentDatasets = datasetsFrom(currentData);
  const previousDatasets = datasetsFrom(previousData);
  const datasetNames = new Set([...currentDatasets.keys(), ...previousDatasets.keys()]);
  const groups = new Map();
  let skippedRows = 0;

  for (const dataset of datasetNames) {
    const currentRows = currentDatasets.get(dataset) || [];
    const previousRows = previousDatasets.get(dataset) || [];
    const currentById = indexRows(currentRows);
    const previousById = indexRows(previousRows);

    skippedRows += currentRows.length - currentById.size;
    skippedRows += previousRows.length - previousById.size;

    for (const [entryId, currentRow] of currentById.entries()) {
      if (previousById.has(entryId)) continue;
      addChange(groups, rowDate(currentRow), {
        type: "added",
        dataset,
        entryId,
        message: `New line added: ${formatLine(currentRow)}`,
        line: formatLine(currentRow),
        date: rowDate(currentRow),
        time: rowTime(currentRow),
        description: rowDescription(currentRow),
      });
    }

    for (const [entryId, previousRow] of previousById.entries()) {
      if (currentById.has(entryId)) continue;
      addChange(groups, rowDate(previousRow), {
        type: "removed",
        dataset,
        entryId,
        message: `Removed line: ${formatLine(previousRow)}`,
        line: formatLine(previousRow),
        date: rowDate(previousRow),
        time: rowTime(previousRow),
        description: rowDescription(previousRow),
      });
    }

    for (const [entryId, currentRow] of currentById.entries()) {
      const previousRow = previousById.get(entryId);
      if (!previousRow) continue;

      const fields = changedFields(previousRow, currentRow);
      for (const field of fields) {
        const groupDate = field === "date" ? rowDate(currentRow) : (rowDate(currentRow) || rowDate(previousRow));
        addChange(groups, groupDate, {
          type: "changed",
          field,
          dataset,
          entryId,
          message: buildFieldChangeMessage(field, previousRow, currentRow),
          previousValue: comparableFieldValue(previousRow, field),
          currentValue: comparableFieldValue(currentRow, field),
          date: groupDate,
          time: rowTime(currentRow) || rowTime(previousRow),
          description: rowDescription(currentRow) || rowDescription(previousRow),
        });
      }
    }
  }

  const grouped = Array.from(groups.values())
    .sort((a, b) => sortDateKey(a.date).localeCompare(sortDateKey(b.date)));

  for (const group of grouped) {
    group.changes.sort((a, b) => {
      const aTime = normalizeString(a.time);
      const bTime = normalizeString(b.time);
      return aTime.localeCompare(bTime) || a.message.localeCompare(b.message);
    });
  }

  const changeCount = grouped.reduce((count, group) => count + group.changes.length, 0);

  return {
    hasChanges: changeCount > 0,
    changeCount,
    skippedRows,
    groups: grouped,
    text: buildText(grouped),
  };
}
