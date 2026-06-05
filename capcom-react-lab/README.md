# CapCom React Lab

This is a separate learning project for understanding a small React, Vite, Firebase Authentication, and Firestore application.

It does not use the existing CapCom frontend or Cloud Functions.

## Data Model

Top-level Firestore collections:

- `events`
- `scheduleDays`
- `scheduleDetails`

Relationships are stored with simple IDs:

- `scheduleDays.eventId` points to an event document.
- `scheduleDetails.scheduleDayId` points to a schedule day document.

## Setup

Create `.env.local` from `.env.example` and fill in your Firebase web app config.

```sh
npm install
npm run dev
```

Then open the local Vite URL.
