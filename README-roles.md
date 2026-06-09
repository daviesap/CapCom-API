# Role Reference

## SuperAdmin

Has global control across the app.

### Can

- View all clients, users, companies, and events.
- Create and edit clients.
- Create and edit Admin, User, and Viewer accounts.
- Create events for any client.
- View, edit, and manage all events.
- Manage event settings, schedule rows, summary, trucking, contacts, key info, filtered views, and share output.
- Assign event access to User and Viewer accounts.

### Cannot

- Delete user profiles through the app.
- Delete clients through the app.

## Admin

Client-scoped manager role.

### Can

- View their own client's events.
- Create and edit events for their client.
- Manage companies for their client.
- Create and edit User and Viewer accounts for their client.
- Assign or remove event access for User and Viewer accounts.
- Fully manage event content for their client:
  - event details
  - summary days
  - schedule detail rows
  - trucking
  - contacts
  - key info
  - tags
  - locations
  - truck sizes
  - filtered views
  - share output

### Cannot

- Access other clients' events or companies.
- Create or edit other Admin accounts.
- Create or edit SuperAdmin accounts.
- Manage clients globally.

## User

Assigned-event editor role.

### Can

- View only events assigned to them.
- Edit assigned events.
- Manage event content within assigned events, including:
  - event details
  - summary days
  - schedule detail rows
  - trucking
  - key info
  - tags
  - locations
  - truck sizes
  - filtered views
  - share output

### Cannot

- Create new events.
- Access unassigned events.
- Add, edit, or assign users.
- Access the Admin section.
- Manage client-level companies from the Companies page.
- Manage company contacts where that is Admin-only.

## Viewer

Assigned-event read-only role.

### Can

- View only events assigned to them.
- Open assigned events.
- View event content, schedule details, trucking, contacts, key info, settings data, filtered views, and share/archive information.

### Cannot

- Create events.
- Edit event details.
- Add, edit, delete, duplicate, move, or reorder schedule rows.
- Edit summary days or schedule date ranges.
- Add/edit/delete trucking, tags, locations, truck sizes, contacts, key info, or filtered views.
- Update share output.
- Access unassigned events.
- Access the Admin section.
- Manage users or event assignments.
