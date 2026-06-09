import { CapcomIcon } from "../../icons/capcomIcons.jsx";

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
  selectedTagFilterIds,
  selectedLocationFilterIds,
  selectedSubLocationFilterIds,
  selectedCompanyFilterIds,
  normaliseHexColour,
  clearScheduleFilters,
  setSelectedTagFilterIds,
  setSelectedLocationFilterIds,
  setSelectedSubLocationFilterIds,
  setSelectedCompanyFilterIds,
  toggleTagFilter,
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

  const renderMultiFilterSummary = (selectedIds, prefix, allLabel) => {
    if (selectedIds.length === 0) return prefix === allLabel ? prefix : `${prefix}: ${allLabel}`;
    const selectedCount = selectedIds.length;
    return `${prefix}: ${selectedCount}`;
  };
  const selectedLocationCount =
    selectedLocationFilterIds.length + selectedSubLocationFilterIds.length;

  return (
    <div className="filter-menu-bar" aria-label="Filter schedule rows">
      {usedTags.length > 0 ? (
        <div className="filter-menu-group" aria-label="Filter schedule rows by tag">
          <details className="filter-menu-item company-dropdown">
            <summary className="filter-menu-trigger">
              {selectedTagFilterIds.length === 0
                ? "Tags"
                : `Tags: ${selectedTagFilterIds.length}`}
            </summary>
            <div className="filter-menu-panel">
              <label className="filter-menu-option" htmlFor="detail-filter-tag-all">
                <input
                  id="detail-filter-tag-all"
                  type="checkbox"
                  checked={selectedTagFilterIds.length === 0}
                  onChange={() => setSelectedTagFilterIds([])}
                />
                <span>All</span>
              </label>
              {usedTags.map((tag) => (
                <label
                  className="filter-menu-option"
                  htmlFor={`detail-filter-tag-${tag.id}`}
                  key={tag.id}
                >
                  <input
                    id={`detail-filter-tag-${tag.id}`}
                    type="checkbox"
                    checked={selectedTagFilterIds.includes(tag.id)}
                    onChange={() => toggleTagFilter(tag.id)}
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
      {usedLocationFilters.length > 0 || usedSubLocationFilters.length > 0 ? (
        <div className="filter-menu-group" aria-label="Filter schedule rows by location">
          <details className="filter-menu-item company-dropdown">
            <summary className="filter-menu-trigger">
              {selectedLocationCount === 0 ? "Locations" : `Locations: ${selectedLocationCount}`}
            </summary>
            <div className="filter-menu-panel">
              <label className="filter-menu-option" htmlFor="detail-filter-location-all">
                <input
                  id="detail-filter-location-all"
                  type="checkbox"
                  checked={selectedLocationCount === 0}
                  onChange={() => {
                    setSelectedLocationFilterIds([]);
                    setSelectedSubLocationFilterIds([]);
                  }}
                />
                <span>All</span>
              </label>
              {usedLocationFilters.map((location) => (
                <div className="filter-menu-location-group" key={location.id}>
                  <label
                    className="filter-menu-option"
                    htmlFor={`detail-filter-location-${location.id}`}
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
                  {usedSubLocationFilters
                    .filter((subLocation) => subLocation.parentLocationId === location.id)
                    .map((subLocation) => (
                      <label
                        className="filter-menu-option sub-location"
                        htmlFor={`detail-filter-sub-location-${subLocation.id}`}
                        key={subLocation.id}
                      >
                        <input
                          id={`detail-filter-sub-location-${subLocation.id}`}
                          type="checkbox"
                          checked={selectedSubLocationFilterIds.includes(subLocation.id)}
                          onChange={() => toggleSubLocationFilter(subLocation.id)}
                        />
                        <span>{subLocation.name}</span>
                        <span className="filter-count">
                          {detailCountBySubLocationId[subLocation.id] || 0}
                        </span>
                      </label>
                    ))}
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : null}
      {usedCompanies.length > 0 ? (
        <div className="filter-menu-group" aria-label="Filter schedule rows by company">
          <details className="filter-menu-item company-dropdown">
            <summary className="filter-menu-trigger">
              {renderMultiFilterSummary(selectedCompanyFilterIds, "Companies", "Companies")}
            </summary>
            <div className="filter-menu-panel">
              <label className="filter-menu-option" htmlFor="detail-filter-company-all">
                <input
                  id="detail-filter-company-all"
                  type="checkbox"
                  checked={selectedCompanyFilterIds.length === 0}
                  onChange={() => setSelectedCompanyFilterIds([])}
                />
                <span>All</span>
              </label>
              {usedCompanies.map((company) => (
                <label
                  className="filter-menu-option"
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
      <button
        className={[
          "filter-menu-clear",
          hasActiveScheduleFilters ? "" : "is-hidden",
        ].filter(Boolean).join(" ")}
        type="button"
        disabled={!hasActiveScheduleFilters}
        onClick={clearScheduleFilters}
      >
        <CapcomIcon name="close" size={18} weight="bold" />
        <span className="button-label">Clear</span>
      </button>
    </div>
  );
}
