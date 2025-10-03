/*
 * functions/utils/prettyDate.mjs
 * -------------------------------
 * Date formatting helpers used across the functions codebase.
 * Provides a few lightweight, locale-aware helpers for rendering human-friendly dates.
 * No external dependencies.
 */

// NOTE: formatPrettyDate may be unused; keep until callers are audited.
export function formatPrettyDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}


/**
 * Convert an ISO date string into a friendly, human-readable format.
 * Example: "2025-05-15T00:00:00.000Z" → "Thursday, 15 May 2025"
 *
 * Note: Always treated as UTC to avoid timezone shifts.
 */
export function formatFriendlyDateUTC(isoDateString) {
  if (!isoDateString) return "";

  const d = new Date(isoDateString);
  if (isNaN(d.getTime())) return isoDateString; // fallback if invalid

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(d);
}

export function formatFriendlyDateTime(d = new Date()) {
  return d.toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,          // ✅ gives “12.29 pm” not “0.29 pm”
    timeZone: "Europe/London",
  });
}