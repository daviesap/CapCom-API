import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import { createEvent, getEvents } from "../services/eventService.js";
import { syncScheduleDaysToRange } from "../services/scheduleDayService.js";

const emptyForm = {
  name: "",
  clientName: "",
  startDate: "",
  endDate: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
};

export default function EventListPage() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadEvents = async () => {
    setLoading(true);
    setError("");
    try {
      setEvents(await getEvents());
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

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
    setSaving(true);
    setError("");

    try {
      if (form.scheduleStartDate > form.scheduleEndDate) {
        setError("Schedule start date must be before or equal to schedule end date.");
        return;
      }

      const newEvent = await createEvent(form);
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
          <p className="page-subtitle">Create and open event records.</p>
        </div>
        <button
          className="button"
          type="button"
          onClick={() => {
            setError("");
            setShowCreateOverlay(true);
          }}
        >
          Create Event
        </button>
      </div>

      {error && !showCreateOverlay ? <p className="error">{error}</p> : null}
      {loading ? <Loading label="Loading events..." /> : null}
      {!loading && events.length === 0 ? <EmptyState message="No events yet." /> : null}

      <section className="list">
        {events.map((event) => (
          <article className="list-item" key={event.id}>
            <div>
              <p className="item-title">{event.name}</p>
              <p className="item-meta">
                {event.clientName} | {event.startDate} to {event.endDate}
              </p>
            </div>
            <div className="actions inline-actions">
              <Link className="button secondary" to={`/events/${event.id}`}>
                Open
              </Link>
            </div>
          </article>
        ))}
      </section>

      {showCreateOverlay ? (
        <div className="overlay-backdrop" role="presentation" onMouseDown={closeCreateOverlay}>
          <section
            className="overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="createEventTitle"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="overlay-header">
              <div>
                <h2 id="createEventTitle">Create Event</h2>
                <p className="page-subtitle">Add the basic event record.</p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close create event overlay"
                onClick={closeCreateOverlay}
              >
                ×
              </button>
            </div>

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
                  <label htmlFor="clientName">Client name</label>
                  <input
                    id="clientName"
                    value={form.clientName}
                    onChange={(event) => updateField("clientName", event.target.value)}
                    required
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
                <button className="button" type="submit" disabled={saving}>
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
          </section>
        </div>
      ) : null}
    </main>
  );
}
