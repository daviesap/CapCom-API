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
    const filteredContent = group.groupContent.filter(entry => {
      const { tags = [], location = [] } = entry.rows;

      const matchesTags = hasTagFilter
        ? tags.some(tag => filters.tags.includes(tag))
        : true;

      const matchesLocations = hasLocationFilter
        ? location.some(loc => filters.location.includes(loc))
        : true;

      return matchesTags && matchesLocations; // ✅ Only include if BOTH match
    });

    return {
      ...group,
      groupContent: filteredContent
    };
  }).filter(group => group.groupContent.length > 0);

  return {
    ...jsonData,
    groups: filteredGroups
  };
}