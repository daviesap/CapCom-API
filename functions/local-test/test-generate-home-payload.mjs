import assert from "node:assert/strict";
import { buildGenerateHomePayload } from "../generateSchedules/generateHomePayloadBuilder.mjs";

const payload = buildGenerateHomePayload({
  apiKey: "test-key",
  callerUid: "user-1",
  callerEmail: "planner@example.com",
  eventRecord: {
    id: "event-1",
    profileId: "profile-1",
    name: "Example Event",
    clientName: "Example Client",
    imageUrl: "https://example.com/logo.png",
    startDate: "2026-06-22",
    endDate: "2026-06-26",
  },
  scheduleDays: [
    {
      id: "day-1",
      date: "2026-06-22",
      summary: "Live Day 1",
      endOfDayTarget: "Closedown complete",
    },
  ],
  scheduleDetails: [
    {
      id: "detail-1",
      scheduleDayId: "day-1",
      time: "09:00",
      description: "Doors open",
      tagId: "tag-1",
      locationId: "location-child",
      companyIds: ["company-1"],
    },
  ],
  tags: [{ id: "tag-1", name: "Public" }],
  locations: [
    { id: "location-parent", name: "Main Hall", parentLocationId: "" },
    { id: "location-child", name: "Stage", parentLocationId: "location-parent" },
  ],
  trucks: [
    {
      id: "truck-1",
      truckNumber: "01",
      companyId: "company-1",
      size: "26T",
      driverName: "Alex",
      contents: "Production",
    },
  ],
  filteredViews: [
    {
      name: "Full schedule",
      groupPresetId: "preset-1",
      filterTagIds: ["tag-1"],
      filterLocationIds: ["location-parent"],
      filterSubLocationIds: ["location-child"],
      filterSupplierIds: ["company-1"],
      group: "Full schedule",
      sortOrder: 1,
    },
  ],
  companies: [{ id: "company-1", companyName: "Example Supplier" }],
});

assert.equal(payload.api_key, "test-key");
assert.equal(payload.event.eventId, "event-1");
assert.equal(payload.event.profileId, "profile-1");
assert.equal(payload.data.scheduleDetail.length, 1);
assert.equal(payload.data.scheduleDetail[0].time, "09:00 - ");
assert.deepEqual(payload.data.scheduleDetail[0].tagIds, ["tag-1"]);
assert.deepEqual(payload.data.scheduleDetail[0].locationIds, ["location-parent"]);
assert.deepEqual(payload.data.scheduleDetail[0].subLocationIds, ["location-child"]);
assert.equal(payload.groupMeta.scheduleDetail[0].data.above, "Live Day 1");
assert.equal(payload.groupMeta.trucks[0].truckId, "truck-1");
assert.equal(payload.snapshots.length, 1);
assert.equal(payload.snapshots[0].name, "Full schedule");
assert.deepEqual(payload.snapshots[0].filterSupplierIds, ["company-1"]);

console.log("generateHome payload builder tests passed");
