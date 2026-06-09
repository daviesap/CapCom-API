import assert from "node:assert/strict";
import { getSnapshotEventKeyPeople } from "../generateSchedules/generateHomeHandler.mjs";

const keyPeople = [
  {
    company: "Example Supplier",
    CompanySortOrder: 0,
    people: [{ name: "Visible Contact", sortOrder: 0, GDPR: true }],
  },
];

assert.deepEqual(
  getSnapshotEventKeyPeople({ snapshot: { showContacts: true }, keyPeople }),
  keyPeople
);
assert.deepEqual(
  getSnapshotEventKeyPeople({ snapshot: { showContacts: "true" }, keyPeople }),
  keyPeople
);
assert.deepEqual(
  getSnapshotEventKeyPeople({ snapshot: { showContacts: false }, keyPeople }),
  []
);
assert.deepEqual(
  getSnapshotEventKeyPeople({ snapshot: {}, keyPeople }),
  []
);

console.log("snapshot key people tests passed");
