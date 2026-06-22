import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateHtmlString } from "../generateSchedules/generateHtml.mjs";

const functionsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(functionsDir);

const { htmlString } = await generateHtmlString({
  event: {
    header: ["Example Event"],
  },
  document: {
    filename: "Full schedule",
  },
  columns: [
    { field: "time", label: "Time", width: 75, showLabel: true },
    { field: "tags", label: "Tags", width: 100, showLabel: true, filterable: true },
  ],
  groups: [
    {
      title: "Day 1",
      entries: [
        {
          fields: {
            time: "09:00",
            tags: "Crew",
          },
        },
      ],
    },
  ],
  snapshots: [
    {
      name: "Full schedule",
      filterBox: true,
    },
  ],
});

assert.match(htmlString, /<details class="filters-accordion" data-filters-container>/);
assert.doesNotMatch(htmlString, /<details class="filters-accordion" data-filters-container open>/);
assert.match(htmlString, /data-filters-summary-label>Show filters<\/span>/);

console.log("generateHtml filter accordion tests passed");
