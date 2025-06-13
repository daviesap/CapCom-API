// utils/timestamp.mjs

export function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export function getFormattedTimestamp(timeZone = 'Europe/London') {
  const now = new Date();
  const options = {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  const formatter = new Intl.DateTimeFormat('en-GB', options);
  const parts = formatter.formatToParts(now);

  const partMap = {};
  for (const { type, value } of parts) {
    partMap[type] = value;
  }

  const day = parseInt(partMap.day);
  const suffix = getOrdinalSuffix(day);
  const time = `${partMap.hour}.${partMap.minute}${partMap.dayPeriod.toLowerCase()}`;

  return `${partMap.weekday} ${day}${suffix} ${partMap.month} ${partMap.year} at ${time}`;
}
