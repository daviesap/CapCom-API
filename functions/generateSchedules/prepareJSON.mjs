import { formatFriendlyDateUTC } from "../utils/prettyDate.mjs";

// ---------- filterJSON ----------
// This function filters an array of schedule entries (data)
// by tags, locations, and sub-locations.
//
// Rules:
//  - If a filter array is empty → that filter is considered "off"
//    and all entries pass it.
//  - If a filter array has values → an entry must have *at least one*
//    matching ID in its own array to pass.
//
// Example: If filterTagIds = ["A"], only entries where entry.tagIds
// contains "A" will pass.

export function filterJSON({
  data,
  filterTagIds = [],
  filterLocationIds = [],
  filterSubLocationIds = [],
}) {
  return data.filter(entry => {
    // ✅ Pass if no tag filter OR at least one tag matches
    const tagMatch =
      filterTagIds.length === 0 ||
      entry.tagIds.some(tag => filterTagIds.includes(tag));

    // ✅ Pass if no location filter OR at least one location matches
    const locationMatch =
      filterLocationIds.length === 0 ||
      entry.locationIds.some(loc => filterLocationIds.includes(loc));

    // ✅ Pass if no sub-location filter OR at least one sub-location matches
    const subLocationMatch =
      filterSubLocationIds.length === 0 ||
      entry.subLocationIds.some(sub => filterSubLocationIds.includes(sub));

    // ✅ Entry must pass *all three* checks
    return tagMatch && locationMatch && subLocationMatch;
  });
}


/***********************************************************
 * Group raw schedule items by a single key.
 * Always adds `friendlyDate` (UTC-safe, no timezone day-shift).
 * No sorting and no validation (per your request).
 *
 * @param {Object} params
 * @param {Array<Object>} params.jsonDataRaw
 * @param {"date"|"time"|"description"|"location"|"tag"} params.groupBy
 * @returns {{ groups: Array<{ title: string, entries: Array<{fields: any}> }> }}
 */

export function groupAndSortJSON({ jsonDataRaw, groupBy, sortOrder }) {
  // 1. Group data
  const groupsMap = new Map();
  for (const item of jsonDataRaw) {
    const groupKey = item[groupBy];
    if (!groupsMap.has(groupKey)) groupsMap.set(groupKey, []);
    groupsMap.get(groupKey).push(item);
  }

  // 2. Sort groups
  let sortedGroupKeys = [...groupsMap.keys()];
  if (groupBy === "date") {
    sortedGroupKeys.sort((a, b) => new Date(a) - new Date(b));
  } else {
    sortedGroupKeys.sort((a, b) => String(a).localeCompare(String(b)));
  }

  // 3. Build output groups with sorted entries
  const groups = sortedGroupKeys.map(key => {
    let entries = groupsMap.get(key);

    // sort entries within group
    if (Array.isArray(sortOrder) && sortOrder.length) {
      entries.sort((a, b) => {
        for (const field of sortOrder) {
          let av = a[field] || "";
          let bv = b[field] || "";

          if (field === "date") {
            av = new Date(av);
            bv = new Date(bv);
            if (av - bv !== 0) return av - bv;
          } else {
            const cmp = String(av).localeCompare(String(bv));
            if (cmp !== 0) return cmp;
          }
        }
        return 0;
      });
    }

    return {
      title: groupBy === "date" ? formatFriendlyDateUTC(key) : key,
      rawKey: key, // keep original if you want it
      entries: entries.map(e => ({
        fields: {
          ...e,
          friendlyDate: formatFriendlyDateUTC(e.date) // every entry always has friendly date
        }
      }))
    };
  });

  return { groups };
}