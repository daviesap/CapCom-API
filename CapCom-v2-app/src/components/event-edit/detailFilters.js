export function filterDetailRows(details, filters) {
  const {
    selectedTagFilterIds,
    locationById,
    selectedLocationFilterIds,
    selectedSubLocationFilterIds,
    selectedCompanyFilterIds,
  } = filters;

  return details.filter((detail) => {
    const matchesTag = selectedTagFilterIds.length === 0 || selectedTagFilterIds.includes(detail.tagId);
    const detailLocation = detail.locationId
      ? locationById.get(detail.locationId)
      : null;
    const detailTopLocationId = detailLocation?.parentLocationId || detailLocation?.id || "";
    const hasLocationFilters =
      selectedLocationFilterIds.length > 0 || selectedSubLocationFilterIds.length > 0;
    const matchesLocation =
      !hasLocationFilters ||
      selectedLocationFilterIds.includes(detailTopLocationId) ||
      selectedSubLocationFilterIds.includes(detail.locationId);
    const matchesCompany =
      selectedCompanyFilterIds.length === 0 ||
      selectedCompanyFilterIds.some((companyId) =>
        (detail.companyIds || []).includes(companyId)
      );

    return matchesTag && matchesLocation && matchesCompany;
  });
}
