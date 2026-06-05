import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading.jsx";
import { getEvent, updateEvent } from "../services/eventService.js";
import {
  getScheduleDays,
  syncScheduleDaysToRange,
  updateScheduleDay,
} from "../services/scheduleDayService.js";
import {
  createScheduleDetail,
  getScheduleDetails,
  updateScheduleDetail,
} from "../services/scheduleDetailService.js";

const emptyEventForm = {
  name: "",
  clientName: "",
  startDate: "",
  endDate: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
};

function formatFriendlyDate(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function formatDetailDate(dateString) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" :
    "th";
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" }).format(date);
  const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(date);
  return `${weekday} ${day}${suffix} ${month}`;
}

export default function EventEditPage() {
  const { eventId } = useParams();
  const [form, setForm] = useState(emptyEventForm);
  const [scheduleDays, setScheduleDays] = useState([]);
  const [savedScheduleDays, setSavedScheduleDays] = useState({});
  const [editingDayId, setEditingDayId] = useState("");
  const [editingDayDraft, setEditingDayDraft] = useState({
    summary: "",
    endOfDayTarget: "",
  });
  const [editingDayMode, setEditingDayMode] = useState("");
  const [detailsByDayId, setDetailsByDayId] = useState({});
  const [draftDetailsByDayId, setDraftDetailsByDayId] = useState({});
  const [savedDetailsById, setSavedDetailsById] = useState({});
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDayId, setSavingDayId] = useState("");
  const [savingDetailId, setSavingDetailId] = useState("");
  const [savingDraftDayId, setSavingDraftDayId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setError("");
      try {
        const [event, days] = await Promise.all([
          getEvent(eventId),
          getScheduleDays(eventId),
        ]);
        if (!event) {
          setError("Event not found.");
          return;
        }
        setForm({
          name: event.name || "",
          clientName: event.clientName || "",
          startDate: event.startDate || "",
          endDate: event.endDate || "",
          scheduleStartDate: event.scheduleStartDate || event.startDate || "",
          scheduleEndDate: event.scheduleEndDate || event.endDate || "",
        });
        applyScheduleDays(days);
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load event editor.");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [eventId]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const loadScheduleDays = async () => {
    const days = await getScheduleDays(eventId);
    applyScheduleDays(days);
  };

  const applyScheduleDays = (days) => {
    setScheduleDays(days);
    setSavedScheduleDays(
      Object.fromEntries(
        days.map((day) => [
          day.id,
          {
            summary: day.summary || "",
            endOfDayTarget: day.endOfDayTarget || "",
          },
        ])
      )
    );
    loadScheduleDetails(days);
  };

  const loadScheduleDetails = async (days) => {
    const detailsEntries = await Promise.all(
      days.map(async (day) => {
        const details = await getScheduleDetails(day.id);
        return [day.id, details];
      })
    );
    setDetailsByDayId(Object.fromEntries(detailsEntries));
    setSavedDetailsById(
      Object.fromEntries(
        detailsEntries.flatMap(([, details]) =>
          details.map((detail) => [
            detail.id,
            {
              time: detail.time || "",
              description: detail.description || "",
            },
          ])
        )
      )
    );
  };

  const updateDayField = (dayId, field, value) => {
    setScheduleDays((current) =>
      current.map((day) => (day.id === dayId ? { ...day, [field]: value } : day))
    );
  };

  const startEditingDay = (day, mode = "inline") => {
    setEditingDayId(day.id);
    setEditingDayMode(mode);
    setEditingDayDraft({
      summary: day.summary || "",
      endOfDayTarget: day.endOfDayTarget || "",
    });
    setMessage("");
    setError("");
  };

  const updateEditingDayField = (field, value) => {
    setEditingDayDraft((current) => ({ ...current, [field]: value }));
  };

  const cancelEditingDay = () => {
    setEditingDayId("");
    setEditingDayMode("");
    setEditingDayDraft({
      summary: "",
      endOfDayTarget: "",
    });
  };

  const saveDay = async (day, values = day) => {
    setSavingDayId(day.id);
    setMessage("");
    setError("");

    try {
      await updateScheduleDay(day.id, {
        summary: values.summary || "",
        endOfDayTarget: values.endOfDayTarget || "",
      });
      updateDayField(day.id, "summary", values.summary || "");
      updateDayField(day.id, "endOfDayTarget", values.endOfDayTarget || "");
      setSavedScheduleDays((current) => ({
        ...current,
        [day.id]: {
          summary: values.summary || "",
          endOfDayTarget: values.endOfDayTarget || "",
        },
      }));
      cancelEditingDay();
      setMessage("Schedule day saved.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule day.");
      await loadScheduleDays();
    } finally {
      setSavingDayId("");
    }
  };

  const updateDetailField = (dayId, detailId, field, value) => {
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((detail) =>
        detail.id === detailId ? { ...detail, [field]: value } : detail
      ),
    }));
  };

  const saveDetail = async (dayId, detail) => {
    setSavingDetailId(detail.id);
    setError("");

    try {
      await updateScheduleDetail(detail.id, {
        time: detail.time || "",
        description: detail.description || "",
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
        },
      }));

      const details = await getScheduleDetails(dayId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: details,
      }));
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const addDraftDetail = (dayId) => {
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: [...(current[dayId] || []), { time: "", description: "" }],
    }));
  };

  const updateDraftDetail = (dayId, draftIndex, field, value) => {
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, [field]: value } : draft
      ),
    }));
  };

  const removeDraftDetail = (dayId, draftIndex) => {
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).filter((_, index) => index !== draftIndex),
    }));
  };

  const saveDraftDetail = async (dayId, draftIndex, draft) => {
    setSavingDraftDayId(dayId);
    setError("");

    try {
      await createScheduleDetail({
        scheduleDayId: dayId,
        time: draft.time,
        description: draft.description,
      });
      removeDraftDetail(dayId, draftIndex);

      const details = await getScheduleDetails(dayId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: details,
      }));
      setSavedDetailsById((current) => ({
        ...current,
        ...Object.fromEntries(
          details.map((detail) => [
            detail.id,
            {
              time: detail.time || "",
              description: detail.description || "",
            },
          ])
        ),
      }));
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add schedule detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const handleEventSave = async (submitEvent) => {
    submitEvent.preventDefault();
    setSavingEvent(true);
    setMessage("");
    setError("");

    try {
      if (form.scheduleStartDate > form.scheduleEndDate) {
        setError("Schedule start date must be before or equal to schedule end date.");
        return;
      }

      await updateEvent(eventId, form);
      const days = await syncScheduleDaysToRange(
        eventId,
        form.scheduleStartDate,
        form.scheduleEndDate
      );
      applyScheduleDays(days);
      setMessage("Event saved and schedule days synced.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save event or sync schedule days.");
    } finally {
      setSavingEvent(false);
    }
  };

  if (loading) return <Loading label="Loading event editor..." />;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Edit Event</h1>
          <p className="page-subtitle">{form.name || eventId}</p>
        </div>
        <div className="actions inline-actions">
          <Link className="button secondary" to={`/events/${eventId}`}>
            Back
          </Link>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message success-message">{message}</p> : null}

      <nav className="tabs" aria-label="Event edit sections">
        <button
          className={activeTab === "details" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveTab("details")}
        >
          Details
        </button>
        <button
          className={activeTab === "summary" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveTab("summary")}
        >
          Summary Schedule
        </button>
        <button
          className={activeTab === "detail" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveTab("detail")}
        >
          Detail
        </button>
      </nav>

      {activeTab === "details" ? (
      <section className="panel">
        <h2>Event</h2>
        <form onSubmit={handleEventSave}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editClientName">Client</label>
              <input
                id="editClientName"
                value={form.clientName}
                onChange={(event) => updateField("clientName", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editStartDate">Start date</label>
              <input
                id="editStartDate"
                type="date"
                value={form.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editEndDate">End date</label>
              <input
                id="editEndDate"
                type="date"
                value={form.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editScheduleStartDate">Schedule start date</label>
              <input
                id="editScheduleStartDate"
                type="date"
                value={form.scheduleStartDate}
                onChange={(event) => updateField("scheduleStartDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editScheduleEndDate">Schedule end date</label>
              <input
                id="editScheduleEndDate"
                type="date"
                value={form.scheduleEndDate}
                onChange={(event) => updateField("scheduleEndDate", event.target.value)}
                required
              />
            </div>
          </div>
          <div className="actions">
            <button className="button" type="submit" disabled={savingEvent}>
              {savingEvent ? "Saving..." : "Save Event"}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      {activeTab === "summary" ? (
      <section className="panel">
        <h2>Summary Schedule</h2>
        {scheduleDays.length === 0 ? (
          <p className="item-meta">No days added to the Summary Schedule yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="schedule-days-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Summary</th>
                  <th>End of day target</th>
                </tr>
              </thead>
              <tbody>
                {scheduleDays.map((day) => {
                  const isEditing = editingDayId === day.id && editingDayMode === "inline";

                  return (
                    <tr key={day.id}>
                      <td className="date-cell" data-label="Date">{formatFriendlyDate(day.date)}</td>
                      <td data-label="Summary">
                        {isEditing ? (
                          <input
                            aria-label={`Summary for ${formatFriendlyDate(day.date)}`}
                            value={editingDayDraft.summary}
                            onChange={(event) =>
                              updateEditingDayField("summary", event.target.value)
                            }
                          />
                        ) : (
                          <span className="display-text">
                            {day.summary || ""}
                          </span>
                        )}
                      </td>
                      <td data-label="End of day target">
                        <div className="target-cell">
                          {isEditing ? (
                            <input
                              aria-label={`End of day target for ${formatFriendlyDate(day.date)}`}
                              value={editingDayDraft.endOfDayTarget}
                              onChange={(event) =>
                                updateEditingDayField("endOfDayTarget", event.target.value)
                              }
                            />
                          ) : (
                            <span className="display-text">
                              {day.endOfDayTarget || ""}
                            </span>
                          )}

                          <div className="row-actions">
                            {isEditing ? (
                              <>
                                <button
                                  className="compact-button primary"
                                  type="button"
                                  disabled={savingDayId === day.id}
                                  onClick={() => saveDay(day, editingDayDraft)}
                                >
                                  {savingDayId === day.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="compact-button"
                                  type="button"
                                  disabled={savingDayId === day.id}
                                  onClick={cancelEditingDay}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="compact-button"
                                type="button"
                                onClick={() => startEditingDay(day, "inline")}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : null}

      {activeTab === "detail" ? (
      <section className="panel">
        <h2>Detail</h2>
        {scheduleDays.length === 0 ? (
          <p className="item-meta">No schedule days yet.</p>
        ) : (
          <section className="list">
            {scheduleDays.map((day) => {
              const dayDetails = detailsByDayId[day.id] || [];
              const draftDetails = draftDetailsByDayId[day.id] || [];

              return (
                <article className="list-item" key={day.id}>
                  <div className="day-card-content">
                    <div className="day-heading">
                      <div>
                        <p className="item-title">{formatDetailDate(day.date)}</p>
                        {day.summary ? (
                          <p className="item-meta">{day.summary}</p>
                        ) : null}
                      </div>
                      <button
                        className="small-button"
                        type="button"
                        onClick={() => addDraftDetail(day.id)}
                      >
                        Add row
                      </button>
                    </div>
                    <div className="day-card-actions">
                      <button
                        className="compact-button"
                        type="button"
                        onClick={() => startEditingDay(day, "overlay")}
                      >
                        Edit day
                      </button>
                    </div>

                    {dayDetails.length === 0 && draftDetails.length === 0 ? (
                      <p className="item-meta">No schedule details yet.</p>
                    ) : (
                      <div className="detail-list">
                        {dayDetails.map((detail) => {
                          const savedDetail = savedDetailsById[detail.id] || {
                            time: "",
                            description: "",
                          };
                          const hasUnsavedEdit =
                            (detail.time || "") !== savedDetail.time ||
                            (detail.description || "") !== savedDetail.description;

                          return (
                            <div className="detail-row" key={detail.id}>
                              <input
                                className="plain-input detail-time-input"
                                aria-label={`Time for ${detail.description || "schedule detail"}`}
                                type="time"
                                value={detail.time || ""}
                                onChange={(event) =>
                                  updateDetailField(day.id, detail.id, "time", event.target.value)
                                }
                              />
                              <input
                                className="plain-input"
                                aria-label={`Description for ${detail.time}`}
                                value={detail.description || ""}
                                onChange={(event) =>
                                  updateDetailField(day.id, detail.id, "description", event.target.value)
                                }
                              />
                              {hasUnsavedEdit ? (
                                <button
                                  className="button secondary"
                                  type="button"
                                  disabled={savingDetailId === detail.id}
                                  onClick={() => saveDetail(day.id, detail)}
                                >
                                  {savingDetailId === detail.id ? "Saving..." : "Save"}
                                </button>
                              ) : null}
                            </div>
                          );
                        })}
                        {draftDetails.map((draft, draftIndex) => (
                          <div className="detail-row draft-row" key={`draft-${draftIndex}`}>
                            <input
                              aria-label="New detail time"
                              type="time"
                              value={draft.time}
                              onChange={(event) =>
                                updateDraftDetail(day.id, draftIndex, "time", event.target.value)
                              }
                            />
                            <input
                              aria-label="New detail description"
                              value={draft.description}
                              onChange={(event) =>
                                updateDraftDetail(day.id, draftIndex, "description", event.target.value)
                              }
                              placeholder="Description"
                              required
                            />
                            <div className="draft-actions">
                              <button
                                className="button secondary"
                                type="button"
                                onClick={() => removeDraftDetail(day.id, draftIndex)}
                              >
                                Cancel
                              </button>
                              <button
                                className="button"
                                type="button"
                                disabled={savingDraftDayId === day.id || !draft.description.trim()}
                                onClick={() => saveDraftDetail(day.id, draftIndex, draft)}
                              >
                                {savingDraftDayId === day.id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {day.endOfDayTarget ? (
                      <p className="end-target">End of day target: {day.endOfDayTarget}</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
      ) : null}

      {editingDayMode === "overlay" ? (
        <div className="overlay-backdrop" role="presentation" onMouseDown={cancelEditingDay}>
          <section
            className="overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="editDayTitle"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="overlay-header">
              <div>
                <h2 id="editDayTitle">Edit day</h2>
                <p className="page-subtitle">
                  {formatDetailDate(scheduleDays.find((day) => day.id === editingDayId)?.date)}
                </p>
              </div>
              <button
                className="icon-button"
                type="button"
                aria-label="Close edit day overlay"
                onClick={cancelEditingDay}
              >
                ×
              </button>
            </div>

            <div className="form-grid">
              <div className="form-row full">
                <label htmlFor="overlayDaySummary">Summary</label>
                <input
                  id="overlayDaySummary"
                  value={editingDayDraft.summary}
                  onChange={(event) => updateEditingDayField("summary", event.target.value)}
                />
              </div>
              <div className="form-row full">
                <label htmlFor="overlayDayTarget">End of day target</label>
                <input
                  id="overlayDayTarget"
                  value={editingDayDraft.endOfDayTarget}
                  onChange={(event) => updateEditingDayField("endOfDayTarget", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="button"
                disabled={savingDayId === editingDayId}
                onClick={() => {
                  const day = scheduleDays.find((nextDay) => nextDay.id === editingDayId);
                  if (day) saveDay(day, editingDayDraft);
                }}
              >
                {savingDayId === editingDayId ? "Saving..." : "Save day"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDayId === editingDayId}
                onClick={cancelEditingDay}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
