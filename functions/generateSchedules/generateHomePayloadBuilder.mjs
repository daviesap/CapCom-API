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

function formatHeaderFriendlyDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatHeaderDateRange(startDateString, endDateString) {
  if (!startDateString && !endDateString) return "";
  if (!startDateString) return formatHeaderFriendlyDate(endDateString);
  if (!endDateString || startDateString === endDateString) return formatHeaderFriendlyDate(startDateString);
  return `${formatHeaderFriendlyDate(startDateString)} to ${formatHeaderFriendlyDate(endDateString)}`;
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

function normaliseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

function readGdprValue(contact) {
  if (typeof contact?.GDPR === "boolean") return contact.GDPR;
  if (typeof contact?.gdpr === "boolean") return contact.gdpr;
  if (typeof contact?.GDPR === "string") return contact.GDPR.trim().toLowerCase() === "true";
  if (typeof contact?.gdpr === "string") return contact.gdpr.trim().toLowerCase() === "true";
  return true;
}

export function buildKeyPeople({ eventRecord = {}, companies = [], eventContacts = [] }) {
  const companyOrder = Array.isArray(eventRecord.contactCompanyOrder)
    ? eventRecord.contactCompanyOrder.filter(Boolean).map((companyId) => String(companyId))
    : [];
  const orderByCompanyId = new Map(companyOrder.map((companyId, companyIndex) => [companyId, companyIndex]));
  const companiesById = new Map(companies.map((company) => [company.id, company]));

  const orderedCompanies = companies
    .map((company) => ({
      company,
      order: orderByCompanyId.has(company.id)
        ? orderByCompanyId.get(company.id)
        : Number.MAX_SAFE_INTEGER,
    }))
    .sort((companyA, companyB) => {
      if (companyA.order !== companyB.order) return companyA.order - companyB.order;
      return String(companyA.company.companyName || "").localeCompare(
        String(companyB.company.companyName || "")
      );
    });

  const companySortOrderById = new Map(
    orderedCompanies.map(({ company }, companyIndex) => [company.id, companyIndex])
  );
  const visibleContactsByCompanyId = new Map();

  eventContacts
    .filter((contact) => contact?.isHidden !== true)
    .forEach((contact, contactIndex) => {
      const companyId = String(contact.companyId || "");
      if (!companyId || !companiesById.has(companyId)) return;
      const name = normaliseString(contact.name);
      if (!name) return;

      const people = visibleContactsByCompanyId.get(companyId) || [];
      const person = {
        name,
        role: normaliseString(contact.role),
        sortOrder: normaliseNumber(contact.sortOrder, contactIndex),
        GDPR: readGdprValue(contact),
      };
      const phone = normaliseString(contact.phone);
      const email = normaliseString(contact.email);
      if (phone) person.phone = phone;
      if (email) person.email = email;
      people.push(person);
      visibleContactsByCompanyId.set(companyId, people);
    });

  return orderedCompanies
    .map(({ company }) => {
      const people = (visibleContactsByCompanyId.get(company.id) || [])
        .sort((personA, personB) => {
          if (personA.sortOrder !== personB.sortOrder) return personA.sortOrder - personB.sortOrder;
          return String(personA.name || "").localeCompare(String(personB.name || ""));
        });

      if (people.length === 0) return null;
      return {
        company: company.companyName || "",
        CompanySortOrder: companySortOrderById.get(company.id) ?? 0,
        people,
      };
    })
    .filter(Boolean);
}

export function buildKeyInfo(keyInfo = []) {
  return (Array.isArray(keyInfo) ? keyInfo : [])
    .map((item, itemIndex) => ({
      title: normaliseString(item.title),
      text: normaliseString(item.text ?? item.description),
      sortOrder: normaliseNumber(item.sortOrder, itemIndex),
    }))
    .filter((item) => item.title || item.text)
    .sort((itemA, itemB) => {
      if (itemA.sortOrder !== itemB.sortOrder) return itemA.sortOrder - itemB.sortOrder;
      return String(itemA.title || "").localeCompare(String(itemB.title || ""));
    });
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
      showContacts: normaliseBoolean(view.showContacts ?? view.includeContacts, false),
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
  eventContacts = [],
  keyInfo = [],
  callerUid,
  callerEmail,
  previousData,
}) {
  const header = [
    normaliseString(eventRecord.name),
    normaliseString(eventRecord.venue),
    formatHeaderDateRange(
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
      showMomContacts: normaliseBoolean(eventRecord.showMomContacts, false),
      keyInfo: buildKeyInfo(keyInfo),
      keyPeople: buildKeyPeople({ eventRecord, companies, eventContacts }),
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
