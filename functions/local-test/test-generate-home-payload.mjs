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
    venue: "Example Venue",
    clientName: "Example Client",
    imageUrl: "https://example.com/logo.png",
    startDate: "2026-06-22",
    endDate: "2026-06-26",
    contactCompanyOrder: ["company-2", "company-1"],
    showMomContacts: true,
    showMomKeyInfo: true,
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
      id: "filtered-view-1",
      name: "Full schedule",
      groupPresetId: "preset-1",
      filterTagIds: ["tag-1"],
      filterLocationIds: ["location-parent"],
      filterSubLocationIds: ["location-child"],
      filterSupplierIds: ["company-1"],
      showContacts: true,
      group: "Full schedule",
      sortOrder: 1,
    },
    {
      id: "filtered-view-2",
      name: "No contacts",
      groupPresetId: "preset-1",
      showContacts: false,
      group: "Full schedule",
      sortOrder: 2,
    },
  ],
  companies: [
    { id: "company-1", companyName: "Example Supplier" },
    { id: "company-2", companyName: "Agency Partner" },
  ],
  eventContacts: [
    {
      id: "contact-1",
      companyId: "company-1",
      name: "Visible Contact",
      role: "Producer",
      phone: "+44 7000 000001",
      email: "visible@example.com",
      sortOrder: -2,
      isHidden: false,
    },
    {
      id: "contact-2",
      companyId: "company-1",
      name: "Hidden Contact",
      role: "Hidden",
      sortOrder: -3,
      isHidden: true,
    },
    {
      id: "contact-3",
      companyId: "company-2",
      name: "GDPR Contact",
      role: "Director",
      sortOrder: 1,
      gdpr: false,
      isHidden: false,
    },
  ],
  keyInfo: [
    {
      id: "key-info-2",
      title: "Crew catering location",
      description: "\"The Cave\" at Grand Wailea.",
      sortOrder: 2,
    },
    {
      id: "key-info-1",
      title: "Venue websites",
      description: "Grand Wailea - [https://www.grandwailea.com](https://www.grandwailea.com)",
      sortOrder: 1,
    },
  ],
});

assert.equal(payload.api_key, "test-key");
assert.equal(Object.prototype.hasOwnProperty.call(payload, "allowedEmails"), false);
assert.equal(payload.event.eventId, "event-1");
assert.equal(payload.event.profileId, "profile-1");
assert.deepEqual(payload.event.header, [
  "Example Event",
  "Example Venue",
  "22 June 2026 to 26 June 2026",
]);
assert.equal(payload.event.showMomContacts, true);
assert.equal(payload.event.showMomKeyInfo, true);
assert.deepEqual(payload.event.keyInfo, [
  {
    title: "Venue websites",
    text: "Grand Wailea - [https://www.grandwailea.com](https://www.grandwailea.com)",
    sortOrder: 1,
  },
  {
    title: "Crew catering location",
    text: "\"The Cave\" at Grand Wailea.",
    sortOrder: 2,
  },
]);
assert.deepEqual(payload.event.keyPeople, [
  {
    company: "Agency Partner",
    CompanySortOrder: 0,
    people: [
      {
        name: "GDPR Contact",
        role: "Director",
        sortOrder: 1,
        GDPR: false,
      },
    ],
  },
  {
    company: "Example Supplier",
    CompanySortOrder: 1,
    people: [
      {
        name: "Visible Contact",
        role: "Producer",
        sortOrder: -2,
        GDPR: true,
        phone: "+44 7000 000001",
        email: "visible@example.com",
      },
    ],
  },
]);
assert.equal(payload.data.scheduleDetail.length, 1);
assert.equal(payload.data.scheduleDetail[0].time, "09:00 - ");
assert.deepEqual(payload.data.scheduleDetail[0].tagIds, ["tag-1"]);
assert.deepEqual(payload.data.scheduleDetail[0].locationIds, ["location-parent"]);
assert.deepEqual(payload.data.scheduleDetail[0].subLocationIds, ["location-child"]);
assert.equal(payload.groupMeta.scheduleDetail[0].data.above, "Live Day 1");
assert.equal(payload.groupMeta.trucks[0].truckId, "truck-1");
assert.equal(payload.snapshots.length, 2);
assert.equal(payload.snapshots[0].snapshotId, "filtered-view-1");
assert.equal(payload.snapshots[0].name, "Full schedule");
assert.deepEqual(payload.snapshots[0].filterSupplierIds, ["company-1"]);
assert.equal(payload.snapshots[0].showContacts, true);
assert.equal(payload.snapshots[1].snapshotId, "filtered-view-2");
assert.equal(payload.snapshots[1].showContacts, false);

console.log("generateHome payload builder tests passed");
