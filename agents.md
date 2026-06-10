AGENTS.md

CapCom

CapCom is an operational event management platform.

Its purpose is to help event managers, suppliers, crew, clients and stakeholders access accurate event information quickly and reliably.

CapCom is a product, not a technology experiment.

Technology is a tool.

Users buy solutions, not technology.

The objective is not to build the most technically impressive system.

The objective is to build the most useful system.

⸻

About Andrew

Andrew is an experienced event professional and project manager.

He is not a professional software developer, but has successfully built substantial systems using:

* Glide
* Firebase
* Firestore
* Cloud Functions
* Cloudflare
* AI-assisted development

Andrew is naturally curious and enjoys learning new technologies.

This is a strength.

It is also his biggest risk.

⸻

The Biggest Risk

The biggest risk is not technical failure.

The biggest risk is spending months exploring tools instead of solving customer problems.

Historical path:

* Airtable
* Softr
* Noloco
* Glide
* Firebase
* React curiosity
* Cursor curiosity
* Next shiny thing

Learning is encouraged.

Distraction is not.

⸻

The Three Questions

Before introducing a new platform, framework, library or architectural pattern:

1. What customer problem does this solve?

Not:

* It looks cool.
* People on YouTube love it.
* It might be better.

A real customer problem.

2. Can CapCom create value without it?

If yes, remain focused.

3. What feature are we NOT building while we learn this?

Time spent learning one thing is time not spent improving CapCom.

4. Which customer asked for this?

The strongest product decisions come from:

* Repeated customer requests
* Observed workflow pain
* Real event delivery problems
* Problems Andrew has personally experienced

Technology curiosity alone is not enough.

⸻

The 90 / 10 Rule

Aim for:

* 90% building CapCom
* 10% learning and experimentation

Learning React, Firestore and modern software architecture is encouraged.

Unnecessary rewrites are discouraged.

⸻

Customer Value Hierarchy

When prioritising work, focus on the highest-value outcomes first.

1. Prevent mistakes
2. Save time
3. Improve communication
4. Increase visibility
5. Reduce administration
6. Automate repetitive work
7. Nice-to-have features
8. Technology improvements

Technology improvements should rarely outrank customer-facing value.

⸻

Architecture

Frontend

* React
* Vite

Backend

* Firebase

Firebase Services

* Firestore
* Firebase Authentication
* Cloud Functions
* Cloud Storage
* Firebase Hosting

⸻

Technical Philosophy

Prefer:

React

User interface and presentation.

Firestore

Data storage.

Cloud Functions

Business logic.

Cloud Storage

Generated files and document storage.

Firebase Authentication

Authentication and access control.

When in doubt:

* Display logic belongs in React.
* Business-critical logic belongs in Cloud Functions.
* Security-sensitive logic belongs in Cloud Functions.
* Generation logic belongs in Cloud Functions.

⸻

Firestore Mental Model

Firestore stores data.

JavaScript creates relationships, calculations and derived values.

React displays the result.

Unlike Glide:

Firestore does not provide:

* Relations
* Rollups
* Lookups
* Queries
* Templates
* Computed columns

These must be implemented in code.

⸻

Firestore Data Model

Collections may evolve over time.

Current examples include:

* clients
* users
* events
* companies
* contacts
* schedules

Before proposing schema changes:

* Inspect existing structures.
* Minimise breaking changes.
* Prefer extending existing patterns.

Avoid introducing unnecessary collections or complexity.

⸻

Authentication

Authentication uses Firebase Authentication.

Supported methods may include:

* Email/password
* Magic link / email link authentication
* Additional providers in future

Authentication changes must not weaken security.

⸻

Authorisation

Roles:

superadmin

* Access to all client data.
* Platform administration.

admin

* Client-level administration.
* Manage users within assigned client.

user

* Normal operational access.

viewer

* Read-only access.

Always enforce permissions through Firestore security rules and backend validation.

Never rely solely on frontend restrictions.

⸻

Multi-Tenant Requirements

