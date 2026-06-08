export default function DetailFilters({
  usedTags,
  usedLocationFilters,
  usedSubLocationFilters,
  usedCompanies,
  detailCountByTagId,
  detailCountByLocationFilterId,
  detailCountBySubLocationId,
  detailCountByCompanyId,
  hasActiveScheduleFilters,
  selectedTagFilterId,
  selectedLocationFilterIds,
  selectedSubLocationFilterIds,
  selectedCompanyFilterIds,
  getTagStyle,
  normaliseHexColour,
  clearScheduleFilters,
  setSelectedTagFilterId,
  setSelectedLocationFilterIds,
  setSelectedSubLocationFilterIds,
  setSelectedCompanyFilterIds,
  toggleLocationFilter,
  toggleSubLocationFilter,
  toggleCompanyFilter,
}) {
  if (
    usedTags.length === 0 &&
    usedLocationFilters.length === 0 &&
    usedSubLocationFilters.length === 0 &&
    usedCompanies.length === 0
  ) {
    return null;
  }

  return (
    <div className="filter-groups" aria-label="Filter schedule rows">
      {hasActiveScheduleFilters ? (
        <div className="tag-filter-bar" aria-label="Clear schedule row filters">
          <button
            className="tag-filter-button"
            type="button"
            onClick={clearScheduleFilters}
          >
            Clear filters
          </button>
        </div>
      ) : null}
      {usedTags.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by tag">
          <button
            className={!selectedTagFilterId ? "tag-filter-button active" : "tag-filter-button"}
            type="button"
            onClick={() => setSelectedTagFilterId("")}
          >
            All tags
          </button>
          {usedTags.map((tag) => (
            <button
              className={
                selectedTagFilterId === tag.id
                  ? "tag-filter-button active"
                  : "tag-filter-button"
              }
              type="button"
              key={tag.id}
              style={selectedTagFilterId === tag.id ? getTagStyle(tag) : undefined}
              onClick={() =>
                setSelectedTagFilterId((current) => (current === tag.id ? "" : tag.id))
              }
            >
              <span
                className="tag-dot"
                style={{ backgroundColor: normaliseHexColour(tag.colour) }}
              />
              {tag.name}
              <span className="filter-count">{detailCountByTagId[tag.id] || 0}</span>
            </button>
          ))}
        </div>
      ) : null}
      {usedLocationFilters.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by location">
          <button
            className={
              selectedLocationFilterIds.length === 0
                ? "tag-filter-button active"
                : "tag-filter-button"
            }
            type="button"
            onClick={() => setSelectedLocationFilterIds([])}
          >
            All locations
          </button>
          {usedLocationFilters.map((location) => (
            <button
              className={
                selectedLocationFilterIds.includes(location.id)
                  ? "tag-filter-button active"
                  : "tag-filter-button"
              }
              type="button"
              key={location.id}
              onClick={() => toggleLocationFilter(location.id)}
            >
              {location.name}
              <span className="filter-count">
                {detailCountByLocationFilterId[location.id] || 0}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {usedSubLocationFilters.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by sub location">
          <button
            className={
              selectedSubLocationFilterIds.length === 0
                ? "tag-filter-button active"
                : "tag-filter-button"
            }
            type="button"
            onClick={() => setSelectedSubLocationFilterIds([])}
          >
            All sub locations
          </button>
          {usedSubLocationFilters.map((location) => (
            <button
              className={
                selectedSubLocationFilterIds.includes(location.id)
                  ? "tag-filter-button active"
                  : "tag-filter-button"
              }
              type="button"
              key={location.id}
              onClick={() => toggleSubLocationFilter(location.id)}
            >
              {location.displayName}
              <span className="filter-count">
                {detailCountBySubLocationId[location.id] || 0}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {usedCompanies.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by company">
          <button
            className={
              selectedCompanyFilterIds.length === 0
                ? "tag-filter-button active"
                : "tag-filter-button"
            }
            type="button"
            onClick={() => setSelectedCompanyFilterIds([])}
          >
            All companies
          </button>
          {usedCompanies.map((company) => (
            <button
              className={
                selectedCompanyFilterIds.includes(company.id)
                  ? "tag-filter-button active"
                  : "tag-filter-button"
              }
              type="button"
              key={company.id}
              onClick={() => toggleCompanyFilter(company.id)}
            >
              {company.companyName}
              <span className="filter-count">{detailCountByCompanyId[company.id] || 0}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
