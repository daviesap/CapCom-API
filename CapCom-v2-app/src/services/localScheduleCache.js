const CACHE_KEY = "capcom-v2-schedule-cache";

const emptyCache = {
  events: [],
  eventById: {},
  daysByEventId: {},
  detailsByDayId: {},
  tagsByEventId: {},
  locationsByEventId: {},
  trucksByEventId: {},
  truckSizesByEventId: {},
  filteredViewsByEventId: {},
  keyInfoByEventId: {},
  companiesByClientId: {},
  updatedAtByScope: {},
};

let memoryCache = null;

function normaliseCache(parsedCache = {}) {
  return {
    ...emptyCache,
    ...parsedCache,
    eventById: parsedCache.eventById || {},
    daysByEventId: parsedCache.daysByEventId || {},
    detailsByDayId: parsedCache.detailsByDayId || {},
    tagsByEventId: parsedCache.tagsByEventId || {},
    locationsByEventId: parsedCache.locationsByEventId || {},
    trucksByEventId: parsedCache.trucksByEventId || {},
    truckSizesByEventId: parsedCache.truckSizesByEventId || {},
    filteredViewsByEventId: parsedCache.filteredViewsByEventId || {},
    keyInfoByEventId: parsedCache.keyInfoByEventId || {},
    companiesByClientId: parsedCache.companiesByClientId || {},
    updatedAtByScope: parsedCache.updatedAtByScope || {},
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readCache() {
  if (memoryCache) return memoryCache;
  if (!canUseStorage()) {
    memoryCache = normaliseCache();
    return memoryCache;
  }

  try {
    const parsedCache = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
    memoryCache = normaliseCache(parsedCache);
    return memoryCache;
  } catch (cacheError) {
    console.warn("Could not read schedule cache.", cacheError);
    memoryCache = normaliseCache();
    return memoryCache;
  }
}

function writeCache(cache) {
  memoryCache = normaliseCache(cache);
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
    window.dispatchEvent(new CustomEvent("schedule-cache-updated"));
  } catch (cacheError) {
    console.warn("Could not write schedule cache.", cacheError);
  }
}

function touch(cache, scope) {
  cache.updatedAtByScope[scope] = new Date().toISOString();
}

export function cacheEvents(events) {
  const cache = readCache();
  cache.events = events;
  events.forEach((event) => {
    cache.eventById[event.id] = event;
  });
  touch(cache, "events");
  writeCache(cache);
}

export function getCachedEvents() {
  return readCache().events || [];
}

export function cacheEvent(event) {
  if (!event?.id) return;
  const cache = readCache();
  cache.eventById[event.id] = event;
  touch(cache, `event:${event.id}`);
  writeCache(cache);
}

export function getCachedEvent(eventId) {
  return readCache().eventById[eventId] || null;
}

export function cacheScheduleDays(eventId, days) {
  const cache = readCache();
  cache.daysByEventId[eventId] = days;
  touch(cache, `days:${eventId}`);
  writeCache(cache);
}

export function getCachedScheduleDays(eventId) {
  return readCache().daysByEventId[eventId] || [];
}

export function cacheScheduleDetails(scheduleDayId, details) {
  const cache = readCache();
  cache.detailsByDayId[scheduleDayId] = details;
  touch(cache, `details:${scheduleDayId}`);
  writeCache(cache);
}

export function getCachedScheduleDetails(scheduleDayId) {
  return readCache().detailsByDayId[scheduleDayId] || [];
}

export function cacheTags(eventId, tags) {
  const cache = readCache();
  cache.tagsByEventId[eventId] = tags;
  touch(cache, `tags:${eventId}`);
  writeCache(cache);
}

export function getCachedTags(eventId) {
  return readCache().tagsByEventId[eventId] || [];
}

export function cacheLocations(eventId, locations) {
  const cache = readCache();
  cache.locationsByEventId[eventId] = locations;
  touch(cache, `locations:${eventId}`);
  writeCache(cache);
}

export function getCachedLocations(eventId) {
  return readCache().locationsByEventId[eventId] || [];
}

export function cacheTrucks(eventId, trucks) {
  const cache = readCache();
  cache.trucksByEventId[eventId] = trucks;
  touch(cache, `trucks:${eventId}`);
  writeCache(cache);
}

export function getCachedTrucks(eventId) {
  return readCache().trucksByEventId[eventId] || [];
}

export function cacheTruckSizes(eventId, truckSizes) {
  const cache = readCache();
  cache.truckSizesByEventId[eventId] = truckSizes;
  touch(cache, `truckSizes:${eventId}`);
  writeCache(cache);
}

export function getCachedTruckSizes(eventId) {
  return readCache().truckSizesByEventId[eventId] || [];
}

export function cacheFilteredViews(eventId, filteredViews) {
  const cache = readCache();
  cache.filteredViewsByEventId[eventId] = filteredViews;
  touch(cache, `filteredViews:${eventId}`);
  writeCache(cache);
}

export function getCachedFilteredViews(eventId) {
  return readCache().filteredViewsByEventId[eventId] || [];
}

export function cacheKeyInfo(eventId, keyInfo) {
  const cache = readCache();
  cache.keyInfoByEventId[eventId] = keyInfo;
  touch(cache, `keyInfo:${eventId}`);
  writeCache(cache);
}

export function getCachedKeyInfo(eventId) {
  return readCache().keyInfoByEventId[eventId] || [];
}

export function cacheCompanies(clientId, companies) {
  const cache = readCache();
  cache.companiesByClientId[clientId] = companies;
  touch(cache, `companies:${clientId}`);
  writeCache(cache);
}

export function getCachedCompanies(clientId) {
  return readCache().companiesByClientId[clientId] || [];
}

export function getScheduleLastUpdated(eventId) {
  const cache = readCache();
  const timestamps = [
    cache.updatedAtByScope.events,
    cache.updatedAtByScope[`event:${eventId}`],
    cache.updatedAtByScope[`days:${eventId}`],
    cache.updatedAtByScope[`tags:${eventId}`],
    cache.updatedAtByScope[`locations:${eventId}`],
    cache.updatedAtByScope[`trucks:${eventId}`],
    cache.updatedAtByScope[`truckSizes:${eventId}`],
    cache.updatedAtByScope[`filteredViews:${eventId}`],
    cache.updatedAtByScope[`keyInfo:${eventId}`],
  ].filter(Boolean);

  (cache.daysByEventId[eventId] || []).forEach((day) => {
    const detailTimestamp = cache.updatedAtByScope[`details:${day.id}`];
    if (detailTimestamp) timestamps.push(detailTimestamp);
  });

  if (timestamps.length === 0) return "";
  return timestamps.sort().at(-1);
}

export function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function assertOnline() {
  if (isBrowserOffline()) {
    throw new Error("Editing is disabled while offline.");
  }
}
