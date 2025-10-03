/*
 * functions/utils/filterJSON.mjs
 * --------------------------------
 * Apply tag/location filters to merged schedule JSON. Ensures groups are retained
 * even if all entries are filtered out by inserting a placeholder row.
 *
 * Input shape:
 * {
 *   filters: { tagIds: string[], locationIds: string[] },
 *   groups: [{ title, metadata?, entries: [{ fields: {...} }] }]
 * }
 */

export function filterJson(jsonData = {}) {
  const filters = jsonData.filters || {};
  const tagIdsFilter = Array.isArray(filters.tagIds) ? filters.tagIds : [];
  const locIdsFilter = Array.isArray(filters.locationIds) ? filters.locationIds : [];

  const hasTagFilter = tagIdsFilter.length > 0;
  const hasLocFilter = locIdsFilter.length > 0;

  const groups = Array.isArray(jsonData.groups) ? jsonData.groups : [];

  const processedGroups = groups.map((group) => {
    const entries = Array.isArray(group.entries) ? group.entries : [];

    // Apply filters to each entry
    const filteredEntries = entries.filter((entry) => {
      const f = (entry && entry.fields) ? entry.fields : {};
      const entryTagIds = Array.isArray(f.tagIds) ? f.tagIds : [];
      const entryLocIds = Array.isArray(f.locationIds) ? f.locationIds : [];

      const matchesTags = hasTagFilter ? entryTagIds.some((id) => tagIdsFilter.includes(id)) : true;
      const matchesLocs = hasLocFilter ? entryLocIds.some((id) => locIdsFilter.includes(id)) : true;

      return matchesTags && matchesLocs;
    });

    // Always keep groups; insert placeholder row if no entries remain
    if (filteredEntries.length === 0) {
      return {
        ...group,
        entries: [
          {
            fields: {
              description: "No entries",
              time: "",
              tags: [],
              locations: "",
              tagIds: [],
              locationIds: [],
            },
            isPlaceholder: true,
          },
        ],
      };
    }

    return { ...group, entries: filteredEntries };
  });

  return { ...jsonData, groups: processedGroups };
}

// Keep a default export for any legacy imports
export default filterJson;