import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import {
  createScheduleDetail,
  getScheduleDetails,
} from "../services/scheduleDetailService.js";

const emptyForm = {
  time: "",
  description: "",
};

export default function ScheduleDetailsPage() {
  const { eventId, scheduleDayId } = useParams();
  const [details, setDetails] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadDetails = async () => {
    setLoading(true);
    setError("");
    try {
      setDetails(await getScheduleDetails(scheduleDayId));
    } catch (loadError) {
      console.error(loadError);
      setError("Could not load schedule details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [scheduleDayId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createScheduleDetail({
        scheduleDayId,
        time: form.time,
        description: form.description,
      });
      setForm(emptyForm);
      await loadDetails();
    } catch (saveError) {
      console.error(saveError);
      setError("Could not create schedule detail.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading schedule details..." />;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedule Details</h1>
          <p className="page-subtitle">scheduleDays/{scheduleDayId}</p>
        </div>
        <Link className="button secondary" to={`/events/${eventId}/days`}>
          Back to Days
        </Link>
      </div>

      <section className="panel">
        <h2>Add Schedule Detail</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="time">Time</label>
              <input
                id="time"
                type="time"
                value={form.time}
                onChange={(event) => updateField("time", event.target.value)}
                required
              />
            </div>
            <div className="form-row full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)}
                required
              />
            </div>
          </div>
          <div className="actions">
            <button className="button" type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Detail"}
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="error">{error}</p> : null}
      {details.length === 0 ? <EmptyState message="No schedule details yet." /> : null}

      <section className="list">
        {details.map((detail) => (
          <article className="list-item" key={detail.id}>
            <div>
              <p className="item-title">{detail.time}</p>
              <p className="item-meta">{detail.description}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
