# CapCom v2 App

This is the CapCom v2 React, Vite, Firebase Authentication, and Firestore application.

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
- `users.role` is one of `SuperAdmin`, `Admin`, `User`, or `Viewer`.
- `users.clientId` is `null` for `SuperAdmin` users.
- `users.clientId` points to `clients/{clientId}` for `Admin`, `User`, and `Viewer` users.
- `clients/{clientId}` stores client account metadata.
- `events.clientId` points to `clients/{clientId}`.
- `eventAssignments/{eventId}_{userId}` grants assigned event access to `User` and `Viewer` profiles.
- `SuperAdmin` users can read all events and choose the client when creating an event.
- `Admin` users can manage all events for their own `clientId`.
- `User` users can read and edit only events assigned by an `Admin`.
- `Viewer` users can only read events assigned by an `Admin`.
- Admin user management creates Firebase Auth users and matching Firestore `users/{uid}` profiles together through Cloud Function `createAuthUserProfile`.
- Editing existing users still updates the Firestore user profile only.
- New Firebase Auth users receive a Firebase password reset email after creation.
- Existing user profiles have a `Send Reset` action to resend the password reset email.
- Cloud Function `createAuthUserProfile` creates a Firebase Auth user and matching Firestore profile from `email`, `displayName`, `role`, and `clientId`.
- `createAuthUserProfile` allows `SuperAdmin` to create `Admin`, `User`, or `Viewer`, and allows `Admin` to create only `User` or `Viewer` for their own client.

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
  "role": "User",
  "clientId": "acmeClientId",
  "isActive": true,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

Example `eventAssignments/{eventId}_{userId}` document:

```json
{
  "eventId": "eventId",
  "clientId": "acmeClientId",
  "userId": "uid",
  "accessRole": "User",
  "createdAt": "serverTimestamp",
  "createdBy": "adminUid",
  "updatedAt": "serverTimestamp",
  "updatedBy": "adminUid"
}
```

## Setup

Create `.env.local` from `.env.example` and fill in your Firebase web app config.

```sh
npm install
npm run dev
```

Then open the local Vite URL.

## NPM Commands

Run these commands from `CapCom-v2-app/` unless noted otherwise.

### Development

```sh
npm run dev
```

Starts the Vite development server. Service worker app-shell caching is disabled in development, and existing `capcom-v2-app-shell-*` caches are cleared on page load.

```sh
npm run lint
```

Runs ESLint against the app.

### Production

```sh
npm run build
```

Creates a production build in `dist/`. Production builds register the service worker and enable app-shell caching.

```sh
npm run preview
```

Serves the built app locally for a production-style preview.

From the repo root, deploy the CapCom v2 hosting target with:

```sh
npm run deploy:capcomv2
```
