// utils/filterJSON.mjs

/**
 * Filters JSON data based on tagIds and locationIds.
 * Requires BOTH to match if BOTH filters are provided.
 * If only one filter is provided, only that one is applied.
 */

export function filterJson(jsonData) {
  const filters = jsonData.filters || {};
  const hasTagFilter = Array.isArray(filters.tagIds) && filters.tagIds.length > 0;
  const hasLocationFilter = Array.isArray(filters.locationIds) && filters.locationIds.length > 0;

  // If no filters are set, return everything
  if (!hasTagFilter && !hasLocationFilter) return jsonData;

  const filteredGroups = jsonData.groups.map(group => {
    const filteredEntries = group.entries.filter(entry => {
      const fields = entry.fields || {};
      const tagIds = Array.isArray(fields.tagIds) ? fields.tagIds : [];
      const locationIds = Array.isArray(fields.locationIds) ? fields.locationIds : [];

      const matchesTags = hasTagFilter
        ? tagIds.some(tagId => filters.tagIds.includes(tagId))
        : true;

      const matchesLocations = hasLocationFilter
        ? locationIds.some(locId => filters.locationIds.includes(locId))
        : true;

      return matchesTags && matchesLocations;
    });

    return {
      ...group,
      entries: filteredEntries
    };
  }).filter(group => group.entries.length > 0); // Remove any empty groups

  return {
    ...jsonData,
    groups: filteredGroups
  };
}