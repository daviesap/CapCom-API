import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading.jsx";
import { getEvent } from "../services/eventService.js";

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvent = async () => {
      setLoading(true);
      setError("");
      try {
        setEvent(await getEvent(eventId));
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load event.");
      } finally {
        setLoading(false);
      }
    };

    loadEvent();
  }, [eventId]);

  if (loading) return <Loading label="Loading event..." />;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{event?.name || "Event not found"}</h1>
          <p className="page-subtitle">Event Details</p>
        </div>
        <Link className="button secondary" to="/events">
          Back to Events
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {event ? (
        <section className="panel">
          <p>
            <strong>Client:</strong> {event.clientName}
          </p>
          <p>
            <strong>Start:</strong> {event.startDate}
          </p>
          <p>
            <strong>End:</strong> {event.endDate}
          </p>
          <div className="actions">
            <Link className="button" to={`/events/${event.id}/days`}>
              View
            </Link>
            <Link className="button secondary" to={`/events/${event.id}/edit`}>
              Edit
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel">This event does not exist.</section>
      )}
    </main>
  );
}