CapCom is multi-tenant.

This is a fundamental architectural requirement.

Every document must belong to a client.

Users should only access data belonging to their assigned client.

Never introduce solutions that risk exposing data between clients.

Security is more important than convenience.

Before implementing changes:

* Consider tenant isolation.
* Consider Firestore rules.
* Consider query performance.
* Consider future scalability.

⸻

Performance Principles

CapCom is intended for operational use during live events.

Performance matters.

Prefer:

* Efficient Firestore queries
* Pagination where appropriate
* Caching where appropriate
* Minimal Firestore reads
* Reusable data-fetching patterns

Before introducing new queries:

* Assess read costs.
* Assess frequency of execution.
* Assess scalability.

Avoid unnecessary Firestore reads.

Avoid duplicate queries.

Avoid fetching large collections when targeted queries are possible.

⸻

User Experience Principles

CapCom is an operational tool.

Users often need answers quickly:

* What time is crew call?
* Which truck arrives next?
* Which supplier is responsible?
* Where is a contact number?
* What hotel is booked?

The interface should prioritise:

* Clarity
* Speed
* Reliability
* Legibility
* Predictability

Visual polish should never reduce usability.

⸻

Styling

CapCom should feel:

* Professional
* Operational
* Reliable
* Mobile-first

Not:

* Trendy
* Experimental
* Consumer-social

Avoid:

* Glassmorphism
* Neumorphism
* Heavy shadows
* Excessive animations
* Overly decorative gradients
* Visual effects that reduce readability

Prefer:

* Strong hierarchy
* Clear typography
* Consistent spacing
* Clear touch targets
* Subtle branding

⸻

Branding

Each client will eventually provide:

* logoUrl
* primaryColour
* secondaryColour

stored in Firestore.

Use client colours as accents.

Do not allow client branding to compromise legibility.

Default background and text colours should remain consistent across all tenants.

⸻

Mobile Design

CapCom is mobile-first.

Prefer:

* Fixed header
* Fixed bottom navigation
* Scrollable content area
* Native-app style behaviour

Design decisions should favour on-site event usage.

⸻

Development Rules

Before making significant changes:

1. Explain the problem being solved.
2. Explain the proposed solution.
3. Explain benefits.
4. Explain drawbacks.
5. Explain implementation effort.

Prefer improving existing code over rewriting working code.

Avoid replacing stable implementations without clear justification.

Keep changes incremental.

Keep pull requests focused.

⸻

Testing Requirements

After making changes:

* Run build checks.
* Run lint checks.
* Report any failures.
* Summarise files changed.
* Summarise architectural impact.

Do not claim testing was performed unless it was actually executed.

⸻

When Suggesting Changes

Always provide:

Technical View

Explain:

* Architecture
* Benefits
* Drawbacks
* Trade-offs

Business View

Explain:

* How this helps CapCom users.
* Whether it increases customer value.
* Whether it solves a real problem.
* Which customer problem it addresses.
* What feature delivery may be delayed as a result.

⸻

Strategic Priorities

Priority order:

1. Existing customer problems
2. Reliability
3. Performance
4. User experience
5. Automation
6. New customer acquisition
7. Technical improvements
8. Technology exploration

Technology exploration should rarely outrank customer value.

⸻

Anti-Rabbit-Hole Rule

Before starting any significant technical exploration, answer:

* What problem am I solving?
* Who benefits?
* How will success be measured?
* What CapCom feature will be delayed?

If these questions cannot be answered clearly, stop and reconsider.

⸻

Guidance For AI Coding Agents

When assisting with CapCom:

* Favour simple solutions.
* Favour maintainability.
* Favour readability.
* Favour operational reliability.
* Avoid unnecessary abstraction.
* Avoid unnecessary dependencies.
* Avoid premature optimisation.
* Avoid speculative architecture.

Assume the codebase will be maintained by a technically capable product owner rather than a large engineering team.

Always optimise for customer value over technical novelty.

Remember:

Technology is a tool.

CapCom is the product.