import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import { canCreateEvents } from "../auth/roles.js";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { getClient, getClients } from "../services/clientService.js";
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

export default function EventListPage() {
  const {
    userProfile,
    profileLoading,
    isSuperAdmin,
    isAdmin,
    isUser,
    isViewer,
  } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [events, setEvents] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const userCanCreateEvents = canCreateEvents(userProfile);
  const activeClients = clients.filter((client) => client.isActive !== false);

  const loadEvents = async () => {
    const cachedEvents = getCachedEventsForUser(userProfile);
    if (cachedEvents.length > 0) {
      setEvents(cachedEvents);
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      setEvents(await getEvents(userProfile));
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
  }, [profileLoading, userProfile]);

  useEffect(() => {
    if (profileLoading) return;

    const loadClients = async () => {
      setClientsLoading(true);
      try {
        if (isSuperAdmin) {
          setClients(await getClients());
          return;
        }

        if (userProfile?.clientId) {
          const client = await getClient(userProfile.clientId);
          setClients(client ? [client] : []);
          return;
        }

        setClients([]);
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load clients.");
      } finally {
        setClientsLoading(false);
      }
    };

    loadClients();
  }, [profileLoading, isSuperAdmin, userProfile]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateClient = (clientId) => {
    const selectedClient = clients.find((client) => client.id === clientId);
    setForm((current) => ({
      ...current,
      clientId,
      clientName: selectedClient?.clientName || "",
    }));
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

      if (isSuperAdmin && !form.clientId) {
        setError("Choose a client before creating the event.");
        return;
      }

      const selectedClient = clients.find((client) => client.id === form.clientId);
      const eventData = {
        ...form,
        clientId: isAdmin ? userProfile.clientId : form.clientId,
        clientName: selectedClient?.clientName || form.clientName,
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
        <button
          className="button"
          type="button"
          aria-label="Create event"
          disabled={isOffline || profileLoading || !userCanCreateEvents}
          onClick={() => {
            setError("");
            setForm({
              ...emptyForm,
              clientId: isAdmin ? userProfile?.clientId || "" : "",
              clientName: isAdmin ? clients[0]?.clientName || "" : "",
            });
            setShowCreateOverlay(true);
          }}
        >
          <CapcomIcon name="add" size={18} weight="bold" />
          <span className="button-label">Create Event</span>
        </button>
      </div>

      {error && !showCreateOverlay ? <p className="error">{error}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: previously loaded schedules are read-only.</p>
      ) : null}
      {!profileLoading && (isUser || isViewer) ? (
        <p className="message">
          {isViewer ? "Viewer" : "User"} accounts can only access events assigned by an Admin.
        </p>
      ) : null}
      {loading ? <Loading /> : null}
      {!loading && events.length === 0 ? <EmptyState message="No events yet." /> : null}

      <section className="list">
        {events.map((event) => (
          <Link className="list-item event-card-link" key={event.id} to={`/events/${event.id}/edit`}>
            <div className="event-card-main">
              {event.imageUrl ? (
                <img
                  className="event-card-image"
                  src={event.imageUrl}
                  alt=""
                />
              ) : null}
              <div>
              <p className="item-title">{event.name}</p>
              {event.venue ? <p className="event-card-venue">{event.venue}</p> : null}
              <p className="item-meta">
                {event.clientName} | {formatEventDateRange(event.startDate, event.endDate)}
              </p>
              {isSuperAdmin && !event.clientId ? (
                <p className="inline-warning">Missing client assignment</p>
              ) : null}
              </div>
            </div>
          </Link>
        ))}
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
                {isSuperAdmin ? (
                  <div className="form-row">
                    <label htmlFor="clientId">Client</label>
                    <select
                      id="clientId"
                      value={form.clientId}
                      disabled={clientsLoading}
                      onChange={(event) => updateClient(event.target.value)}
                      required
                    >
                      <option value="">Choose a client</option>
                      {activeClients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.clientName}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-row">
                    <label htmlFor="clientName">Client</label>
                    <input
                      id="clientName"
                      value={form.clientName || userProfile?.clientId || ""}
                      disabled
                      required
                    />
                  </div>
                )}
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
                  disabled={saving || isOffline || clientsLoading || !userCanCreateEvents}
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
