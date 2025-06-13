// utils/filterJSON.mjs

/**
 * Filters JSON data based on tags and locations.
 * Requires BOTH to match if BOTH filters are provided.
 * If only one filter is provided, only that one is applied.
 */

export function filterJson(jsonData) {
  const filters = jsonData.filters || {};
  const hasTagFilter = Array.isArray(filters.tags) && filters.tags.length > 0;
  const hasLocationFilter = Array.isArray(filters.location) && filters.location.length > 0;

  // Return early if no filters
  if (!hasTagFilter && !hasLocationFilter) return jsonData;

  const filteredGroups = jsonData.groups.map(group => {
    const filteredEntries = group.entries.filter(entry => {
      const fields = entry.fields || {};
      const tags = Array.isArray(fields.tags) ? fields.tags : [];
      const locations = Array.isArray(fields.locations) ? fields.locations : [];

      const matchesTags = hasTagFilter
        ? tags.some(tag => filters.tags.includes(tag))
        : true;

      const matchesLocations = hasLocationFilter
        ? locations.some(loc => filters.location.includes(loc))
        : true;

      return matchesTags && matchesLocations;
    });

    return {
      ...group,
      entries: filteredEntries
    };
  }).filter(group => group.entries.length > 0); // Remove empty groups

  return {
    ...jsonData,
    groups: filteredGroups
  };
}