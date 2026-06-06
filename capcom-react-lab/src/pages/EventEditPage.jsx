import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading.jsx";
import ScheduleCacheStatus from "../components/ScheduleCacheStatus.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { getEvent, updateEvent } from "../services/eventService.js";
import {
  getScheduleDays,
  syncScheduleDaysToRange,
  updateScheduleDay,
} from "../services/scheduleDayService.js";
import {
  createScheduleDetail,
  deleteScheduleDetail,
  getScheduleDetails,
  getScheduleDetailsForEvent,
  updateScheduleDetail,
  updateScheduleDetailOrder,
} from "../services/scheduleDetailService.js";
import {
  createTag,
  deleteTag,
  getTags,
  updateTag,
} from "../services/tagService.js";

const emptyEventForm = {
  name: "",
  clientName: "",
  startDate: "",
  endDate: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
};

const emptyTagForm = {
  name: "",
  colour: "#DCEEFF",
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

function normaliseHexColour(colour) {
  const trimmedColour = String(colour || "").trim();
  if (!trimmedColour) return "";
  const withHash = trimmedColour.startsWith("#") ? trimmedColour : `#${trimmedColour}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : "";
}

function hexToRgba(colour, alpha) {
  const normalisedColour = normaliseHexColour(colour);
  if (!normalisedColour) return "";
  const red = parseInt(normalisedColour.slice(1, 3), 16);
  const green = parseInt(normalisedColour.slice(3, 5), 16);
  const blue = parseInt(normalisedColour.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getTagStyle(tag) {
  const colour = normaliseHexColour(tag?.colour);
  if (!colour) return undefined;
  return {
    backgroundColor: hexToRgba(colour, 0.16),
    borderColor: hexToRgba(colour, 0.36),
  };
}

function getRowTagStyle(tag) {
  const colour = normaliseHexColour(tag?.colour);
  if (!colour) return undefined;
  return {
    backgroundColor: hexToRgba(colour, 0.12),
    borderColor: hexToRgba(colour, 0.28),
  };
}

export default function EventEditPage() {
  const { eventId } = useParams();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [form, setForm] = useState(emptyEventForm);
  const [savedEventForm, setSavedEventForm] = useState(emptyEventForm);
  const [isEditingEventDetails, setIsEditingEventDetails] = useState(false);
  const [scheduleDays, setScheduleDays] = useState([]);
  const [editingDayId, setEditingDayId] = useState("");
  const [editingDayDraft, setEditingDayDraft] = useState({
    summary: "",
    endOfDayTarget: "",
  });
  const [editingDayMode, setEditingDayMode] = useState("");
  const [detailsByDayId, setDetailsByDayId] = useState({});
  const [draftDetailsByDayId, setDraftDetailsByDayId] = useState({});
  const [savedDetailsById, setSavedDetailsById] = useState({});
  const [tags, setTags] = useState([]);
  const [tagForm, setTagForm] = useState(emptyTagForm);
  const [editingTagId, setEditingTagId] = useState("");
  const [editingDetailId, setEditingDetailId] = useState("");
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [selectedTagFilterId, setSelectedTagFilterId] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [activeSettingsTab, setActiveSettingsTab] = useState("tags");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDayId, setSavingDayId] = useState("");
  const [savingDetailId, setSavingDetailId] = useState("");
  const [savingDraftDayId, setSavingDraftDayId] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState("");
  const [reorderingDayId, setReorderingDayId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const suppressDetailBlurRef = useRef(false);
  const draggedDetailIdRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setDetailsLoading(false);
      setTagsLoading(false);
      setError("");
      try {
        const [event, days] = await Promise.all([
          getEvent(eventId),
          getScheduleDays(eventId),
        ]);
        if (cancelled) return;
        if (!event) {
          setError("Event not found.");
          return;
        }
        const loadedEventForm = {
          name: event.name || "",
          clientName: event.clientName || "",
          startDate: event.startDate || "",
          endDate: event.endDate || "",
          scheduleStartDate: event.scheduleStartDate || event.startDate || "",
          scheduleEndDate: event.scheduleEndDate || event.endDate || "",
        };
        setForm(loadedEventForm);
        setSavedEventForm(loadedEventForm);
        setScheduleDays(days);
        setLoading(false);

        setDetailsLoading(true);
        setTagsLoading(true);
        const [detailsByDay, eventTags] = await Promise.all([
          getScheduleDetailsForEvent(eventId, days.map((day) => day.id)),
          getTags(eventId),
        ]);
        if (cancelled) return;
        setTags(eventTags);
        setDetailsState(detailsByDay);
      } catch (loadError) {
        console.error("Could not load event editor.", loadError);
        if (cancelled) return;
        setError("Could not load event editor.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDetailsLoading(false);
          setTagsLoading(false);
        }
      }
    };

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (!openActionMenuId) return undefined;

    const closeMenuOnOutsideClick = (event) => {
      if (!event.target.closest(".action-menu")) {
        setOpenActionMenuId("");
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeMenuOnOutsideClick);
  }, [openActionMenuId]);

  const usedTagIds = useMemo(() => {
    return new Set(
      Object.values(detailsByDayId)
        .flat()
        .map((detail) => detail.tagId)
        .filter(Boolean)
    );
  }, [detailsByDayId]);

  const usedTags = useMemo(() => {
    return tags.filter((tag) => usedTagIds.has(tag.id));
  }, [tags, usedTagIds]);

  useEffect(() => {
    if (selectedTagFilterId && !usedTagIds.has(selectedTagFilterId)) {
      setSelectedTagFilterId("");
    }
  }, [selectedTagFilterId, usedTagIds]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const cancelEditingEventDetails = () => {
    setForm(savedEventForm);
    setIsEditingEventDetails(false);
    setError("");
  };

  const loadScheduleDays = async () => {
    const days = await getScheduleDays(eventId);
    applyScheduleDays(days);
  };

  const loadTags = async () => {
    setTagsLoading(true);
    try {
      setTags(await getTags(eventId));
    } catch (loadError) {
      console.error("Could not load tags.", loadError);
      setError("Could not load tags.");
    } finally {
      setTagsLoading(false);
    }
  };

  const applyScheduleDays = (days) => {
    setScheduleDays(days);
    loadScheduleDetails(days);
  };

  const loadScheduleDetails = async (days) => {
    setDetailsLoading(true);
    try {
      setDetailsState(
        await getScheduleDetailsForEvent(eventId, days.map((day) => day.id))
      );
    } catch (loadError) {
      console.error("Could not load schedule details.", loadError);
      setError("Could not load schedule details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const setDetailsState = (nextDetailsByDayId) => {
    const detailsEntries = Object.entries(nextDetailsByDayId);
    setDetailsByDayId(nextDetailsByDayId);
    setSavedDetailsById(
      Object.fromEntries(
        detailsEntries.flatMap(([, details]) =>
          details.map((detail, detailIndex) => [
            detail.id,
            {
              time: detail.time || "",
              description: detail.description || "",
              sortOrder: typeof detail.sortOrder === "number" ? detail.sortOrder : detailIndex,
              colour: normaliseHexColour(detail.colour),
              tagId: detail.tagId || "",
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
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
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

  const getTagById = (tagId) => tags.find((tag) => tag.id === tagId) || null;

  const assignDetailTag = async (dayId, detail, tagId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, tagId } : nextDetail
      ),
    }));

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: detail.sortOrder,
        colour: normaliseHexColour(detail.colour),
        tagId,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
          colour: normaliseHexColour(detail.colour),
          tagId,
        },
      }));
    } catch (tagError) {
      console.error(tagError);
      setError("Could not update row tag.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const updateTagFormField = (field, value) => {
    setTagForm((current) => ({ ...current, [field]: value }));
  };

  const resetTagForm = () => {
    setEditingTagId("");
    setTagForm(emptyTagForm);
  };

  const startEditingTag = (tag) => {
    setEditingTagId(tag.id);
    setTagForm({
      name: tag.name || "",
      colour: normaliseHexColour(tag.colour) || emptyTagForm.colour,
    });
    setError("");
    setMessage("");
  };

  const saveTag = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingTag(true);
    setError("");
    setMessage("");

    try {
      const name = tagForm.name.trim();
      const colour = normaliseHexColour(tagForm.colour);
      if (!name || !colour) {
        setError("Tag name and valid hex colour are required.");
        return;
      }

      if (editingTagId) {
        await updateTag(editingTagId, { name, colour });
        setMessage("Tag saved.");
      } else {
        await createTag({ eventId, name, colour });
        setMessage("Tag created.");
      }
      resetTagForm();
      await loadTags();
    } catch (tagError) {
      console.error(tagError);
      setError("Could not save tag.");
    } finally {
      setSavingTag(false);
    }
  };

  const removeTag = async (tagId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTagId(tagId);
    setError("");
    setMessage("");

    try {
      await deleteTag(tagId);
      if (editingTagId === tagId) resetTagForm();
      await loadTags();
      setMessage("Tag deleted.");
    } catch (tagError) {
      console.error(tagError);
      setError("Could not delete tag.");
    } finally {
      setDeletingTagId("");
    }
  };

  const hasDetailChanges = (detail) => {
    const savedDetail = savedDetailsById[detail.id] || {
      time: "",
      description: "",
      colour: "",
      tagId: "",
    };
    return (
      (detail.time || "") !== savedDetail.time ||
      (detail.description || "") !== savedDetail.description ||
      normaliseHexColour(detail.colour) !== savedDetail.colour ||
      (detail.tagId || "") !== savedDetail.tagId
    );
  };

  const beginRowAction = () => {
    suppressDetailBlurRef.current = true;
    endRowAction();
  };

  const endRowAction = () => {
    setTimeout(() => {
      suppressDetailBlurRef.current = false;
    }, 0);
  };

  const closeActionMenu = () => {
    setOpenActionMenuId("");
  };

  const startEditingDetail = (detailId) => {
    if (isOffline) return;
    setEditingDetailId(detailId);
    setOpenActionMenuId("");
    setMessage("");
    setError("");
  };

  const cancelEditingDetail = (dayId, detailId) => {
    const savedDetail = savedDetailsById[detailId];
    if (savedDetail) {
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: (current[dayId] || []).map((detail) =>
          detail.id === detailId ? { ...detail, ...savedDetail } : detail
        ),
      }));
    }
    setEditingDetailId("");
    setOpenActionMenuId("");
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
        sortOrder: detail.sortOrder,
        colour: normaliseHexColour(detail.colour),
        tagId: detail.tagId || "",
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
          colour: normaliseHexColour(detail.colour),
          tagId: detail.tagId || "",
        },
      }));

      const details = await getScheduleDetails(dayId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: details,
      }));
      setEditingDetailId((current) => (current === detail.id ? "" : current));
      setOpenActionMenuId("");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const saveDetailOnBlur = (event, dayId, detail) => {
    if (suppressDetailBlurRef.current) return;
    if (event.currentTarget.contains(event.relatedTarget)) return;

    setOpenActionMenuId("");

    if (hasDetailChanges(detail)) {
      saveDetail(dayId, detail);
      return;
    }

    setEditingDetailId((current) => (current === detail.id ? "" : current));
  };

  const deleteDetail = async (dayId, detailId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detailId);
    setError("");

    try {
      await deleteScheduleDetail(detailId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: (current[dayId] || []).filter((detail) => detail.id !== detailId),
      }));
      setSavedDetailsById((current) => {
        const remainingDetails = { ...current };
        delete remainingDetails[detailId];
        return remainingDetails;
      });
      setEditingDetailId("");
      setOpenActionMenuId("");
    } catch (deleteError) {
      console.error(deleteError);
      setError("Could not delete schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const persistDetailOrder = async (dayId, nextDetails) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    const orderedDetails = nextDetails.map((detail, detailIndex) => ({
      ...detail,
      sortOrder: detailIndex,
    }));

    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: orderedDetails,
    }));
    setSavedDetailsById((current) => ({
      ...current,
      ...Object.fromEntries(
        orderedDetails.map((detail) => [
          detail.id,
          {
            time: detail.time || "",
            description: detail.description || "",
            sortOrder: detail.sortOrder,
            colour: normaliseHexColour(detail.colour),
            tagId: detail.tagId || "",
          },
        ])
      ),
    }));
    setReorderingDayId(dayId);
    setError("");

    try {
      await updateScheduleDetailOrder(orderedDetails);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder schedule details.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setReorderingDayId("");
    }
  };

  const reorderDetail = async (dayId, detailId, targetDetailId) => {
    if (!targetDetailId || detailId === targetDetailId || reorderingDayId) return;

    const currentDetails = detailsByDayId[dayId] || [];
    const fromIndex = currentDetails.findIndex((detail) => detail.id === detailId);
    const toIndex = currentDetails.findIndex((detail) => detail.id === targetDetailId);
    if (fromIndex < 0 || toIndex < 0) return;

    const detail = currentDetails[fromIndex];
    const targetDetail = currentDetails[toIndex];
    if ((detail.time || "") !== (targetDetail.time || "")) return;

    const nextDetails = [...currentDetails];
    const [movedDetail] = nextDetails.splice(fromIndex, 1);
    const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
    nextDetails.splice(adjustedToIndex, 0, movedDetail);
    await persistDetailOrder(dayId, nextDetails);
  };

  const moveDetail = async (dayId, detailId, direction) => {
    if (reorderingDayId) return;

    const currentDetails = detailsByDayId[dayId] || [];
    const detailIndex = currentDetails.findIndex((detail) => detail.id === detailId);
    const targetIndex = detailIndex + direction;
    if (detailIndex < 0 || targetIndex < 0 || targetIndex >= currentDetails.length) return;

    const detail = currentDetails[detailIndex];
    const targetDetail = currentDetails[targetIndex];
    if ((detail.time || "") !== (targetDetail.time || "")) return;

    const nextDetails = [...currentDetails];
    [nextDetails[detailIndex], nextDetails[targetIndex]] = [
      nextDetails[targetIndex],
      nextDetails[detailIndex],
    ];
    closeActionMenu();
    await persistDetailOrder(dayId, nextDetails);
  };

  const canMoveDetail = (dayDetails, detailIndex, direction) => {
    const targetDetail = dayDetails[detailIndex + direction];
    if (!targetDetail) return false;
    return (dayDetails[detailIndex]?.time || "") === (targetDetail.time || "");
  };

  const getAdjacentDay = (dayId, direction) => {
    const dayIndex = scheduleDays.findIndex((day) => day.id === dayId);
    if (dayIndex < 0) return null;
    return scheduleDays[dayIndex + direction] || null;
  };

  const getNextSortOrder = (dayId) => {
    return (
      (detailsByDayId[dayId] || []).reduce(
        (maxSortOrder, detail, detailIndex) =>
          Math.max(
            maxSortOrder,
            typeof detail.sortOrder === "number" ? detail.sortOrder : detailIndex
          ),
        -1
      ) + 1
    );
  };

  const moveDetailToDay = async (sourceDayId, targetDayId, detail) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!targetDayId || savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: getNextSortOrder(targetDayId),
        scheduleDayId: targetDayId,
        colour: normaliseHexColour(detail.colour),
        tagId: detail.tagId || "",
      });
      await loadScheduleDetails(scheduleDays);
      setEditingDetailId("");
    } catch (moveError) {
      console.error(moveError);
      setError("Could not move schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const duplicateDetail = async (dayId, detail) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      await createScheduleDetail({
        eventId,
        scheduleDayId: dayId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: getNextSortOrder(dayId),
        colour: normaliseHexColour(detail.colour),
        tagId: detail.tagId || "",
      });
      const details = await getScheduleDetails(dayId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: details,
      }));
      setSavedDetailsById((current) => ({
        ...current,
        ...Object.fromEntries(
          details.map((nextDetail, detailIndex) => [
            nextDetail.id,
            {
              time: nextDetail.time || "",
              description: nextDetail.description || "",
              sortOrder:
                typeof nextDetail.sortOrder === "number" ? nextDetail.sortOrder : detailIndex,
              colour: normaliseHexColour(nextDetail.colour),
              tagId: nextDetail.tagId || "",
            },
          ])
        ),
      }));
    } catch (duplicateError) {
      console.error(duplicateError);
      setError("Could not duplicate schedule detail.");
    } finally {
      setSavingDetailId("");
    }
  };

  const addDraftDetail = (dayId) => {
    if (isOffline) return;
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: [
        ...(current[dayId] || []),
        { time: "", description: "", colour: "", tagId: selectedTagFilterId || "" },
      ],
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
        colour: normaliseHexColour(draft.colour),
        tagId: draft.tagId || "",
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
          details.map((detail, detailIndex) => [
            detail.id,
            {
              time: detail.time || "",
              description: detail.description || "",
              sortOrder: typeof detail.sortOrder === "number" ? detail.sortOrder : detailIndex,
              colour: normaliseHexColour(detail.colour),
              tagId: detail.tagId || "",
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
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
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
      setSavedEventForm(form);
      setIsEditingEventDetails(false);
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
          <h1 className="page-title">{form.name || eventId}</h1>
          <ScheduleCacheStatus eventId={eventId} />
        </div>
        <div className="actions inline-actions">
          <Link className="button secondary" to="/events">
            Back
          </Link>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: previously loaded schedules are read-only.</p>
      ) : null}
      {message ? <p className="message success-message">{message}</p> : null}
      {detailsLoading && activeTab === "detail" ? (
        <p className="message">Loading schedule details...</p>
      ) : null}
      {tagsLoading && activeTab === "settings" ? (
        <p className="message">Loading tags...</p>
      ) : null}

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
        <button
          className={activeTab === "settings" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </nav>

      {activeTab === "details" ? (
      <section className="panel">
        <div className="panel-heading">
          <h2>Event</h2>
          {!isEditingEventDetails ? (
            <button
              className="button secondary"
              type="button"
              disabled={isOffline}
              onClick={() => {
                setIsEditingEventDetails(true);
                setMessage("");
                setError("");
              }}
            >
              Edit
            </button>
          ) : null}
        </div>
        <form onSubmit={handleEventSave}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="editName">Name</label>
              {isEditingEventDetails ? (
                <input
                  id="editName"
                  value={form.name}
                  disabled={isOffline}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              ) : (
                <span className="readonly-value">{form.name || "-"}</span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="editClientName">Client</label>
              {isEditingEventDetails ? (
                <input
                  id="editClientName"
                  value={form.clientName}
                  disabled={isOffline}
                  onChange={(event) => updateField("clientName", event.target.value)}
                  required
                />
              ) : (
                <span className="readonly-value">{form.clientName || "-"}</span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="editStartDate">Start date</label>
              {isEditingEventDetails ? (
                <input
                  id="editStartDate"
                  type="date"
                  value={form.startDate}
                  disabled={isOffline}
                  onChange={(event) => updateField("startDate", event.target.value)}
                  required
                />
              ) : (
                <span className="readonly-value">{formatFriendlyDate(form.startDate) || "-"}</span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="editEndDate">End date</label>
              {isEditingEventDetails ? (
                <input
                  id="editEndDate"
                  type="date"
                  value={form.endDate}
                  disabled={isOffline}
                  onChange={(event) => updateField("endDate", event.target.value)}
                  required
                />
              ) : (
                <span className="readonly-value">{formatFriendlyDate(form.endDate) || "-"}</span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="editScheduleStartDate">Schedule start date</label>
              {isEditingEventDetails ? (
                <input
                  id="editScheduleStartDate"
                  type="date"
                  value={form.scheduleStartDate}
                  disabled={isOffline}
                  onChange={(event) => updateField("scheduleStartDate", event.target.value)}
                  required
                />
              ) : (
                <span className="readonly-value">
                  {formatFriendlyDate(form.scheduleStartDate) || "-"}
                </span>
              )}
            </div>
            <div className="form-row">
              <label htmlFor="editScheduleEndDate">Schedule end date</label>
              {isEditingEventDetails ? (
                <input
                  id="editScheduleEndDate"
                  type="date"
                  value={form.scheduleEndDate}
                  disabled={isOffline}
                  onChange={(event) => updateField("scheduleEndDate", event.target.value)}
                  required
                />
              ) : (
                <span className="readonly-value">
                  {formatFriendlyDate(form.scheduleEndDate) || "-"}
                </span>
              )}
            </div>
          </div>
          {isEditingEventDetails ? (
            <div className="actions">
              <button className="button" type="submit" disabled={savingEvent || isOffline}>
                {savingEvent ? "Saving..." : "Save Event"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingEvent || isOffline}
                onClick={cancelEditingEventDetails}
              >
                Cancel
              </button>
            </div>
          ) : null}
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
                            disabled={isOffline}
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
                              disabled={isOffline}
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
                                  disabled={savingDayId === day.id || isOffline}
                                  onClick={() => saveDay(day, editingDayDraft)}
                                >
                                  {savingDayId === day.id ? "Saving..." : "Save"}
                                </button>
                                <button
                                  className="compact-button"
                                  type="button"
                                  disabled={savingDayId === day.id || isOffline}
                                  onClick={cancelEditingDay}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                className="compact-button"
                                type="button"
                                disabled={isOffline}
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
        {usedTags.length > 0 ? (
          <div className="tag-filter-bar" aria-label="Filter schedule rows by tag">
            <button
              className={!selectedTagFilterId ? "tag-filter-button active" : "tag-filter-button"}
              type="button"
              onClick={() => setSelectedTagFilterId("")}
            >
              All tags
            </button>
            {usedTags.map((tag) => (
              <button
                className={
                  selectedTagFilterId === tag.id
                    ? "tag-filter-button active"
                    : "tag-filter-button"
                }
                type="button"
                key={tag.id}
                style={selectedTagFilterId === tag.id ? getTagStyle(tag) : undefined}
                onClick={() =>
                  setSelectedTagFilterId((current) => (current === tag.id ? "" : tag.id))
                }
              >
                <span
                  className="tag-dot"
                  style={{ backgroundColor: normaliseHexColour(tag.colour) }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        ) : null}
        {scheduleDays.length === 0 ? (
          <p className="item-meta">No schedule days yet.</p>
        ) : (
          <section className="list">
            {scheduleDays.map((day) => {
              const allDayDetails = detailsByDayId[day.id] || [];
              const dayDetails = selectedTagFilterId
                ? allDayDetails.filter((detail) => detail.tagId === selectedTagFilterId)
                : allDayDetails;
              const draftDetails = draftDetailsByDayId[day.id] || [];

              return (
                <article className="list-item" key={day.id}>
	                  <div className="day-card-content">
	                    <div className="day-heading">
	                      <div>
	                        <p className="item-title day-title-line">
	                          <span>{formatDetailDate(day.date)}</span>
	                          {day.summary ? (
	                            <span className="item-meta day-title-summary">{day.summary}</span>
	                          ) : null}
	                        </p>
	                      </div>
	                    </div>
                    <div className="day-card-actions">
                      <button
                        className="small-button"
                        type="button"
                        disabled={isOffline}
                        onClick={() => addDraftDetail(day.id)}
                      >
                        Add row
                      </button>
                      <button
                        className="compact-button"
                        type="button"
                        disabled={isOffline}
                        onClick={() => startEditingDay(day, "overlay")}
                      >
                        Edit day
                      </button>
                    </div>

                    {dayDetails.length === 0 && draftDetails.length === 0 ? (
                      <p className="item-meta">
                        {selectedTagFilterId ? "No rows for selected tag." : "No schedule details yet."}
                      </p>
                    ) : (
                      <div className="detail-list">
                        {dayDetails.map((detail, detailIndex) => {
                          const isEditingDetail = editingDetailId === detail.id;
                          const canMoveUp = canMoveDetail(dayDetails, detailIndex, -1);
                          const canMoveDown = canMoveDetail(dayDetails, detailIndex, 1);
                          const previousDay = getAdjacentDay(day.id, -1);
                          const nextDay = getAdjacentDay(day.id, 1);

                          return (
                            <div
                              className={
                                isEditingDetail ? "detail-row" : "detail-row draggable-row"
                              }
                              key={detail.id}
                              style={getRowTagStyle(getTagById(detail.tagId))}
                              draggable={!isEditingDetail && !isOffline}
                              onDragStart={(event) => {
                                draggedDetailIdRef.current = detail.id;
                                event.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(event) => {
                                const draggedDetail = dayDetails.find(
                                  (nextDetail) => nextDetail.id === draggedDetailIdRef.current
                                );
                                if (
                                  draggedDetail &&
                                  draggedDetail.id !== detail.id &&
                                  (draggedDetail.time || "") === (detail.time || "")
                                ) {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                reorderDetail(day.id, draggedDetailIdRef.current, detail.id);
                                draggedDetailIdRef.current = "";
                              }}
                              onDragEnd={() => {
                                draggedDetailIdRef.current = "";
                              }}
                              onBlur={
                                isEditingDetail
                                  ? (event) => saveDetailOnBlur(event, day.id, detail)
                                  : undefined
                              }
                            >
                              {isEditingDetail ? (
                                <>
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
                                </>
                              ) : (
                                <>
                                  <span className="display-text detail-time-display">
                                    {detail.time || ""}
                                  </span>
                                  <span className="display-text">
                                    {detail.description || ""}
                                  </span>
                                </>
                              )}
                              <div
                                className="tag-select-wrap"
                                style={getTagStyle(getTagById(detail.tagId))}
                              >
                                <span
                                  className="tag-dot"
                                  style={{
                                    backgroundColor:
                                      normaliseHexColour(getTagById(detail.tagId)?.colour) ||
                                      "transparent",
                                  }}
                                />
                                <select
                                  aria-label={`Tag for ${detail.description || "schedule detail"}`}
                                  value={getTagById(detail.tagId) ? detail.tagId : ""}
                                  disabled={savingDetailId === detail.id || isOffline}
                                  onChange={(event) =>
                                    assignDetailTag(day.id, detail, event.target.value)
                                  }
                                >
                                  <option value="">No tag</option>
                                  {tags.map((tag) => (
                                    <option key={tag.id} value={tag.id}>
                                      {tag.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="detail-row-actions">
                                {!isEditingDetail ? (
                                  <button
                                    className="compact-button"
                                    type="button"
                                    disabled={isOffline}
                                    onClick={() => startEditingDetail(detail.id)}
                                  >
                                    Edit
                                  </button>
                                ) : null}
                                <div
                                  className="action-menu"
                                  onBlur={(event) => {
                                    if (!event.currentTarget.contains(event.relatedTarget)) {
                                      setOpenActionMenuId("");
                                    }
                                  }}
                                >
                                  <button
                                    className={
                                      openActionMenuId === detail.id
                                        ? "action-menu-trigger active"
                                        : "action-menu-trigger"
                                    }
                                    type="button"
                                    aria-label="Row actions"
                                    aria-expanded={openActionMenuId === detail.id}
                                    disabled={isOffline}
                                    onMouseDown={beginRowAction}
                                    onClick={() => {
                                      setOpenActionMenuId((current) =>
                                        current === detail.id ? "" : detail.id
                                      );
                                      endRowAction();
                                    }}
                                  >
                                    <span aria-hidden="true">...</span>
                                  </button>
                                  {openActionMenuId === detail.id ? (
                                  <div
                                    className="action-menu-list"
                                    onMouseDown={beginRowAction}
                                  >
                                    {!isEditingDetail ? (
                                      <>
                                        <button
                                          className="action-menu-item"
                                          type="button"
                                    disabled={!canMoveUp || reorderingDayId === day.id || isOffline}
                                          onClick={() => {
                                            moveDetail(day.id, detail.id, -1);
                                            endRowAction();
                                          }}
                                        >
                                          Move up
                                        </button>
                                        <button
                                          className="action-menu-item"
                                          type="button"
                                    disabled={!canMoveDown || reorderingDayId === day.id || isOffline}
                                          onClick={() => {
                                            moveDetail(day.id, detail.id, 1);
                                            endRowAction();
                                          }}
                                        >
                                          Move down
                                        </button>
                                        {previousDay ? (
                                          <button
                                            className="action-menu-item"
                                            type="button"
                                            disabled={savingDetailId === detail.id || isOffline}
                                            onClick={() => {
                                              moveDetailToDay(day.id, previousDay.id, detail);
                                              endRowAction();
                                            }}
                                          >
                                            Move to previous day
                                          </button>
                                        ) : null}
                                        {nextDay ? (
                                          <button
                                            className="action-menu-item"
                                            type="button"
                                            disabled={savingDetailId === detail.id || isOffline}
                                            onClick={() => {
                                              moveDetailToDay(day.id, nextDay.id, detail);
                                              endRowAction();
                                            }}
                                          >
                                            Move to next day
                                          </button>
                                        ) : null}
                                        <button
                                          className="action-menu-item"
                                          type="button"
                                          disabled={savingDetailId === detail.id || isOffline}
                                          onClick={() => {
                                            duplicateDetail(day.id, detail);
                                            endRowAction();
                                          }}
                                        >
                                          Duplicate
                                        </button>
                                      </>
                                    ) : null}
                                    {isEditingDetail ? (
                                      <>
                                        <button
                                          className="action-menu-item primary"
                                          type="button"
                                          disabled={savingDetailId === detail.id || isOffline}
                                          onClick={() => {
                                            closeActionMenu();
                                            saveDetail(day.id, detail);
                                            endRowAction();
                                          }}
                                        >
                                          {savingDetailId === detail.id ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                          className="action-menu-item"
                                          type="button"
                                          disabled={savingDetailId === detail.id || isOffline}
                                          onClick={() => {
                                            closeActionMenu();
                                            cancelEditingDetail(day.id, detail.id);
                                            endRowAction();
                                          }}
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : null}
                                    <button
                                      className="action-menu-item danger"
                                      type="button"
                                      disabled={savingDetailId === detail.id || isOffline}
                                      onClick={() => {
                                        closeActionMenu();
                                        deleteDetail(day.id, detail.id);
                                        endRowAction();
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                  ) : null}
                                </div>
                              </div>
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
                            <div
                              className="tag-select-wrap"
                              style={getTagStyle(getTagById(draft.tagId))}
                            >
                              <span
                                className="tag-dot"
                                style={{
                                  backgroundColor:
                                    normaliseHexColour(getTagById(draft.tagId)?.colour) ||
                                    "transparent",
                                }}
                              />
                              <select
                                aria-label="New detail tag"
                                value={getTagById(draft.tagId) ? draft.tagId : ""}
                                disabled={isOffline}
                                onChange={(event) =>
                                  updateDraftDetail(day.id, draftIndex, "tagId", event.target.value)
                                }
                              >
                                <option value="">No tag</option>
                                {tags.map((tag) => (
                                  <option key={tag.id} value={tag.id}>
                                    {tag.name}
                                  </option>
                                ))}
                              </select>
                            </div>
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

      {activeTab === "settings" ? (
      <section className="panel">
        <h2>Settings</h2>
        <nav className="tabs nested-tabs" aria-label="Settings sections">
          <button
            className={activeSettingsTab === "tags" ? "tab active" : "tab"}
            type="button"
            onClick={() => setActiveSettingsTab("tags")}
          >
            Tags
          </button>
        </nav>

        {activeSettingsTab === "tags" ? (
          <div className="settings-section">
            <form className="tag-form" onSubmit={saveTag}>
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="tagName">Tag name</label>
                  <input
                    id="tagName"
                    value={tagForm.name}
                    disabled={isOffline}
                    onChange={(event) => updateTagFormField("name", event.target.value)}
                    placeholder="Confirmed"
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="tagColour">Colour</label>
                  <div className="tag-colour-field">
                    <input
                      id="tagColourPicker"
                      className="colour-picker"
                      aria-label="Tag colour picker"
                      type="color"
                      value={normaliseHexColour(tagForm.colour) || emptyTagForm.colour}
                      disabled={isOffline}
                      onChange={(event) => updateTagFormField("colour", event.target.value)}
                    />
                    <input
                      id="tagColour"
                      value={tagForm.colour}
                      disabled={isOffline}
                      onChange={(event) => updateTagFormField("colour", event.target.value)}
                      placeholder="#DCEEFF"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="actions">
                <button className="button" type="submit" disabled={savingTag || isOffline}>
                  {savingTag ? "Saving..." : editingTagId ? "Save tag" : "Create tag"}
                </button>
                {editingTagId ? (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={savingTag || isOffline}
                    onClick={resetTagForm}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            {tagsLoading ? (
              <p className="item-meta">Loading tags...</p>
            ) : tags.length === 0 ? (
              <p className="item-meta">No tags yet.</p>
            ) : (
              <div className="tag-list">
                {tags.map((tag) => (
                  <div className="tag-list-row" key={tag.id}>
                    <span className="tag-chip" style={getTagStyle(tag)}>
                      <span
                        className="tag-dot"
                        style={{ backgroundColor: normaliseHexColour(tag.colour) }}
                      />
                      {tag.name}
                    </span>
                    <span className="item-meta">{normaliseHexColour(tag.colour)}</span>
                    <div className="tag-list-actions">
                      <button
                        className="compact-button"
                        type="button"
                        disabled={isOffline}
                        onClick={() => startEditingTag(tag)}
                      >
                        Edit
                      </button>
                      <button
                        className="compact-button"
                        type="button"
                        disabled={deletingTagId === tag.id || isOffline}
                        onClick={() => removeTag(tag.id)}
                      >
                        {deletingTagId === tag.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
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
                  disabled={isOffline}
                  onChange={(event) => updateEditingDayField("summary", event.target.value)}
                />
              </div>
              <div className="form-row full">
                <label htmlFor="overlayDayTarget">End of day target</label>
                <input
                  id="overlayDayTarget"
                  value={editingDayDraft.endOfDayTarget}
                  disabled={isOffline}
                  onChange={(event) => updateEditingDayField("endOfDayTarget", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="button"
                disabled={savingDayId === editingDayId || isOffline}
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
                disabled={savingDayId === editingDayId || isOffline}
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
