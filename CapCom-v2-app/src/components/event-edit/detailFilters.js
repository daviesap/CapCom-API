export function filterDetailRows(details, filters) {
  const {
    selectedTagFilterId,
    locationById,
    selectedLocationFilterIds,
    selectedSubLocationFilterIds,
    selectedCompanyFilterIds,
  } = filters;

  return details.filter((detail) => {
    const matchesTag = !selectedTagFilterId || detail.tagId === selectedTagFilterId;
    const detailLocation = detail.locationId
      ? locationById.get(detail.locationId)
      : null;
    const detailTopLocationId = detailLocation?.parentLocationId || detailLocation?.id || "";
    const matchesLocation =
      selectedLocationFilterIds.length === 0 ||
      selectedLocationFilterIds.includes(detailTopLocationId);
    const matchesSubLocation =
      selectedSubLocationFilterIds.length === 0 ||
      selectedSubLocationFilterIds.includes(detail.locationId);
    const matchesCompany =
      selectedCompanyFilterIds.length === 0 ||
      selectedCompanyFilterIds.some((companyId) =>
        (detail.companyIds || []).includes(companyId)
      );

    return matchesTag && matchesLocation && matchesSubLocation && matchesCompany;
  });
}
