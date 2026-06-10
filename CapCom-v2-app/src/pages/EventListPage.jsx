import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { canCreateEvents } from "../auth/roles.js";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { createEvent, getCachedEventsForUser, getEvents } from "../services/eventService.js";
import { syncScheduleDaysToRange } from "../services/scheduleDayService.js";

const emptyForm = {
  name: "",
  venue: "",
  clientId: "",
  clientName: "",
  startDate: "",
  endDate: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
};

function formatDateOrdinal(date) {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" :
    "th";
  return `${day}${suffix}`;
}

function formatFriendlyDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
  return `${formatDateOrdinal(date)} ${month} ${date.getFullYear()}`;
}

function formatEventDateRange(startDateString, endDateString) {
  if (!startDateString && !endDateString) return "";
  if (!startDateString) return formatFriendlyDate(endDateString);
  if (!endDateString || startDateString === endDateString) return formatFriendlyDate(startDateString);

  const startDate = new Date(`${startDateString}T00:00:00`);
  const endDate = new Date(`${endDateString}T00:00:00`);
  const startMonth = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(startDate);
  const endMonth = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(endDate);
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear && startMonth === endMonth) {
    return `${formatDateOrdinal(startDate)} to ${formatDateOrdinal(endDate)} ${endMonth} ${endYear}`;
  }

  if (startYear === endYear) {
    return `${formatDateOrdinal(startDate)} ${startMonth} to ${formatDateOrdinal(endDate)} ${endMonth} ${endYear}`;
  }

  return `${formatDateOrdinal(startDate)} ${startMonth} ${startYear} to ${formatDateOrdinal(endDate)} ${endMonth} ${endYear}`;
}

function formatEventMetaLine(event) {
  return [event.venue, formatEventDateRange(event.startDate, event.endDate)].filter(Boolean).join(" | ");
}

export default function EventListPage() {
  const {
    userProfile,
    profileLoading,
    isSuperAdmin,
    isAdmin,
    activeClientId,
    activeClient,
    activeClientLoading,
  } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const userCanCreateEvents = canCreateEvents(userProfile);

  const loadEvents = async () => {
    if (isSuperAdmin && activeClientLoading) {
      setLoading(true);
      return;
    }

    if (isSuperAdmin && !activeClientId) {
      setEvents([]);
      setLoading(false);
      setError("");
      return;
    }

    const eventClientId = isSuperAdmin ? activeClientId : "";
    const cachedEvents = getCachedEventsForUser(userProfile, eventClientId);
    if (cachedEvents.length > 0) {
      setEvents(cachedEvents);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      setEvents(await getEvents(userProfile, eventClientId));
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    loadEvents();
  }, [profileLoading, userProfile, isSuperAdmin, activeClientId, activeClientLoading]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const closeCreateOverlay = () => {
    if (saving) return;
    setShowCreateOverlay(false);
    setForm(emptyForm);
    setError("");
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isOffline) {
      setError("Creating events is disabled while offline.");
      return;
    }
    if (!userCanCreateEvents) {
      setError("Your role cannot create events.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      if (form.scheduleStartDate > form.scheduleEndDate) {
        setError("Schedule start date must be before or equal to schedule end date.");
        return;
      }

      const eventClientId = isAdmin ? userProfile.clientId : activeClientId;
      const eventClientName = activeClient?.clientName || form.clientName;

      if (!eventClientId) {
        setError("Choose a client on the Profile page before creating the event.");
        return;
      }

      const eventData = {
        ...form,
        clientId: eventClientId,
        clientName: eventClientName,
      };

      const newEvent = await createEvent(eventData, userProfile);
      await syncScheduleDaysToRange(
        newEvent.id,
        form.scheduleStartDate,
        form.scheduleEndDate
      );
      setForm(emptyForm);
      await loadEvents();
      setShowCreateOverlay(false);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not create event.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Events</h1>
        </div>
        {userCanCreateEvents ? (
          <button
            className="button"
            type="button"
            aria-label="Create event"
            disabled={isOffline || profileLoading || activeClientLoading || (isSuperAdmin && !activeClientId)}
            onClick={() => {
              setError("");
              setForm({
                ...emptyForm,
                clientId: activeClientId || userProfile?.clientId || "",
                clientName: activeClient?.clientName || userProfile?.clientName || "",
              });
              setShowCreateOverlay(true);
            }}
          >
            <CapcomIcon name="add" size={18} weight="bold" />
            <span className="button-label">Create Event</span>
          </button>
        ) : null}
      </div>

      {error && !showCreateOverlay ? <p className="error">{error}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: previously loaded schedules are read-only.</p>
      ) : null}
      {loading ? <Loading /> : null}
      {!loading && events.length === 0 ? (
        <EmptyState
          message={(
            <>
              No events
              <br />
              Please contact the admin who can give you access to events
            </>
          )}
        />
      ) : null}

      <section className="list">
        {events.map((event) => {
          const eventMetaLine = formatEventMetaLine(event);

          return (
            <Link className="list-item event-card-link" key={event.id} to={`/events/${event.id}/edit`}>
              <div className="event-card-main">
                {event.imageUrl ? (
                  <img
                    className="event-card-image"
                    src={event.imageUrl}
                    alt=""
                  />
                ) : null}
                <div className="event-card-copy">
                  <p className="item-title">{event.name}</p>
                  {eventMetaLine ? <p className="event-card-meta">{eventMetaLine}</p> : null}
                  {isSuperAdmin && !event.clientId ? (
                    <p className="inline-warning">Missing client assignment</p>
                  ) : null}
                </div>
              </div>
              <span className="event-card-chevron" aria-hidden="true">
                <CapcomIcon name="caretRight" size={22} weight="bold" />
              </span>
            </Link>
          );
        })}
      </section>

      {showCreateOverlay ? (
        <Modal
          title="Create Event"
          subtitle="Add the basic event record."
          labelledBy="createEventTitle"
          closeLabel="Close create event form"
          onClose={closeCreateOverlay}
        >
            {error ? <p className="error">{error}</p> : null}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="name">Event name</label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="venue">Venue</label>
                  <input
                    id="venue"
                    value={form.venue}
                    onChange={(event) => updateField("venue", event.target.value)}
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="startDate">Start date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(event) => updateField("startDate", event.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="endDate">End date</label>
                  <input
                    id="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={(event) => updateField("endDate", event.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="scheduleStartDate">Schedule start date</label>
                  <input
                    id="scheduleStartDate"
                    type="date"
                    value={form.scheduleStartDate}
                    onChange={(event) => updateField("scheduleStartDate", event.target.value)}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="scheduleEndDate">Schedule end date</label>
                  <input
                    id="scheduleEndDate"
                    type="date"
                    value={form.scheduleEndDate}
                    onChange={(event) => updateField("scheduleEndDate", event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="actions">
                <button
                  className="button"
                  type="submit"
                  disabled={saving || isOffline || !userCanCreateEvents}
                >
                  {saving ? "Creating..." : "Create Event"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={saving}
                  onClick={closeCreateOverlay}
                >
                  Cancel
                </button>
              </div>
            </form>
        </Modal>
      ) : null}
    </main>
  );
}
