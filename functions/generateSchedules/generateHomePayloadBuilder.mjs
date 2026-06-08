function formatLongFriendlyDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatEventDateRange(startDateString, endDateString) {
  if (!startDateString && !endDateString) return "";
  if (!startDateString) return formatLongFriendlyDate(endDateString);
  if (!endDateString || startDateString === endDateString) return formatLongFriendlyDate(startDateString);
  return `${formatLongFriendlyDate(startDateString)} to ${formatLongFriendlyDate(endDateString)}`;
}

function toApiDetailTime(value) {
  const nextTime = String(value || "").trim();
  if (!nextTime) return " - ";
  if (nextTime.includes("-")) return nextTime;
  return `${nextTime} - `;
}

function normaliseString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normaliseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (normalised === "true") return true;
    if (normalised === "false") return false;
  }
  return fallback;
}

function normaliseSortOrder(value, fallback = 1) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getArrayValue(primary, fallback) {
  if (Array.isArray(primary)) return primary.filter(Boolean).map((value) => String(value));
  if (typeof primary === "string") {
    return primary.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  if (Array.isArray(fallback)) return fallback.filter(Boolean).map((value) => String(value));
  if (typeof fallback === "string") {
    return fallback.split(",").map((entry) => entry.trim()).filter(Boolean);
  }
  return [];
}

function buildScheduleDetailRows({ scheduleDays, scheduleDetails, tags, locations, companies }) {
  const dayById = new Map(scheduleDays.map((day) => [day.id, day]));
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const locationById = new Map(locations.map((location) => [location.id, location]));
  const companyById = new Map(companies.map((company) => [company.id, company]));

  return scheduleDetails.map((detail) => {
    const day = dayById.get(detail.scheduleDayId);
    const detailDate = day?.date || "";
    const detailTime = toApiDetailTime(detail.time);
    const tagIds = Array.from(new Set(getArrayValue(detail.tagIds, detail.tagId)));
    const companyIds = Array.from(new Set(getArrayValue(detail.companyIds, detail.supplierId)));
    const locationId = normaliseString(detail.locationId)
      || getArrayValue(detail.locationIds)[0]
      || "";
    const location = locationId ? locationById.get(locationId) : null;
    const parentLocation = location?.parentLocationId
      ? locationById.get(location.parentLocationId)
      : null;
    const topLocationId = parentLocation?.id || location?.id || "";
    const locationName = parentLocation?.name || location?.name || "";
    const subLocationIds = parentLocation && locationId ? [locationId] : [];

    return {
      entryId: detail.id || "",
      date: detailDate,
      dateFriendly: formatLongFriendlyDate(detailDate),
      time: detailTime,
      description: detail.description || "",
      notes: detail.notes || "",
      tags: tagIds.map((tagId) => tagById.get(tagId)?.name).filter(Boolean),
      tagIds,
      supplier: companyIds.map((companyId) => companyById.get(companyId)?.companyName).filter(Boolean),
      ...(companyIds.length > 0 ? { supplierId: companyIds.join(",") } : {}),
      ...(topLocationId ? { locationIds: [topLocationId] } : {}),
      ...(subLocationIds.length > 0 ? { subLocationIds } : {}),
      ...(locationName ? { locations: [locationName] } : {}),
      ...(detail.truckId ? { truckId: detail.truckId } : {}),
      sortField: `${detailDate.replace(/-/g, "")}/${detailTime}/${detail.description || ""}`,
    };
  });
}

function buildScheduleDayMeta(scheduleDays) {
  return scheduleDays.map((day) => ({
    date: day.date || "",
    data: {
      title: formatLongFriendlyDate(day.date),
      ...(day.summary ? { above: day.summary } : {}),
      ...(day.endOfDayTarget ? { below: day.endOfDayTarget } : {}),
    },
  }));
}

function buildTruckMeta({ trucks, companies }) {
  const companyById = new Map(companies.map((company) => [company.id, company]));
  return trucks.map((truck) => {
    const companyName = truck.companyName || companyById.get(truck.companyId)?.companyName || "";
    const title = truck.truckNumber
      ? `Truck ${truck.truckNumber}`
      : truck.contents || truck.id;
    const aboveParts = [
      companyName ? `Trucking Company = ${companyName}` : "",
      truck.size ? `Size = ${truck.size}` : "",
      truck.driverName ? `Driver = ${truck.driverName}` : "",
      truck.contents ? `Contents = ${truck.contents}` : "",
    ].filter(Boolean);

    return {
      truckId: truck.id,
      data: {
        title,
        ...(aboveParts.length > 0 ? { above: aboveParts.join(", ") } : {}),
        ...(companyName ? { truckingCompany: truck.companyId || "" } : {}),
      },
    };
  });
}

function buildFilteredViewSnapshots(filteredViews) {
  return filteredViews.map((view) => {
    const name = normaliseString(view.name);
    return {
      name,
      filterBox: normaliseBoolean(view.filterBox, true),
      showKeyInfo: normaliseBoolean(view.showKeyInfo, true),
      showLocations: normaliseBoolean(view.showLocations, false),
      groupPresetId: normaliseString(view.groupPresetId),
      filterTagIds: getArrayValue(view.filterTagIds, view.tagIds),
      filterLocationIds: getArrayValue(view.filterLocationIds, view.locationIds),
      filterSubLocationIds: getArrayValue(view.filterSubLocationIds, view.subLocationIds),
      filterSupplierIds: getArrayValue(view.filterSupplierIds, view.companyIds),
      filterGroup: normaliseString(view.filterGroup),
      group: normaliseString(view.group || name),
      sortOrder: normaliseSortOrder(view.sortOrder, 1),
    };
  });
}

export function buildGenerateHomePayload({
  apiKey,
  eventRecord,
  scheduleDays,
  scheduleDetails,
  tags,
  locations,
  trucks,
  filteredViews,
  companies,
  callerUid,
  callerEmail,
  previousData,
}) {
  const header = [
    eventRecord.name || "",
    formatEventDateRange(
      eventRecord.startDate || eventRecord.scheduleStartDate,
      eventRecord.endDate || eventRecord.scheduleEndDate
    ),
  ].filter(Boolean);

  return {
    api_key: apiKey,
    event: {
      eventId: eventRecord.id,
      profileId: eventRecord.profileId || "",
      name: eventRecord.name || "",
      logoUrl: eventRecord.imageUrl || eventRecord.logoUrl || "",
      header,
      locations: locations
        .filter((location) => !location.parentLocationId)
        .map((location) => ({ name: location.name || "" }))
        .filter((location) => location.name),
    },
    debug: false,
    UserId: callerUid || "",
    userEmail: callerEmail || "",
    glideAppName: eventRecord.clientName || eventRecord.name || "CapCom",
    groupMeta: {
      scheduleDetail: buildScheduleDayMeta(scheduleDays),
      trucks: buildTruckMeta({ trucks, companies }),
    },
    snapshots: buildFilteredViewSnapshots(filteredViews),
    ...(previousData ? { previousData } : {}),
    data: {
      scheduleDetail: buildScheduleDetailRows({
        scheduleDays,
        scheduleDetails,
        tags,
        locations,
        companies,
      }),
    },
  };
}
