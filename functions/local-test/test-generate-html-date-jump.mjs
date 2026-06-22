import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateHtmlString } from "../generateSchedules/generateHtml.mjs";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(functionsDir);

const baseInput = {
  event: {
    header: ["Example Event"],
  },
  document: {
    filename: "Full schedule",
  },
  columns: [
    { field: "time", label: "Time", width: 75, showLabel: true },
    { field: "description", label: "Description", width: 250, showLabel: true },
  ],
  snapshots: [
    {
      name: "Full schedule",
      filterBox: true,
    },
  ],
};

const { htmlString: dateGroupedHtml } = await generateHtmlString({
  ...baseInput,
  groupBy: "date",
  groups: [
    {
      rawKey: "Monday, 1 June 2026",
      rawKeyCanonical: "2026-06-01",
      title: "Monday, 1 June 2026",
      entries: [
        {
          fields: {
            time: "09:00",
            description: "Past item",
          },
        },
      ],
    },
    {
      rawKey: "Tuesday, 23 June 2026",
      rawKeyCanonical: "2026-06-23",
      title: "Tuesday, 23 June 2026",
      metadata: "Live day",
      entries: [
        {
          fields: {
            time: "10:00",
            description: "Current item",
          },
        },
      ],
    },
    {
      rawKey: "Wednesday, 24 June 2026",
      rawKeyCanonical: "2026-06-24",
      title: "Wednesday, 24 June 2026",
      metadata: "Load in\nShow ready",
      entries: [
        {
          fields: {
            time: "11:00",
            description: "Future item",
          },
        },
      ],
    },
  ],
});

assert.match(dateGroupedHtml, /<details class="date-jump-nav date-jump-nav-collapsed" data-date-jump-nav>/);
assert.doesNotMatch(dateGroupedHtml, /<details class="date-jump-nav date-jump-nav-collapsed" data-date-jump-nav open>/);
assert.match(dateGroupedHtml, /<span class="date-jump-summary-icon" aria-hidden="true">/);
assert.match(dateGroupedHtml, /data-date-jump-summary-label>Jump to date<\/span>/);
assert.match(dateGroupedHtml, /<a class="date-jump-link" href="#day-2026-06-01" data-date="2026-06-01">Monday, 1 June 2026<\/a>/);
assert.match(dateGroupedHtml, /<a class="date-jump-link" href="#day-2026-06-23" data-date="2026-06-23">Tuesday, 23 June 2026 - Live day<\/a>/);
assert.match(dateGroupedHtml, /<a class="date-jump-link" href="#day-2026-06-24" data-date="2026-06-24">Wednesday, 24 June 2026 - Load in Show ready<\/a>/);
assert.match(dateGroupedHtml, /<section class="group" id="day-2026-06-01" data-date-group="2026-06-01">/);
assert.match(dateGroupedHtml, /<section class="group" id="day-2026-06-23" data-date-group="2026-06-23">/);
assert.match(dateGroupedHtml, /<section class="group" id="day-2026-06-24" data-date-group="2026-06-24">/);
assert.match(dateGroupedHtml, /String\(now\.getMonth\(\) \+ 1\)\.padStart\(2, '0'\)/);
assert.match(dateGroupedHtml, /link\.hidden = !isVisible;/);
assert.match(dateGroupedHtml, /nav\.hidden = visibleCount === 0;/);
assert.match(dateGroupedHtml, /labelEl\.textContent = 'Jump to date';/);
assert.match(dateGroupedHtml, /<details class="filters-accordion" data-filters-container>/);
assert.match(dateGroupedHtml, /filtersContainer\.offsetHeight/);
assert.match(dateGroupedHtml, /--date-jump-sticky-top/);
assert.match(dateGroupedHtml, /\.date-jump-nav \{\n {2}position: sticky;/);
assert.match(dateGroupedHtml, /max-width: 960px;/);
assert.ok(
  dateGroupedHtml.indexOf('data-filters-container') < dateGroupedHtml.indexOf('data-date-jump-nav'),
  "filters should render before date jump nav"
);

const { htmlString: nonDateGroupedHtml } = await generateHtmlString({
  ...baseInput,
  groupBy: "truckId",
  groups: [
    {
      rawKey: "truck-1",
      rawKeyCanonical: "2026-06-23",
      title: "Truck 1",
      entries: [
        {
          fields: {
            time: "10:00",
            description: "Truck item",
          },
        },
      ],
    },
  ],
});

assert.doesNotMatch(nonDateGroupedHtml, /<details class="date-jump-nav/);
assert.doesNotMatch(nonDateGroupedHtml, /<a class="date-jump-link"/);
assert.doesNotMatch(nonDateGroupedHtml, /id="day-2026-06-23"/);
assert.doesNotMatch(nonDateGroupedHtml, /data-date-group="2026-06-23"/);

console.log("generateHtml date jump tests passed");
