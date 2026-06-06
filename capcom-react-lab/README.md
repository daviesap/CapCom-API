# CapCom React Lab

This is a separate learning project for understanding a small React, Vite, Firebase Authentication, and Firestore application.

It does not use the existing CapCom frontend or Cloud Functions.

## Data Model

Top-level Firestore collections:

- `clients`
- `events`
- `scheduleDays`
- `scheduleDetails`
- `users`

Relationships are stored with simple IDs:

- `scheduleDays.eventId` points to an event document.
- `scheduleDetails.scheduleDayId` points to a schedule day document.

Planned access model:

- `users/{uid}` is keyed by the Firebase Authentication user UID.
- `users.role` is one of `SuperAdmin`, `ClientAdmin`, or `ClientUser`.
- `users.clientId` is `null` for `SuperAdmin` users.
- `users.clientId` points to `clients/{clientId}` for `ClientAdmin` and `ClientUser` users.
- `clients/{clientId}` stores client account metadata.
- `events.clientId` points to `clients/{clientId}`.
- `SuperAdmin` users can read all events and choose the client when creating an event.
- `ClientAdmin` and `ClientUser` users read only events for their own `clientId`.
- `ClientAdmin` users create events under their own `clientId`; `ClientUser` users cannot create events.

Example `clients/{clientId}` document:

```json
{
  "clientName": "Acme Events",
  "clientSlug": "acme",
  "logoUrl": "",
  "primaryColour": "",
  "secondaryColour": "",
  "createdAt": "serverTimestamp",
  "createdBy": "uid",
  "updatedAt": "serverTimestamp",
  "isActive": true
}
```

Example `users/{uid}` document for a site-wide admin:

```json
{
  "email": "andrew@example.com",
  "displayName": "Andrew Davies",
  "role": "SuperAdmin",
  "clientId": null,
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Example `users/{uid}` document for a client user:

```json
{
  "email": "user@acme.com",
  "displayName": "Jane Smith",
  "role": "ClientUser",
  "clientId": "acmeClientId",
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

## Setup

Create `.env.local` from `.env.example` and fill in your Firebase web app config.

```sh
npm install
npm run dev
```

Then open the local Vite URL.
