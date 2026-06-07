const CACHE_KEY = "capcom-v2-schedule-cache";

const emptyCache = {
  events: [],
  eventById: {},
  daysByEventId: {},
  detailsByDayId: {},
  tagsByEventId: {},
  locationsByEventId: {},
  trucksByEventId: {},
  updatedAtByScope: {},
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readCache() {
  if (!canUseStorage()) return emptyCache;

  try {
    const parsedCache = JSON.parse(window.localStorage.getItem(CACHE_KEY) || "{}");
    return {
      ...emptyCache,
      ...parsedCache,
      eventById: parsedCache.eventById || {},
      daysByEventId: parsedCache.daysByEventId || {},
      detailsByDayId: parsedCache.detailsByDayId || {},
      tagsByEventId: parsedCache.tagsByEventId || {},
      locationsByEventId: parsedCache.locationsByEventId || {},
      trucksByEventId: parsedCache.trucksByEventId || {},
      updatedAtByScope: parsedCache.updatedAtByScope || {},
    };
  } catch (cacheError) {
    console.warn("Could not read schedule cache.", cacheError);
    return emptyCache;
  }
}

function writeCache(cache) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
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

export function getScheduleLastUpdated(eventId) {
  const cache = readCache();
  const timestamps = [
    cache.updatedAtByScope.events,
    cache.updatedAtByScope[`event:${eventId}`],
    cache.updatedAtByScope[`days:${eventId}`],
    cache.updatedAtByScope[`tags:${eventId}`],
    cache.updatedAtByScope[`locations:${eventId}`],
    cache.updatedAtByScope[`trucks:${eventId}`],
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
