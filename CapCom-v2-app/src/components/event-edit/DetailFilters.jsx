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

  const selectedTag = usedTags.find((tag) => tag.id === selectedTagFilterId);

  const renderSingleFilterSummary = () => {
    if (!selectedTag) return "All tags";
    return `Tag: ${selectedTag.name}`;
  };

  const renderMultiFilterSummary = (selectedIds, prefix, allLabel) => {
    if (selectedIds.length === 0) return `${prefix}: ${allLabel}`;
    const selectedCount = selectedIds.length;
    return `${prefix}: ${selectedCount} selected`;
  };

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
          <details className="company-dropdown">
            <summary className="company-dropdown-trigger">
              {renderSingleFilterSummary()}
            </summary>
            <div className="company-dropdown-menu">
              <label className="company-dropdown-option" htmlFor="detail-filter-tag-all">
                <input
                  id="detail-filter-tag-all"
                  type="radio"
                  name="detail-filter-tag"
                  checked={!selectedTagFilterId}
                  onChange={() => setSelectedTagFilterId("")}
                />
                <span>All tags</span>
              </label>
              {usedTags.map((tag) => (
                <label
                  className="company-dropdown-option"
                  htmlFor={`detail-filter-tag-${tag.id}`}
                  key={tag.id}
                >
                  <input
                    id={`detail-filter-tag-${tag.id}`}
                    type="radio"
                    name="detail-filter-tag"
                    checked={selectedTagFilterId === tag.id}
                    onChange={() => setSelectedTagFilterId(tag.id)}
                    style={selectedTagFilterId === tag.id ? getTagStyle(tag) : undefined}
                  />
                  <span className="tag-dot" style={{ backgroundColor: normaliseHexColour(tag.colour) }} />
                  <span>{tag.name}</span>
                  <span className="filter-count">{detailCountByTagId[tag.id] || 0}</span>
                </label>
              ))}
            </div>
          </details>
        </div>
      ) : null}
      {usedLocationFilters.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by location">
          <details className="company-dropdown">
            <summary className="company-dropdown-trigger">
              {renderMultiFilterSummary(selectedLocationFilterIds, "Locations", "All locations")}
            </summary>
            <div className="company-dropdown-menu">
              <label className="company-dropdown-option" htmlFor="detail-filter-location-all">
                <input
                  id="detail-filter-location-all"
                  type="checkbox"
                  checked={selectedLocationFilterIds.length === 0}
                  onChange={() => setSelectedLocationFilterIds([])}
                />
                <span>All locations</span>
              </label>
              {usedLocationFilters.map((location) => (
                <label
                  className="company-dropdown-option"
                  htmlFor={`detail-filter-location-${location.id}`}
                  key={location.id}
                >
                  <input
                    id={`detail-filter-location-${location.id}`}
                    type="checkbox"
                    checked={selectedLocationFilterIds.includes(location.id)}
                    onChange={() => toggleLocationFilter(location.id)}
                  />
                  <span>{location.name}</span>
                  <span className="filter-count">
                    {detailCountByLocationFilterId[location.id] || 0}
                  </span>
                </label>
              ))}
            </div>
          </details>
        </div>
      ) : null}
      {usedSubLocationFilters.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by sub location">
          <details className="company-dropdown">
            <summary className="company-dropdown-trigger">
              {renderMultiFilterSummary(selectedSubLocationFilterIds, "Sub locations", "All sub locations")}
            </summary>
            <div className="company-dropdown-menu">
              <label className="company-dropdown-option" htmlFor="detail-filter-sub-location-all">
                <input
                  id="detail-filter-sub-location-all"
                  type="checkbox"
                  checked={selectedSubLocationFilterIds.length === 0}
                  onChange={() => setSelectedSubLocationFilterIds([])}
                />
                <span>All sub locations</span>
              </label>
              {usedSubLocationFilters.map((location) => (
                <label
                  className="company-dropdown-option"
                  htmlFor={`detail-filter-sub-location-${location.id}`}
                  key={location.id}
                >
                  <input
                    id={`detail-filter-sub-location-${location.id}`}
                    type="checkbox"
                    checked={selectedSubLocationFilterIds.includes(location.id)}
                    onChange={() => toggleSubLocationFilter(location.id)}
                  />
                  <span>{location.displayName}</span>
                  <span className="filter-count">
                    {detailCountBySubLocationId[location.id] || 0}
                  </span>
                </label>
              ))}
            </div>
          </details>
        </div>
      ) : null}
      {usedCompanies.length > 0 ? (
        <div className="tag-filter-bar" aria-label="Filter schedule rows by company">
          <details className="company-dropdown">
            <summary className="company-dropdown-trigger">
              {renderMultiFilterSummary(selectedCompanyFilterIds, "Companies", "All companies")}
            </summary>
            <div className="company-dropdown-menu">
              <label className="company-dropdown-option" htmlFor="detail-filter-company-all">
                <input
                  id="detail-filter-company-all"
                  type="checkbox"
                  checked={selectedCompanyFilterIds.length === 0}
                  onChange={() => setSelectedCompanyFilterIds([])}
                />
                <span>All companies</span>
              </label>
              {usedCompanies.map((company) => (
                <label
                  className="company-dropdown-option"
                  htmlFor={`detail-filter-company-${company.id}`}
                  key={company.id}
                >
                  <input
                    id={`detail-filter-company-${company.id}`}
                    type="checkbox"
                    checked={selectedCompanyFilterIds.includes(company.id)}
                    onChange={() => toggleCompanyFilter(company.id)}
                  />
                  <span>{company.companyName}</span>
                  <span className="filter-count">
                    {detailCountByCompanyId[company.id] || 0}
                  </span>
                </label>
              ))}
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
