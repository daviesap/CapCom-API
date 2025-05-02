// filter.mjs

/**
 * Filters the provided JSON data based on optional "filters" object.
 * The "filters" object can contain:
 *   - Tags: an array of tag strings
 *   - Locations: an array of location strings
 * 
 * If either filter is omitted or empty, it will be ignored.
 * The function returns a new JSON object with only matching groupContent entries,
 * and it removes any groups that become empty after filtering.
 *
 * @param {Object} jsonData - The full JSON structure including "groups" and optional "filters"
 * @returns {Object} - A filtered copy of the JSON structure
 */
export function filterJson(jsonData) {
    const filters = jsonData.filters || {}; // Extract filters object if it exists
    const hasTagFilter = Array.isArray(filters.Tags) && filters.Tags.length > 0;
    const hasLocationFilter = Array.isArray(filters.Locations) && filters.Locations.length > 0;
  
    // If no filters are set, return original data unchanged
    if (!hasTagFilter && !hasLocationFilter) {
      return jsonData;
    }
  
    // Loop through each group and filter its groupContent array
    const filteredGroups = jsonData.groups.map(group => {
      // Keep only entries in groupContent that pass the tag and location checks
      const filteredContent = group.groupContent.filter(entry => {
        const { tags = [], location = [] } = entry.rows;
  
        // Check if this entry matches the tag filter (if one exists)
        const matchesTags = !hasTagFilter || tags.some(tag =>
          filters.Tags.includes(tag)
        );
  
        // Check if this entry matches the location filter (if one exists)
        const matchesLocations = !hasLocationFilter || location.some(loc =>
          filters.Locations.includes(loc)
        );
  
        // Keep the entry only if it matches both (or if filters are inactive)
        return matchesTags && matchesLocations;
      });
  
      // Return the group with only the matching entries
      return {
        ...group,
        groupContent: filteredContent
      };
    })
    .filter(group => group.groupContent.length > 0); // Remove entire group if it's now empty
  
    // Return a new version of the full JSON object with updated groups
    return {
      ...jsonData,
      groups: filteredGroups
    };
  }