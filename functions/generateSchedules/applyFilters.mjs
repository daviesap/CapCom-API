/**
 * applyFilters.mjs
 *
 * Purpose
 * -------
 * Provides utility functions to filter grouped schedule data according to
 * snapshot-level filters (tags, locations, sub-locations).
 *
 * Functions
 * ---------
 * - normaliseIdArray(x): ensures a value is returned as an array of strings.
 * - filterEntriesArray({ data, filterTagIds, filterLocationIds, filterSubLocationIds }):
 *     Given a list of entries, returns only those entries whose tagIds,
 *     locationIds, and subLocationIds match the provided filters.
 *     - If a filter array is empty, that dimension is treated as "no filter".
 *     - Matching is "any" within a dimension (an entry passes if it has at least one
 *       of the required IDs for that dimension).
 *     - Across dimensions, all must match (tags AND locations AND subLocations).
 * - applySnapshotFiltersToView(view, { filterTagIds, filterLocationIds, filterSubLocationIds }):
 *     Given a grouped view (with groups and entries), applies filterEntriesArray
 *     to each group. Returns a new view object containing only groups with
 *     entries that match the filters.
 *
 * Usage
 * -----
 * This module is imported by index.js to apply per-snapshot filters after
 * grouped views have been prepared. It ensures each snapshot only includes
 * entries relevant to its specified tag/location filters.
 */
// functions/generateSchedules/applyFilters.mjs

function normaliseIdArray(x) {
  if (!Array.isArray(x)) return [];
  return x.map(v => String(v));
}

export function filterEntriesArray({
  data,
  filterTagIds = [],
  filterLocationIds = [],
  filterSubLocationIds = [],
}) {
  const reqTags  = normaliseIdArray(filterTagIds);
  const reqLocs  = normaliseIdArray(filterLocationIds);
  const reqSubs  = normaliseIdArray(filterSubLocationIds);

  return (Array.isArray(data) ? data : []).filter(entry => {
    const rowTags = normaliseIdArray(entry?.tagIds);
    const rowLocs = normaliseIdArray(entry?.locationIds);
    const rowSubs = normaliseIdArray(entry?.subLocationIds);

    const matchSet = (row, req) => {
      if (!req.length) return true; // no filter
      return req.some(id => row.includes(id));
    };

    const tagMatch = matchSet(rowTags, reqTags);
    const locMatch = matchSet(rowLocs, reqLocs);
    const subMatch = matchSet(rowSubs, reqSubs);

    return tagMatch && locMatch && subMatch;
  });
}

export function applySnapshotFiltersToView(view, {
  filterTagIds = [],
  filterLocationIds = [],
  filterSubLocationIds = [],
}) {
  if (!view || !Array.isArray(view.groups)) {
    return { groupBy: view?.groupBy || "", groups: [] };
  }

  const groups = [];
  for (const g of view.groups) {
    const entries = filterEntriesArray({
      data: g.entries,
      filterTagIds,
      filterLocationIds,
      filterSubLocationIds,
    });
    if (entries.length) {
      groups.push({ rawKey: g.rawKey, title: g.title, meta: g.meta, entries });
    } else {
      groups.push({
        rawKey: g.rawKey,
        title: g.title,
        meta: g.meta,
        entries: [
          {
            fields: { time: "", description: "No entries", notes: "", tags: "", locations: "" },
            format: "empty"
          }
        ]
      });
    }
  }
  return { groupBy: view.groupBy, groups };
}