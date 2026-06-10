# AGENTS.md

# CapCom

CapCom is an operational event management platform used by event managers, suppliers, crew, clients and stakeholders.

The goal is to provide accurate event information quickly, clearly and reliably.

CapCom is a product, not a technology experiment.

Technology is a tool.

The objective is to create customer value, not technical novelty.

---

# Current Status

CapCom v2 is feature complete.

Core functionality already exists, including:

- Multi-tenant architecture
- Firebase Authentication
- Firestore security rules
- Event management
- Companies management
- PWA support
- Mobile-first interface

Current priorities:

1. Reliability
2. Testing
3. Performance
4. User experience
5. Operational polish

Avoid proposing major rewrites unless specifically requested.

---

# Architecture

Frontend:

- React
- Vite

Backend:

- Firebase

Services:

- Firestore
- Firebase Authentication
- Cloud Functions
- Cloud Storage
- Firebase Hosting

---

# Technical Philosophy

Prefer:

- React for presentation and UI
- Firestore for storage
- Cloud Functions for business logic
- Cloud Storage for generated files
- Firebase Authentication for authentication

When in doubt:

- Display logic belongs in React.
- Business-critical logic belongs in Cloud Functions.
- Security-sensitive logic belongs in Cloud Functions.

---

# Multi-Tenant Requirements

CapCom is multi-tenant.

Every document belongs to a client.

Users must only access data belonging to their assigned client.

Never introduce solutions that could expose data between clients.

Security is more important than convenience.

Before making changes consider:

- Tenant isolation
- Firestore security rules
- Query efficiency
- Scalability

# Performance Principles

CapCom is used during live events.

Performance matters.

Prefer:

- Efficient Firestore queries
- Minimal reads
- Caching where appropriate
- Reusable data-fetching patterns

Avoid:

- Duplicate queries
- Unnecessary reads
- Loading entire collections when targeted queries are possible

When proposing changes, consider Firestore cost implications.

---

# User Experience Principles

CapCom is an operational tool.

Users often need answers to questions such as:

- What time is crew call?
- Which truck arrives next?
- Who is responsible?
- What hotel is booked?
- Where is the supplier contact?

Prioritise:

- Clarity
- Speed
- Reliability
- Legibility
- Predictability

Visual polish should never reduce usability.

---

# Styling

CapCom should feel:

- Professional
- Operational
- Reliable
- Mobile-first

Avoid:

- Heavy shadows
- Excessive animations
- Glassmorphism
- Decorative effects
- Trend-driven UI patterns

Prefer:

- Strong hierarchy
- Consistent spacing
- Clear typography
- Clear touch targets
- Subtle branding

---

# Branding

Client branding will eventually be supplied from Firestore.

Expected fields:

- logoUrl
- primaryColour
- secondaryColour

Use client branding as accents only.

Maintain consistent background and text colours for readability.

---

# Responsive Design

CapCom must provide an excellent experience on both desktop and mobile.

Users typically work in two modes:

## Desktop (Pre-Production)

Used by:

- Event managers
- Project managers
- Operations leads
- Producers

Typical tasks:

- Data entry
- Schedule building
- Event setup
- Setup checks
- Logistics planning

Desktop layouts should prioritise:

- Efficient use of screen space
- Fast data entry
- Visibility of related information
- Reduced navigation steps
- Productivity

## Mobile (On Site)

Used by:

- Crew
- Suppliers
- Site managers
- Clients

Typical tasks:

- Looking up information
- Checking schedules
- Finding contacts
- Viewing logistics

Mobile layouts should prioritise:

- Readability
- Fast access to information
- Clear navigation
- One-handed use
- Reliability in the field

## Design Principle

Do not treat desktop as a scaled-up mobile layout.

Do not treat mobile as a reduced desktop layout.

Each experience should be intentionally designed for its primary use case.

When implementing new screens, consider both desktop and mobile behaviour.

## UX Principles
CapCom is not a mobile app.

CapCom is not a desktop application.

CapCom is a cross-platform operational tool.

All significant UI changes should be reviewed on:

- Mobile phone
- Tablet
- Desktop

before being considered complete.


---

# Development Rules

Before major changes:

1. Explain the problem.
2. Explain the proposed solution.
3. Explain benefits.
4. Explain drawbacks.
5. Explain implementation effort.

Prefer improving existing code over rewriting working code.

Avoid introducing unnecessary dependencies.

Avoid speculative architecture.

Keep changes incremental.

---

# Local Dev Servers And Emulators

Long-running dev servers and Firebase emulators can be awkward for coding agents to start and stop because of sandbox process restrictions.

To keep the process smooth, prefer asking Andrew to start the required local service in a separate terminal window, then use the already-running local URL for verification.

Use copy-paste commands like these:

## CapCom v2 web app

```bash
cd /Users/apndavies/Coding/CapCom-API/CapCom-v2-app
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected local URL:

```text
http://127.0.0.1:5173/
```

## Firebase Functions emulator

```bash
cd /Users/apndavies/Coding/CapCom-API
npm run emulate:functions
```

Expected local endpoints:

```text
Firebase Emulator UI: http://127.0.0.1:4000/
Functions emulator:  http://127.0.0.1:5001/
```

## Firebase emulators with Storage if needed

Use this when Storage emulator behaviour also needs checking:

```bash
cd /Users/apndavies/Coding/CapCom-API
firebase emulators:start --project flair-pdf-generator --only functions,storage
```

Expected local endpoints:

```text
Firebase Emulator UI: http://127.0.0.1:4000/
Functions emulator:  http://127.0.0.1:5001/
Storage emulator:    http://127.0.0.1:9199/
```

If a local server is already running, use it rather than starting another one. If a port is busy or a server needs restarting, ask Andrew to stop/restart it in his terminal instead of trying to force-kill processes from the sandbox.

---

# Testing Requirements

After making changes:

- Run build checks.
- Run lint checks.
- Report failures honestly.
- Summarise files changed.
- Summarise architectural impact.

Do not claim testing was performed unless it was actually run.

---

# Guidance For AI Coding Agents

When assisting with CapCom:

- Optimise for customer value.
- Optimise for maintainability.
- Optimise for reliability.
- Prefer simple solutions.
- Prefer established patterns already present in the codebase.

Assume the codebase will be maintained by a technically capable product owner rather than a large engineering team.

Technology is a tool.

CapCom is the product.
