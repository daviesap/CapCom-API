import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import EmptyState from "../components/EmptyState.jsx";
import Loading from "../components/Loading.jsx";
import ScheduleCacheStatus from "../components/ScheduleCacheStatus.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { getCachedEventForUser, getEvent } from "../services/eventService.js";
import { getScheduleDays } from "../services/scheduleDayService.js";
import {
  createScheduleDetail,
  getScheduleDetails,
  getScheduleDetailsForEvent,
  updateScheduleDetail,
} from "../services/scheduleDetailService.js";
import {
  getCachedScheduleDays,
  getCachedScheduleDetails,
} from "../services/localScheduleCache.js";

export default function ScheduleDaysPage() {
  const { eventId } = useParams();
  const { userProfile, profileLoading } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [event, setEvent] = useState(null);
  const [days, setDays] = useState([]);
  const [detailsByDayId, setDetailsByDayId] = useState({});
  const [draftDetailsByDayId, setDraftDetailsByDayId] = useState({});
  const [savedDetailsById, setSavedDetailsById] = useState({});
  const [savingDetailId, setSavingDetailId] = useState("");
  const [savingDraftDayId, setSavingDraftDayId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPage = async () => {
    const cachedEvent = getCachedEventForUser(eventId, userProfile);
    const cachedDays = getCachedScheduleDays(eventId);
    if (cachedEvent || cachedDays.length > 0) {
      setEvent(cachedEvent);
      setDays(cachedDays);
      setDetailsState(
        Object.fromEntries(
          cachedDays.map((day) => [day.id, getCachedScheduleDetails(day.id)])
        )
      );
      setLoading(false);
    } else {
      setLoading(true);
    }
    setError("");
    try {
      const eventRecord = await getEvent(eventId, userProfile);
      if (!eventRecord) {
        setEvent(null);
        setDays([]);
        setError("Event not found.");
        return;
      }

      const dayRecords = await getScheduleDays(eventId);
      setEvent(eventRecord);
      setDays(dayRecords);

      setDetailsState(
        await getScheduleDetailsForEvent(eventId, dayRecords.map((day) => day.id))
      );
    } catch (loadError) {
      console.error("Could not load schedule days.", loadError);
      setError("Could not load schedule days.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    loadPage();
  }, [eventId, profileLoading, userProfile]);

  const setDetailsState = (nextDetailsByDayId) => {
    const detailsEntries = Object.entries(nextDetailsByDayId);
    setDetailsByDayId(nextDetailsByDayId);
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

  const updateDetailField = (dayId, detailId, field, value) => {
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((detail) =>
        detail.id === detailId ? { ...detail, [field]: value } : detail
      ),
    }));
  };

  const saveDetail = async (dayId, detail) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
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
      await loadPage();
    } finally {
      setSavingDetailId("");
    }
  };

  const addDraftDetail = (dayId) => {
    if (isOffline) return;
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
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDraftDayId(dayId);
    setError("");

    try {
      await createScheduleDetail({
        eventId,
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

  if (loading) return <Loading />;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Schedule Days</h1>
          <p className="page-subtitle">{event?.name || eventId}</p>
          <ScheduleCacheStatus eventId={eventId} />
        </div>
        <Link className="button secondary" to={`/events/${eventId}/edit`}>
          Back to Event
        </Link>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: schedule editing is disabled.</p>
      ) : null}
      {days.length === 0 ? <EmptyState message="No schedule days yet." /> : null}

      <section className="list">
        {days.map((day) => {
          const dayDetails = detailsByDayId[day.id] || [];
          const draftDetails = draftDetailsByDayId[day.id] || [];

          return (
            <article className="list-item" key={day.id}>
              <div>
                <div className="day-heading">
                  <p className="item-title">{day.date}</p>
                  <button
                    className="compact-button primary-soft icon-text-button"
                    type="button"
                    disabled={isOffline}
                    onClick={() => addDraftDetail(day.id)}
                  >
                    <CapcomIcon name="add" size={16} weight="bold" />
                    Add row
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
                            disabled={isOffline}
                            onChange={(event) =>
                              updateDetailField(day.id, detail.id, "time", event.target.value)
                            }
                          />
                          <input
                            className="plain-input"
                            aria-label={`Description for ${detail.time}`}
                            value={detail.description || ""}
                            disabled={isOffline}
                            onChange={(event) =>
                              updateDetailField(day.id, detail.id, "description", event.target.value)
                            }
                          />
                          {hasUnsavedEdit ? (
                            <button
                              className="button secondary"
                              type="button"
                              disabled={savingDetailId === detail.id || isOffline}
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
                          disabled={isOffline}
                          onChange={(event) =>
                            updateDraftDetail(day.id, draftIndex, "time", event.target.value)
                          }
                        />
                        <input
                          aria-label="New detail description"
                          value={draft.description}
                          disabled={isOffline}
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
                            disabled={isOffline}
                            onClick={() => removeDraftDetail(day.id, draftIndex)}
                          >
                            Cancel
                          </button>
                          <button
                            className="button"
                            type="button"
                          disabled={savingDraftDayId === day.id || !draft.description.trim() || isOffline}
                            onClick={() => saveDraftDetail(day.id, draftIndex, draft)}
                          >
                            {savingDraftDayId === day.id ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
