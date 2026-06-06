import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import Loading from "../components/Loading.jsx";
import ScheduleCacheStatus from "../components/ScheduleCacheStatus.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import { getClients } from "../services/clientService.js";
import {
  getEvent,
  updateEvent,
  updateEventContactCompanyOrder,
} from "../services/eventService.js";
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
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
} from "../services/locationService.js";
import {
  createCompanyContact,
  deleteCompanyContact,
  getCompanyContacts,
  updateCompanyContact,
  updateCompanyContactOrder,
} from "../services/companyContactService.js";
import { getCompanies } from "../services/companyService.js";

const emptyEventForm = {
  name: "",
  clientId: "",
  clientName: "",
  startDate: "",
  endDate: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
  contactCompanyOrder: [],
};

const emptyTagForm = {
  name: "",
  colour: "#DCEEFF",
};

const emptyLocationForm = {
  name: "",
  parentLocationId: "",
};

const emptyCompanyContactForm = {
  name: "",
  email: "",
  phone: "",
  role: "",
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

function formatDateOrdinal(date) {
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? "st" :
    day % 10 === 2 && day !== 12 ? "nd" :
    day % 10 === 3 && day !== 13 ? "rd" :
    "th";
  return `${day}${suffix}`;
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
  const { userProfile, profileLoading, isSuperAdmin, isClientAdmin } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const [form, setForm] = useState(emptyEventForm);
  const [savedEventForm, setSavedEventForm] = useState(emptyEventForm);
  const [isEditingEventDetails, setIsEditingEventDetails] = useState(false);
  const [clients, setClients] = useState([]);
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
  const [locations, setLocations] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyContactsByCompanyId, setCompanyContactsByCompanyId] = useState({});
  const [tagForm, setTagForm] = useState(emptyTagForm);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [companyContactForm, setCompanyContactForm] = useState(emptyCompanyContactForm);
  const [editingTagId, setEditingTagId] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [editingCompanyContactId, setEditingCompanyContactId] = useState("");
  const [editingCompanyContactCompanyId, setEditingCompanyContactCompanyId] = useState("");
  const [editingDetailCell, setEditingDetailCell] = useState(null);
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [selectedTagFilterId, setSelectedTagFilterId] = useState("");
  const [selectedCompanyFilterIds, setSelectedCompanyFilterIds] = useState([]);
  const [openContactCompanyIds, setOpenContactCompanyIds] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [activeInfoTab, setActiveInfoTab] = useState("contacts");
  const [activeSettingsTab, setActiveSettingsTab] = useState("tags");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyContactsLoading, setCompanyContactsLoading] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDayId, setSavingDayId] = useState("");
  const [savingDetailId, setSavingDetailId] = useState("");
  const [savingDraftDayId, setSavingDraftDayId] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState("");
  const [savingCompanyContact, setSavingCompanyContact] = useState(false);
  const [deletingCompanyContactId, setDeletingCompanyContactId] = useState("");
  const [reorderingCompanyContactId, setReorderingCompanyContactId] = useState("");
  const [savingContactCompanyOrder, setSavingContactCompanyOrder] = useState(false);
  const [reorderingDayId, setReorderingDayId] = useState("");
  const [movingLocationId, setMovingLocationId] = useState("");
  const [locationDropTargetId, setLocationDropTargetId] = useState("");
  const [contactCompanyDropTargetId, setContactCompanyDropTargetId] = useState("");
  const [companyContactDropTargetId, setCompanyContactDropTargetId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const suppressDetailBlurRef = useRef(false);
  const detailCellInputRef = useRef(null);
  const draggedDetailIdRef = useRef("");
  const draggedLocationIdRef = useRef("");
  const draggedContactCompanyIdRef = useRef("");
  const draggedCompanyContactIdRef = useRef("");
  const canManageCompanyContacts = isSuperAdmin || isClientAdmin;
  const canManageContactCompanyOrder = canManageCompanyContacts;
  const editableClients = clients.filter((client) => (
    client.isActive !== false || client.id === form.clientId
  ));

  useEffect(() => {
    if (profileLoading) return undefined;

    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setDetailsLoading(false);
      setTagsLoading(false);
      setLocationsLoading(false);
      setCompaniesLoading(false);
      setError("");
      try {
        const event = await getEvent(eventId, userProfile);
        if (cancelled) return;
        if (!event) {
          setError("Event not found.");
          return;
        }

        const [days, clientRecords] = await Promise.all([
          getScheduleDays(eventId),
          isSuperAdmin ? getClients() : Promise.resolve([]),
        ]);
        if (cancelled) return;

        setClients(clientRecords);
        const loadedEventForm = {
          name: event.name || "",
          clientId: event.clientId || "",
          clientName: event.clientName || "",
          startDate: event.startDate || "",
          endDate: event.endDate || "",
          scheduleStartDate: event.scheduleStartDate || event.startDate || "",
          scheduleEndDate: event.scheduleEndDate || event.endDate || "",
          contactCompanyOrder: Array.isArray(event.contactCompanyOrder)
            ? event.contactCompanyOrder
            : [],
        };
        setForm(loadedEventForm);
        setSavedEventForm(loadedEventForm);
        setScheduleDays(days);
        setLoading(false);

        const loadOptionalEditorData = async ({
          label,
          setLoadingState,
          loadData,
          applyData,
          errorMessage,
        }) => {
          setLoadingState(true);
          try {
            const data = await loadData();
            if (cancelled) return;
            applyData(data);
          } catch (optionalLoadError) {
            console.error(`Could not load ${label}.`, optionalLoadError);
            if (!cancelled) {
              setError((currentError) => currentError || errorMessage);
            }
          } finally {
            if (!cancelled) setLoadingState(false);
          }
        };

        await Promise.all([
          loadOptionalEditorData({
            label: "schedule details",
            setLoadingState: setDetailsLoading,
            loadData: () => getScheduleDetailsForEvent(eventId, days.map((day) => day.id)),
            applyData: setDetailsState,
            errorMessage: "Could not load schedule details. Event settings are still available.",
          }),
          loadOptionalEditorData({
            label: "tags",
            setLoadingState: setTagsLoading,
            loadData: () => getTags(eventId),
            applyData: setTags,
            errorMessage: "Could not load tags. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "locations",
            setLoadingState: setLocationsLoading,
            loadData: () => getLocations(eventId),
            applyData: setLocations,
            errorMessage: "Could not load locations. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "companies",
            setLoadingState: setCompaniesLoading,
            loadData: () => getCompanies(loadedEventForm.clientId),
            applyData: setCompanies,
            errorMessage: "Could not load companies. Other event data is still available.",
          }),
        ]);
      } catch (loadError) {
        console.error("Could not load event editor.", loadError);
        if (cancelled) return;
        setError("Could not load event editor.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          setDetailsLoading(false);
          setTagsLoading(false);
          setLocationsLoading(false);
          setCompaniesLoading(false);
        }
      }
    };

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [eventId, profileLoading, userProfile, isSuperAdmin]);

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

  useEffect(() => {
    const closeCompanyDropdownsOnOutsideClick = (event) => {
      if (event.target.closest(".company-dropdown")) return;
      document
        .querySelectorAll(".company-dropdown[open]")
        .forEach((dropdown) => dropdown.removeAttribute("open"));
    };

    document.addEventListener("mousedown", closeCompanyDropdownsOnOutsideClick);
    return () =>
      document.removeEventListener("mousedown", closeCompanyDropdownsOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!editingDetailCell) return;
    window.requestAnimationFrame(() => {
      detailCellInputRef.current?.focus();
      detailCellInputRef.current?.select?.();
    });
  }, [editingDetailCell]);

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

  const locationOptions = useMemo(() => {
    const mainLocations = locations.filter((location) => !location.parentLocationId);
    return mainLocations.flatMap((location) => [
      { ...location, displayName: location.name || "" },
      ...locations
        .filter((subLocation) => subLocation.parentLocationId === location.id)
        .map((subLocation) => ({
          ...subLocation,
          displayName: `${location.name || "Location"} / ${subLocation.name || ""}`,
        })),
    ]);
  }, [locations]);

  const locationTree = useMemo(() => {
    return locations
      .filter((location) => !location.parentLocationId)
      .map((location) => ({
        ...location,
        children: locations.filter((subLocation) => subLocation.parentLocationId === location.id),
      }));
  }, [locations]);

  const usedCompanyIds = useMemo(() => {
    return new Set(
      Object.values(detailsByDayId)
        .flat()
        .flatMap((detail) => detail.companyIds || [])
        .filter(Boolean)
    );
  }, [detailsByDayId]);

  const usedCompanies = useMemo(() => {
    return companies.filter((company) => usedCompanyIds.has(company.id));
  }, [companies, usedCompanyIds]);
  const showTagColumn = tags.length > 0;
  const showLocationColumn = locationOptions.length > 0;
  const showCompanyColumn = companies.length > 0;
  const detailRowGridColumnParts = [
    "76px",
    "minmax(0, 1fr)",
    showTagColumn ? "128px" : "",
    showLocationColumn ? "150px" : "",
    showCompanyColumn ? "150px" : "",
    "auto",
  ].filter(Boolean);
  const detailRowGridColumns = detailRowGridColumnParts.join(" ");
  const detailActionGridColumn = detailRowGridColumnParts.length;
  const getDetailRowStyle = (rowStyle) => ({
    ...rowStyle,
    "--detail-row-columns": detailRowGridColumns,
    "--detail-actions-column": detailActionGridColumn,
  });

  const contactCompanies = useMemo(() => {
    const scheduleDetails = Object.values(detailsByDayId).flat();
    const detailCountByCompanyId = scheduleDetails.reduce((counts, detail) => {
      (detail.companyIds || []).forEach((companyId) => {
        if (!companyId) return;
        counts[companyId] = (counts[companyId] || 0) + 1;
      });
      return counts;
    }, {});

    const companyOrder = Array.isArray(form.contactCompanyOrder)
      ? form.contactCompanyOrder
      : [];
    const orderByCompanyId = new Map(
      companyOrder.map((companyId, companyIndex) => [companyId, companyIndex])
    );

    return usedCompanies
      .map((company) => ({
        ...company,
        scheduleDetailCount: detailCountByCompanyId[company.id] || 0,
      }))
      .sort((companyA, companyB) => {
        const companyAOrder = orderByCompanyId.has(companyA.id)
          ? orderByCompanyId.get(companyA.id)
          : Number.MAX_SAFE_INTEGER;
        const companyBOrder = orderByCompanyId.has(companyB.id)
          ? orderByCompanyId.get(companyB.id)
          : Number.MAX_SAFE_INTEGER;

        if (companyAOrder !== companyBOrder) return companyAOrder - companyBOrder;
        return String(companyA.companyName || "").localeCompare(
          String(companyB.companyName || "")
        );
      });
  }, [detailsByDayId, form.contactCompanyOrder, usedCompanies]);

  const contactCompanyIds = useMemo(
    () => contactCompanies.map((company) => company.id),
    [contactCompanies]
  );

  useEffect(() => {
    setOpenContactCompanyIds((current) => {
      const currentOpenCompanyIds = current.filter((companyId) =>
        contactCompanyIds.includes(companyId)
      );
      const nextCompanyIds = contactCompanyIds.filter(
        (companyId) => !current.includes(companyId)
      );
      return [...currentOpenCompanyIds, ...nextCompanyIds];
    });
  }, [contactCompanyIds]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      if (contactCompanyIds.length === 0) {
        setCompanyContactsByCompanyId({});
        return;
      }

      setCompanyContactsLoading(true);
      try {
        const contacts = await getCompanyContacts(contactCompanyIds);
        if (cancelled) return;
        setCompanyContactsByCompanyId(
          Object.fromEntries(
            contactCompanyIds.map((companyId) => [
              companyId,
              contacts.filter((contact) => contact.companyId === companyId),
            ])
          )
        );
      } catch (loadError) {
        console.error("Could not load company contacts.", loadError);
        if (!cancelled) setError("Could not load company contacts.");
      } finally {
        if (!cancelled) setCompanyContactsLoading(false);
      }
    };

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [contactCompanyIds]);

  useEffect(() => {
    if (selectedTagFilterId && !usedTagIds.has(selectedTagFilterId)) {
      setSelectedTagFilterId("");
    }
  }, [selectedTagFilterId, usedTagIds]);

  useEffect(() => {
    setSelectedCompanyFilterIds((current) =>
      current.filter((companyId) => usedCompanyIds.has(companyId))
    );
  }, [usedCompanyIds]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateClient = (clientId) => {
    const selectedClient = clients.find((client) => client.id === clientId);
    setForm((current) => ({
      ...current,
      clientId,
      clientName: selectedClient?.clientName || current.clientName,
    }));
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

  const loadLocations = async () => {
    setLocationsLoading(true);
    try {
      setLocations(await getLocations(eventId));
    } catch (loadError) {
      console.error("Could not load locations.", loadError);
      setError("Could not load locations.");
    } finally {
      setLocationsLoading(false);
    }
  };

  const loadCompanies = async (clientId = form.clientId) => {
    setCompaniesLoading(true);
    try {
      setCompanies(await getCompanies(clientId));
    } catch (loadError) {
      console.error("Could not load companies.", loadError);
      setError("Could not load companies.");
    } finally {
      setCompaniesLoading(false);
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
              locationId: detail.locationId || "",
              companyIds: detail.companyIds || [],
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

  const toggleCompanyFilter = (companyId) => {
    setSelectedCompanyFilterIds((current) =>
      current.includes(companyId)
        ? current.filter((currentCompanyId) => currentCompanyId !== companyId)
        : [...current, companyId]
    );
  };

  const toggleContactCompanyOpen = (companyId) => {
    setOpenContactCompanyIds((current) =>
      current.includes(companyId)
        ? current.filter((currentCompanyId) => currentCompanyId !== companyId)
        : [...current, companyId]
    );
  };

  const reloadCompanyContacts = async (companyIds = contactCompanyIds) => {
    if (companyIds.length === 0) {
      setCompanyContactsByCompanyId({});
      return;
    }

    setCompanyContactsLoading(true);
    try {
      const contacts = await getCompanyContacts(companyIds);
      setCompanyContactsByCompanyId(
        Object.fromEntries(
          companyIds.map((companyId) => [
            companyId,
            contacts.filter((contact) => contact.companyId === companyId),
          ])
        )
      );
    } catch (loadError) {
      console.error("Could not load company contacts.", loadError);
      setError("Could not load company contacts.");
    } finally {
      setCompanyContactsLoading(false);
    }
  };

  const updateCompanyContactFormField = (field, value) => {
    setCompanyContactForm((current) => ({ ...current, [field]: value }));
  };

  const resetCompanyContactForm = () => {
    setEditingCompanyContactId("");
    setEditingCompanyContactCompanyId("");
    setCompanyContactForm(emptyCompanyContactForm);
  };

  const startAddingCompanyContact = (companyId) => {
    if (!canManageCompanyContacts || isOffline) return;
    setEditingCompanyContactId("");
    setEditingCompanyContactCompanyId(companyId);
    setCompanyContactForm(emptyCompanyContactForm);
    setMessage("");
    setError("");
  };

  const startEditingCompanyContact = (companyId, contact) => {
    if (!canManageCompanyContacts || isOffline) return;
    setEditingCompanyContactId(contact.id);
    setEditingCompanyContactCompanyId(companyId);
    setCompanyContactForm({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      role: contact.role || "",
    });
    setMessage("");
    setError("");
  };

  const saveCompanyContact = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanyContacts) {
      setError("Your role cannot manage company contacts.");
      return;
    }
    if (!editingCompanyContactCompanyId) return;

    const name = companyContactForm.name.trim();
    const email = companyContactForm.email.trim();
    const phone = companyContactForm.phone.trim();
    const role = companyContactForm.role.trim();
    if (!name) {
      setError("Contact name is required.");
      return;
    }

    setSavingCompanyContact(true);
    setMessage("");
    setError("");

    try {
      if (editingCompanyContactId) {
        await updateCompanyContact(editingCompanyContactId, {
          companyId: editingCompanyContactCompanyId,
          name,
          email,
          phone,
          role,
        });
        setMessage("Company contact saved.");
      } else {
        await createCompanyContact({
          companyId: editingCompanyContactCompanyId,
          name,
          email,
          phone,
          role,
        });
        setMessage("Company contact created.");
      }

      resetCompanyContactForm();
      await reloadCompanyContacts();
    } catch (contactError) {
      console.error(contactError);
      setError("Could not save company contact.");
    } finally {
      setSavingCompanyContact(false);
    }
  };

  const removeCompanyContact = async (contactId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageCompanyContacts) {
      setError("Your role cannot manage company contacts.");
      return;
    }

    setDeletingCompanyContactId(contactId);
    setMessage("");
    setError("");

    try {
      await deleteCompanyContact(contactId);
      if (editingCompanyContactId === contactId) resetCompanyContactForm();
      await reloadCompanyContacts();
      setMessage("Company contact deleted.");
    } catch (contactError) {
      console.error(contactError);
      setError("Could not delete company contact.");
    } finally {
      setDeletingCompanyContactId("");
    }
  };

  const reorderCompanyContact = async (companyId, sourceContactId, targetContactId) => {
    if (!canManageCompanyContacts || isOffline || reorderingCompanyContactId) return;
    if (!companyId || !sourceContactId || !targetContactId || sourceContactId === targetContactId) {
      return;
    }

    const currentContacts = companyContactsByCompanyId[companyId] || [];
    const sourceIndex = currentContacts.findIndex((contact) => contact.id === sourceContactId);
    const targetIndex = currentContacts.findIndex((contact) => contact.id === targetContactId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextContacts = [...currentContacts];
    const [movedContact] = nextContacts.splice(sourceIndex, 1);
    nextContacts.splice(targetIndex, 0, movedContact);
    const orderedContacts = nextContacts.map((contact, contactIndex) => ({
      ...contact,
      sortOrder: contactIndex,
    }));

    setCompanyContactsByCompanyId((current) => ({
      ...current,
      [companyId]: orderedContacts,
    }));
    setCompanyContactDropTargetId("");
    setReorderingCompanyContactId(companyId);
    setMessage("");
    setError("");

    try {
      await updateCompanyContactOrder(orderedContacts);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder company contacts.");
      await reloadCompanyContacts();
    } finally {
      setReorderingCompanyContactId("");
    }
  };

  const reorderContactCompany = async (sourceCompanyId, targetCompanyId) => {
    if (!canManageContactCompanyOrder || isOffline || savingContactCompanyOrder) return;
    if (!sourceCompanyId || !targetCompanyId || sourceCompanyId === targetCompanyId) return;

    const companyIds = contactCompanies.map((company) => company.id);
    const sourceIndex = companyIds.indexOf(sourceCompanyId);
    const targetIndex = companyIds.indexOf(targetCompanyId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextCompanyIds = [...companyIds];
    const [movedCompanyId] = nextCompanyIds.splice(sourceIndex, 1);
    nextCompanyIds.splice(targetIndex, 0, movedCompanyId);

    setForm((current) => ({
      ...current,
      contactCompanyOrder: nextCompanyIds,
    }));
    setContactCompanyDropTargetId("");
    setSavingContactCompanyOrder(true);
    setMessage("");
    setError("");

    try {
      await updateEventContactCompanyOrder(eventId, nextCompanyIds, userProfile);
      setSavedEventForm((current) => ({
        ...current,
        contactCompanyOrder: nextCompanyIds,
      }));
    } catch (orderError) {
      console.error(orderError);
      setError("Could not save contact company order.");
      setForm((current) => ({
        ...current,
        contactCompanyOrder: savedEventForm.contactCompanyOrder || [],
      }));
    } finally {
      setSavingContactCompanyOrder(false);
    }
  };

  const getTagById = (tagId) => tags.find((tag) => tag.id === tagId) || null;
  const getLocationById = (locationId) =>
    locationOptions.find((location) => location.id === locationId) || null;
  const getCompanyLabel = (companyIds = []) => {
    const selectedCompanies = companies.filter((company) => companyIds.includes(company.id));
    if (selectedCompanies.length === 0) return "No company";
    if (selectedCompanies.length === 1) return selectedCompanies[0].companyName;
    return `${selectedCompanies.length} companies`;
  };
  const toggleCompanyIds = (companyIds = [], companyId) =>
    companyIds.includes(companyId)
      ? companyIds.filter((currentCompanyId) => currentCompanyId !== companyId)
      : [...companyIds, companyId];
  const getNoRowsMessage = () => {
    if (selectedTagFilterId && selectedCompanyFilterIds.length > 0) {
      return "No rows for selected tag and companies.";
    }
    if (selectedTagFilterId) return "No rows for selected tag.";
    if (selectedCompanyFilterIds.length > 0) return "No rows for selected companies.";
    return "No schedule details yet.";
  };

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
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
          colour: normaliseHexColour(detail.colour),
          tagId,
          locationId: detail.locationId || "",
          companyIds: detail.companyIds || [],
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

  const assignDetailLocation = async (dayId, detail, locationId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, locationId } : nextDetail
      ),
    }));

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: detail.sortOrder,
        colour: normaliseHexColour(detail.colour),
        tagId: detail.tagId || "",
        locationId,
        companyIds: detail.companyIds || [],
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
          colour: normaliseHexColour(detail.colour),
          tagId: detail.tagId || "",
          locationId,
          companyIds: detail.companyIds || [],
        },
      }));
    } catch (locationError) {
      console.error(locationError);
      setError("Could not update row location.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const assignDetailCompanies = async (dayId, detail, companyIds) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, companyIds } : nextDetail
      ),
    }));

    try {
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: detail.sortOrder,
        colour: normaliseHexColour(detail.colour),
        tagId: detail.tagId || "",
        locationId: detail.locationId || "",
        companyIds,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
          colour: normaliseHexColour(detail.colour),
          tagId: detail.tagId || "",
          locationId: detail.locationId || "",
          companyIds,
        },
      }));
    } catch (companyError) {
      console.error(companyError);
      setError("Could not update row company.");
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

  const updateLocationFormField = (field, value) => {
    setLocationForm((current) => ({ ...current, [field]: value }));
  };

  const resetLocationForm = () => {
    setEditingLocationId("");
    setLocationForm(emptyLocationForm);
  };

  const startEditingLocation = (location) => {
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name || "",
      parentLocationId: location.parentLocationId || "",
    });
    setError("");
    setMessage("");
  };

  const startAddingSubLocation = (location) => {
    if (isOffline || location.parentLocationId) return;
    setEditingLocationId("");
    setLocationForm({
      name: "",
      parentLocationId: location.id,
    });
    setError("");
    setMessage("");
  };

  const saveLocation = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingLocation(true);
    setError("");
    setMessage("");

    try {
      const name = locationForm.name.trim();
      const parentLocationId = locationForm.parentLocationId || "";
      if (!name) {
        setError("Location name is required.");
        return;
      }
      if (editingLocationId && parentLocationId === editingLocationId) {
        setError("A location cannot be its own parent.");
        return;
      }
      if (
        parentLocationId &&
        locations.find((location) => location.id === parentLocationId)?.parentLocationId
      ) {
        setError("Sub-locations cannot contain other sub-locations.");
        return;
      }

      if (editingLocationId) {
        await updateLocation(editingLocationId, { name, parentLocationId });
        setMessage("Location saved.");
      } else {
        await createLocation({ eventId, name, parentLocationId });
        setMessage("Location created.");
      }
      resetLocationForm();
      await loadLocations();
    } catch (locationError) {
      console.error(locationError);
      setError("Could not save location.");
    } finally {
      setSavingLocation(false);
    }
  };

  const moveLocation = async (locationId, parentLocationId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    const location = locations.find((currentLocation) => currentLocation.id === locationId);
    const parentLocation = parentLocationId
      ? locations.find((currentLocation) => currentLocation.id === parentLocationId)
      : null;
    if (!location || location.parentLocationId === parentLocationId) return;
    if (locationId === parentLocationId) {
      setError("A location cannot be moved under itself.");
      return;
    }
    if (parentLocation?.parentLocationId) {
      setError("Sub-locations cannot contain other sub-locations.");
      return;
    }
    const childLocations = locations.filter(
      (currentLocation) => currentLocation.parentLocationId === locationId
    );

    setMovingLocationId(locationId);
    setLocationDropTargetId("");
    setError("");
    setMessage("");
    setLocations((current) =>
      current.map((currentLocation) => {
        if (currentLocation.id === locationId) return { ...currentLocation, parentLocationId };
        if (parentLocationId && currentLocation.parentLocationId === locationId) {
          return { ...currentLocation, parentLocationId: "" };
        }
        return currentLocation;
      })
    );

    try {
      await Promise.all([
        updateLocation(locationId, {
          name: location.name || "",
          parentLocationId,
        }),
        ...(parentLocationId
          ? childLocations.map((childLocation) =>
              updateLocation(childLocation.id, {
                name: childLocation.name || "",
                parentLocationId: "",
              })
            )
          : []),
      ]);
      if (editingLocationId === locationId) {
        setLocationForm((current) => ({ ...current, parentLocationId }));
      }
      setMessage(
        parentLocationId && childLocations.length > 0
          ? "Location moved. Its sub-locations were promoted to main locations."
          : parentLocationId
            ? "Location moved."
            : "Location moved to main locations."
      );
    } catch (locationError) {
      console.error(locationError);
      setError("Could not move location.");
      await loadLocations();
    } finally {
      setMovingLocationId("");
    }
  };

  const removeLocation = async (locationId) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    const childLocationIds = locations
      .filter((location) => location.parentLocationId === locationId)
      .map((location) => location.id);
    const locationIdsToDelete = [locationId, ...childLocationIds];

    setDeletingLocationId(locationId);
    setError("");
    setMessage("");

    try {
      await Promise.all(locationIdsToDelete.map((nextLocationId) => deleteLocation(nextLocationId)));
      if (locationIdsToDelete.includes(editingLocationId)) resetLocationForm();
      await loadLocations();
      setMessage(
        childLocationIds.length > 0
          ? "Location and sub-locations deleted."
          : "Location deleted."
      );
    } catch (locationError) {
      console.error(locationError);
      setError("Could not delete location.");
    } finally {
      setDeletingLocationId("");
    }
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

  const isEditingDetailCell = (detailId, field) =>
    editingDetailCell?.detailId === detailId && editingDetailCell?.field === field;

  const startEditingDetailCell = (dayId, detailId, field) => {
    if (isOffline) return;
    setEditingDetailCell({ dayId, detailId, field });
    setOpenActionMenuId("");
    setMessage("");
    setError("");
  };

  const cancelEditingDetailCell = (dayId, detailId, field) => {
    const savedDetail = savedDetailsById[detailId];
    if (savedDetail) {
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: (current[dayId] || []).map((detail) =>
          detail.id === detailId ? { ...detail, [field]: savedDetail[field] || "" } : detail
        ),
      }));
    }
    setEditingDetailCell(null);
    setOpenActionMenuId("");
  };

  const saveDetailCell = async (dayId, detail, nextCell = null) => {
    if (isOffline) {
      setError("Editing is disabled while offline.");
      return;
    }
    const savedDetail = savedDetailsById[detail.id] || {};
    const hasCellChanges =
      (detail.time || "") !== (savedDetail.time || "") ||
      (detail.description || "") !== (savedDetail.description || "");

    if (!hasCellChanges) {
      setEditingDetailCell(nextCell);
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
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
          colour: normaliseHexColour(detail.colour),
          tagId: detail.tagId || "",
          locationId: detail.locationId || "",
          companyIds: detail.companyIds || [],
        },
      }));
      setEditingDetailCell(nextCell);
      setOpenActionMenuId("");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule detail.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const getNextDetailCell = (dayId, dayDetails, detailIndex, field, shiftKey) => {
    if (shiftKey) {
      if (field === "description") {
        return { dayId, detailId: dayDetails[detailIndex].id, field: "time" };
      }
      const previousDetail = dayDetails[detailIndex - 1];
      return previousDetail ? { dayId, detailId: previousDetail.id, field: "description" } : null;
    }

    if (field === "time") {
      return { dayId, detailId: dayDetails[detailIndex].id, field: "description" };
    }
    const nextDetail = dayDetails[detailIndex + 1];
    return nextDetail ? { dayId, detailId: nextDetail.id, field: "time" } : null;
  };

  const handleDetailCellKeyDown = (event, dayId, dayDetails, detail, detailIndex, field) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditingDetailCell(dayId, detail.id, field);
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      suppressDetailBlurRef.current = true;
      saveDetailCell(
        dayId,
        detail,
        getNextDetailCell(dayId, dayDetails, detailIndex, field, event.shiftKey)
      ).finally(() => {
        setTimeout(() => {
          suppressDetailBlurRef.current = false;
        }, 0);
      });
    }
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
      setEditingDetailCell((current) => (current?.detailId === detailId ? null : current));
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
            locationId: detail.locationId || "",
            companyIds: detail.companyIds || [],
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
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
      await loadScheduleDetails(scheduleDays);
      setEditingDetailCell((current) => (current?.detailId === detail.id ? null : current));
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
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
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
              locationId: nextDetail.locationId || "",
              companyIds: nextDetail.companyIds || [],
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
        {
          time: "",
          description: "",
          colour: "",
          tagId: selectedTagFilterId || "",
          locationId: "",
          companyIds: [],
        },
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
        locationId: draft.locationId || "",
        companyIds: draft.companyIds || [],
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
              locationId: detail.locationId || "",
              companyIds: detail.companyIds || [],
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
      if (form.startDate > form.endDate) {
        setError("Event start date must be before or equal to event end date.");
        return;
      }

      if (form.scheduleStartDate > form.scheduleEndDate) {
        setError("Schedule start date must be before or equal to schedule end date.");
        return;
      }

      const selectedClient = clients.find((client) => client.id === form.clientId);
      const nextEventForm = {
        ...form,
        clientName: selectedClient?.clientName || form.clientName,
      };
      await updateEvent(
        eventId,
        nextEventForm,
        userProfile
      );
      const days = await syncScheduleDaysToRange(
        eventId,
        form.scheduleStartDate,
        form.scheduleEndDate
      );
      setForm(nextEventForm);
      setSavedEventForm(nextEventForm);
      setIsEditingEventDetails(false);
      applyScheduleDays(days);
      await loadCompanies(nextEventForm.clientId);
      setMessage("Event saved.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save event or sync schedule days.");
    } finally {
      setSavingEvent(false);
    }
  };

  const renderLocationNode = (location) => (
    <div className="location-tree-item" key={location.id}>
      <div
        className={[
          "location-list-row",
          locationDropTargetId === location.id ? "drop-target" : "",
          movingLocationId === location.id ? "is-moving" : "",
        ].filter(Boolean).join(" ")}
        draggable={!isOffline && movingLocationId !== location.id}
        onDragStart={(event) => {
          draggedLocationIdRef.current = location.id;
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          const draggedLocationId = draggedLocationIdRef.current;
          if (location.parentLocationId) {
            event.stopPropagation();
            return;
          }
          if (
            !draggedLocationId ||
            draggedLocationId === location.id
          ) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setLocationDropTargetId(location.id);
        }}
        onDragLeave={() => {
          setLocationDropTargetId((current) => (current === location.id ? "" : current));
        }}
        onDrop={(event) => {
          if (location.parentLocationId) {
            event.stopPropagation();
            draggedLocationIdRef.current = "";
            setLocationDropTargetId("");
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const draggedLocationId = draggedLocationIdRef.current;
          draggedLocationIdRef.current = "";
          setLocationDropTargetId("");
          if (draggedLocationId) moveLocation(draggedLocationId, location.id);
        }}
        onDragEnd={() => {
          draggedLocationIdRef.current = "";
          setLocationDropTargetId("");
        }}
      >
        <button
          className="location-name-button"
          type="button"
          disabled={isOffline || Boolean(location.parentLocationId)}
          onClick={() => startAddingSubLocation(location)}
          title={
            location.parentLocationId
              ? undefined
              : `Add sub-location under ${location.name || "location"}`
          }
        >
          <span className="item-title">{location.name}</span>
          <span className="item-meta">
            {location.parentLocationId ? "Sub-location" : "Main location"}
          </span>
        </button>
        <div className="location-list-actions">
          <button
            className="compact-button"
            type="button"
            disabled={isOffline}
            onClick={() => startEditingLocation(location)}
          >
            Edit
          </button>
          <button
            className="compact-button"
            type="button"
            disabled={deletingLocationId === location.id || isOffline}
            onClick={() => removeLocation(location.id)}
          >
            {deletingLocationId === location.id ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
      {location.children.length > 0 ? (
        <div className="location-tree-children">
          {location.children.map((childLocation) =>
            renderLocationNode({ ...childLocation, children: [] })
          )}
        </div>
      ) : null}
    </div>
  );

  if (loading) return <Loading label="Loading event editor..." />;

  return (
    <main className="page">
      <section className="event-edit-header">
        <div className="event-edit-header-summary">
          <div>
            <h1 className="event-edit-title">{form.name || eventId}</h1>
            <p className="event-edit-date-range">
              {formatEventDateRange(form.startDate, form.endDate) || "No event dates"}
            </p>
            <ScheduleCacheStatus eventId={eventId} />
          </div>
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

        {isEditingEventDetails ? (
          <form className="event-header-form" onSubmit={handleEventSave}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="editName">Name</label>
                <input
                  id="editName"
                  value={form.name}
                  disabled={isOffline}
                  onChange={(event) => updateField("name", event.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor={isSuperAdmin ? "editClientId" : "editClientName"}>Client</label>
                {isSuperAdmin ? (
                  <select
                    id="editClientId"
                    value={form.clientId}
                    disabled={isOffline}
                    onChange={(event) => updateClient(event.target.value)}
                    required
                  >
                    <option value="">Choose a client</option>
                    {editableClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.clientName}{client.isActive === false ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="editClientName"
                    value={form.clientName}
                    disabled
                    required
                  />
                )}
              </div>
              <div className="form-row">
                <label htmlFor="editStartDate">Start date</label>
                <input
                  id="editStartDate"
                  type="date"
                  value={form.startDate}
                  disabled={isOffline}
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
                  disabled={isOffline}
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
                  disabled={isOffline}
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
                  disabled={isOffline}
                  onChange={(event) => updateField("scheduleEndDate", event.target.value)}
                  required
                />
              </div>
            </div>
            <div className="actions">
              <button className="button" type="submit" disabled={savingEvent || isOffline}>
                {savingEvent ? "Saving..." : "Save event"}
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
          </form>
        ) : null}
      </section>

      {error ? <p className="error">{error}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: previously loaded schedules are read-only.</p>
      ) : null}
      {message ? <p className="message success-message">{message}</p> : null}
      {isSuperAdmin && !form.clientId ? (
        <p className="message warning-message">
          This event does not have a clientId yet. Choose a client and save the event to finish the assignment.
        </p>
      ) : null}
      {detailsLoading && (activeTab === "info" || activeTab === "detail") ? (
        <p className="message">Loading schedule details...</p>
      ) : null}
      {tagsLoading && activeTab === "settings" ? (
        <p className="message">Loading tags...</p>
      ) : null}
      {locationsLoading && activeTab === "settings" ? (
        <p className="message">Loading locations...</p>
      ) : null}
      {companiesLoading && (activeTab === "info" || activeTab === "detail") ? (
        <p className="message">Loading companies...</p>
      ) : null}

      <nav className="tabs" aria-label="Event edit sections">
        <button
          className={activeTab === "info" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveTab("info")}
        >
          Info
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

      {activeTab === "info" ? (
      <section className="panel">
        <h2>Info</h2>
        <nav className="tabs nested-tabs" aria-label="Info sections">
          <button
            className={activeInfoTab === "contacts" ? "tab active" : "tab"}
            type="button"
            onClick={() => setActiveInfoTab("contacts")}
          >
            Contacts
          </button>
          <button
            className={activeInfoTab === "keyInfo" ? "tab active" : "tab"}
            type="button"
            onClick={() => setActiveInfoTab("keyInfo")}
          >
            Key Info
          </button>
        </nav>

        {activeInfoTab === "contacts" ? (
          <div className="settings-section">
            {detailsLoading || companiesLoading ? (
              <p className="item-meta">Loading contacts...</p>
            ) : contactCompanies.length === 0 ? (
              <p className="item-meta">No companies are tagged in this event schedule yet.</p>
            ) : (
              <div className="company-list">
                {contactCompanies.map((company) => {
                  const companyContacts = companyContactsByCompanyId[company.id] || [];
                  const isEditingThisCompanyContact =
                    editingCompanyContactCompanyId === company.id;
                  const isCompanyOpen = openContactCompanyIds.includes(company.id);

                  return (
                    <div
                      className={[
                        "company-list-row",
                        canManageContactCompanyOrder && !isOffline ? "draggable-company-row" : "",
                        contactCompanyDropTargetId === company.id ? "drop-target" : "",
                      ].filter(Boolean).join(" ")}
                      key={company.id}
                      draggable={canManageContactCompanyOrder && !isOffline && !savingContactCompanyOrder}
                      onDragStart={(event) => {
                        if (event.target.closest(".company-contact-row")) return;
                        if (!canManageContactCompanyOrder || isOffline) return;
                        draggedContactCompanyIdRef.current = company.id;
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(event) => {
                        if (
                          !canManageContactCompanyOrder ||
                          isOffline ||
                          savingContactCompanyOrder ||
                          !draggedContactCompanyIdRef.current ||
                          draggedContactCompanyIdRef.current === company.id
                        ) {
                          return;
                        }
                        event.preventDefault();
                        event.dataTransfer.dropEffect = "move";
                        setContactCompanyDropTargetId(company.id);
                      }}
                      onDragLeave={() => {
                        setContactCompanyDropTargetId((current) =>
                          current === company.id ? "" : current
                        );
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const draggedCompanyId = draggedContactCompanyIdRef.current;
                        draggedContactCompanyIdRef.current = "";
                        reorderContactCompany(draggedCompanyId, company.id);
                      }}
                      onDragEnd={() => {
                        draggedContactCompanyIdRef.current = "";
                        setContactCompanyDropTargetId("");
                      }}
                    >
                      <div>
                        <div className="company-accordion-heading">
                          <button
                            className="company-accordion-trigger"
                            type="button"
                            aria-expanded={isCompanyOpen}
                            onClick={() => toggleContactCompanyOpen(company.id)}
                          >
                            <span className="accordion-indicator" aria-hidden="true">
                              {isCompanyOpen ? "v" : ">"}
                            </span>
                            <span>
                              <span className="company-accordion-title">
                                {company.companyName || "Unnamed company"}
                              </span>
                              <span className="item-meta company-accordion-meta">
                                {companyContacts.length} contact
                                {companyContacts.length === 1 ? "" : "s"}
                              </span>
                            </span>
                          </button>
                          {canManageCompanyContacts ? (
                            <button
                              className="compact-button"
                              type="button"
                              disabled={isOffline || savingCompanyContact}
                              onClick={() => startAddingCompanyContact(company.id)}
                            >
                              Add contact
                            </button>
                          ) : null}
                        </div>

                        {isCompanyOpen ? (
                          <div className="company-accordion-body">
                            {company.address ? (
                              <p className="item-meta company-address">{company.address}</p>
                            ) : null}

                            {companyContactsLoading ? (
                              <p className="item-meta">Loading contacts...</p>
                            ) : companyContacts.length === 0 ? (
                              <p className="item-meta">No contacts yet.</p>
                            ) : (
                              <div className="company-contact-list">
                                {companyContacts.map((contact) => (
                                  <div
                                    className={[
                                      "company-contact-row",
                                      canManageCompanyContacts && !isOffline
                                        ? "draggable-contact-row"
                                        : "",
                                      companyContactDropTargetId === contact.id
                                        ? "drop-target"
                                        : "",
                                    ].filter(Boolean).join(" ")}
                                    key={contact.id}
                                    draggable={
                                      canManageCompanyContacts &&
                                      !isOffline &&
                                      reorderingCompanyContactId !== company.id
                                    }
                                    onDragStart={(event) => {
                                      if (!canManageCompanyContacts || isOffline) return;
                                      event.stopPropagation();
                                      draggedCompanyContactIdRef.current = contact.id;
                                      event.dataTransfer.effectAllowed = "move";
                                    }}
                                    onDragOver={(event) => {
                                      if (
                                        !canManageCompanyContacts ||
                                        isOffline ||
                                        reorderingCompanyContactId ||
                                        !draggedCompanyContactIdRef.current ||
                                        draggedCompanyContactIdRef.current === contact.id
                                      ) {
                                        return;
                                      }
                                      event.preventDefault();
                                      event.stopPropagation();
                                      event.dataTransfer.dropEffect = "move";
                                      setCompanyContactDropTargetId(contact.id);
                                    }}
                                    onDragLeave={() => {
                                      setCompanyContactDropTargetId((current) =>
                                        current === contact.id ? "" : current
                                      );
                                    }}
                                    onDrop={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      const draggedContactId = draggedCompanyContactIdRef.current;
                                      draggedCompanyContactIdRef.current = "";
                                      reorderCompanyContact(company.id, draggedContactId, contact.id);
                                    }}
                                    onDragEnd={(event) => {
                                      event.stopPropagation();
                                      draggedCompanyContactIdRef.current = "";
                                      setCompanyContactDropTargetId("");
                                    }}
                                  >
                                    <div>
                                      <p className="item-title">{contact.name}</p>
                                      {contact.role ? (
                                        <p className="item-meta">{contact.role}</p>
                                      ) : null}
                                      <div className="company-contact-methods">
                                        {contact.email ? (
                                          <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                        ) : null}
                                        {contact.phone ? (
                                          <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                                        ) : null}
                                      </div>
                                    </div>
                                    {canManageCompanyContacts ? (
                                      <div className="company-list-actions">
                                        <span className="contact-drag-handle" aria-hidden="true">
                                          {reorderingCompanyContactId === company.id
                                            ? "Saving"
                                            : "Drag"}
                                        </span>
                                        <button
                                          className="compact-button"
                                          type="button"
                                          disabled={isOffline || savingCompanyContact}
                                          onClick={() => startEditingCompanyContact(company.id, contact)}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          className="compact-button"
                                          type="button"
                                          disabled={
                                            deletingCompanyContactId === contact.id ||
                                            isOffline ||
                                            savingCompanyContact
                                          }
                                          onClick={() => removeCompanyContact(contact.id)}
                                        >
                                          {deletingCompanyContactId === contact.id
                                            ? "Deleting..."
                                            : "Delete"}
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            )}

                            {canManageCompanyContacts && isEditingThisCompanyContact ? (
                              <form className="company-contact-form" onSubmit={saveCompanyContact}>
                                <div className="form-grid">
                                  <div className="form-row">
                                    <label htmlFor={`companyContactName-${company.id}`}>Name</label>
                                    <input
                                      id={`companyContactName-${company.id}`}
                                      value={companyContactForm.name}
                                      disabled={savingCompanyContact || isOffline}
                                      onChange={(event) =>
                                        updateCompanyContactFormField("name", event.target.value)
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="form-row">
                                    <label htmlFor={`companyContactRole-${company.id}`}>Role</label>
                                    <input
                                      id={`companyContactRole-${company.id}`}
                                      value={companyContactForm.role}
                                      disabled={savingCompanyContact || isOffline}
                                      onChange={(event) =>
                                        updateCompanyContactFormField("role", event.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="form-row">
                                    <label htmlFor={`companyContactEmail-${company.id}`}>Email</label>
                                    <input
                                      id={`companyContactEmail-${company.id}`}
                                      type="email"
                                      value={companyContactForm.email}
                                      disabled={savingCompanyContact || isOffline}
                                      onChange={(event) =>
                                        updateCompanyContactFormField("email", event.target.value)
                                      }
                                    />
                                  </div>
                                  <div className="form-row">
                                    <label htmlFor={`companyContactPhone-${company.id}`}>Phone</label>
                                    <input
                                      id={`companyContactPhone-${company.id}`}
                                      type="tel"
                                      value={companyContactForm.phone}
                                      disabled={savingCompanyContact || isOffline}
                                      onChange={(event) =>
                                        updateCompanyContactFormField("phone", event.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                                <div className="actions">
                                  <button
                                    className="button"
                                    type="submit"
                                    disabled={savingCompanyContact || isOffline}
                                  >
                                    {savingCompanyContact
                                      ? "Saving..."
                                      : editingCompanyContactId
                                        ? "Save contact"
                                        : "Create contact"}
                                  </button>
                                  <button
                                    className="button secondary"
                                    type="button"
                                    disabled={savingCompanyContact || isOffline}
                                    onClick={resetCompanyContactForm}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </form>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      {canManageContactCompanyOrder ? (
                        <span className="drag-handle" aria-hidden="true">
                          {savingContactCompanyOrder ? "Saving" : "Drag"}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {activeInfoTab === "keyInfo" ? (
          <div className="placeholder-panel">
            <div>
              <h2>Key Info</h2>
              <p className="item-meta">Placeholder content.</p>
            </div>
          </div>
        ) : null}
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
        {usedTags.length > 0 || usedCompanies.length > 0 ? (
          <div className="filter-groups" aria-label="Filter schedule rows">
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
            {usedCompanies.length > 0 ? (
              <div className="tag-filter-bar" aria-label="Filter schedule rows by company">
                <button
                  className={
                    selectedCompanyFilterIds.length === 0
                      ? "tag-filter-button active"
                      : "tag-filter-button"
                  }
                  type="button"
                  onClick={() => setSelectedCompanyFilterIds([])}
                >
                  All companies
                </button>
                {usedCompanies.map((company) => (
                  <button
                    className={
                      selectedCompanyFilterIds.includes(company.id)
                        ? "tag-filter-button active"
                        : "tag-filter-button"
                    }
                    type="button"
                    key={company.id}
                    onClick={() => toggleCompanyFilter(company.id)}
                  >
                    {company.companyName}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {scheduleDays.length === 0 ? (
          <p className="item-meta">No schedule days yet.</p>
        ) : (
          <section className="list">
            {scheduleDays.map((day) => {
              const allDayDetails = detailsByDayId[day.id] || [];
              const dayDetails = allDayDetails.filter((detail) => {
                const matchesTag = !selectedTagFilterId || detail.tagId === selectedTagFilterId;
                const matchesCompany =
                  selectedCompanyFilterIds.length === 0 ||
                  selectedCompanyFilterIds.some((companyId) =>
                    (detail.companyIds || []).includes(companyId)
                  );
                return matchesTag && matchesCompany;
              });
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
                      <p className="item-meta">{getNoRowsMessage()}</p>
                    ) : (
                      <div className="detail-list">
                        {dayDetails.map((detail, detailIndex) => {
                          const isEditingTime = isEditingDetailCell(detail.id, "time");
                          const isEditingDescription = isEditingDetailCell(
                            detail.id,
                            "description"
                          );
                          const canMoveUp = canMoveDetail(dayDetails, detailIndex, -1);
                          const canMoveDown = canMoveDetail(dayDetails, detailIndex, 1);
                          const previousDay = getAdjacentDay(day.id, -1);
                          const nextDay = getAdjacentDay(day.id, 1);

                          return (
                            <div
                              className="detail-row draggable-row"
                              key={detail.id}
                              style={getDetailRowStyle(getRowTagStyle(getTagById(detail.tagId)))}
                              draggable={!isEditingTime && !isEditingDescription && !isOffline}
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
                            >
                              {isEditingTime ? (
                                <input
                                  ref={detailCellInputRef}
                                  className="plain-input detail-time-input"
                                  aria-label={`Time for ${detail.description || "schedule detail"}`}
                                  type="time"
                                  value={detail.time || ""}
                                  disabled={isOffline}
                                  onBlur={() => {
                                    if (suppressDetailBlurRef.current) return;
                                    saveDetailCell(day.id, detail);
                                  }}
                                  onChange={(event) =>
                                    updateDetailField(day.id, detail.id, "time", event.target.value)
                                  }
                                  onKeyDown={(event) =>
                                    handleDetailCellKeyDown(
                                      event,
                                      day.id,
                                      dayDetails,
                                      detail,
                                      detailIndex,
                                      "time"
                                    )
                                  }
                                />
                              ) : (
                                <button
                                  className="detail-cell detail-time-display"
                                  type="button"
                                  disabled={isOffline}
                                  onClick={() => startEditingDetailCell(day.id, detail.id, "time")}
                                >
                                  {detail.time || "tbc"}
                                </button>
                              )}
                              {isEditingDescription ? (
                                <input
                                  ref={detailCellInputRef}
                                  className="plain-input"
                                  aria-label={`Description for ${detail.time || "tbc"}`}
                                  value={detail.description || ""}
                                  disabled={isOffline}
                                  onBlur={() => {
                                    if (suppressDetailBlurRef.current) return;
                                    saveDetailCell(day.id, detail);
                                  }}
                                  onChange={(event) =>
                                    updateDetailField(
                                      day.id,
                                      detail.id,
                                      "description",
                                      event.target.value
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleDetailCellKeyDown(
                                      event,
                                      day.id,
                                      dayDetails,
                                      detail,
                                      detailIndex,
                                      "description"
                                    )
                                  }
                                />
                              ) : (
                                <button
                                  className="detail-cell"
                                  type="button"
                                  disabled={isOffline}
                                  onClick={() =>
                                    startEditingDetailCell(day.id, detail.id, "description")
                                  }
                                >
                                  {detail.description || ""}
                                </button>
                              )}
                              {showTagColumn ? (
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
                              ) : null}
                              {showLocationColumn ? (
                                <div className="location-select-wrap">
                                  <select
                                    aria-label={`Location for ${detail.description || "schedule detail"}`}
                                    value={getLocationById(detail.locationId) ? detail.locationId : ""}
                                    disabled={savingDetailId === detail.id || isOffline}
                                    onChange={(event) =>
                                      assignDetailLocation(day.id, detail, event.target.value)
                                    }
                                  >
                                    <option value="">No location</option>
                                    {locationOptions.map((location) => (
                                      <option key={location.id} value={location.id}>
                                        {location.displayName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
                              {showCompanyColumn ? (
                                <details className="company-dropdown">
                                  <summary
                                    aria-label={`Company for ${detail.description || "schedule detail"}`}
                                    className="company-dropdown-trigger"
                                  >
                                    {getCompanyLabel(detail.companyIds || [])}
                                  </summary>
                                  <div className="company-dropdown-menu">
                                    {companies.map((company) => (
                                      <label className="company-dropdown-option" key={company.id}>
                                        <input
                                          type="checkbox"
                                          checked={(detail.companyIds || []).includes(company.id)}
                                          disabled={savingDetailId === detail.id || isOffline}
                                          onChange={() =>
                                            assignDetailCompanies(
                                              day.id,
                                              detail,
                                              toggleCompanyIds(detail.companyIds || [], company.id)
                                            )
                                          }
                                        />
                                        <span>{company.companyName}</span>
                                      </label>
                                    ))}
                                  </div>
                                </details>
                              ) : null}
                              <div className="detail-row-actions">
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
                          <div
                            className="detail-row draft-row"
                            key={`draft-${draftIndex}`}
                            style={getDetailRowStyle()}
                          >
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
                            {showTagColumn ? (
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
                            ) : null}
                            {showLocationColumn ? (
                              <div className="location-select-wrap">
                                <select
                                  aria-label="New detail location"
                                  value={getLocationById(draft.locationId) ? draft.locationId : ""}
                                  disabled={isOffline}
                                  onChange={(event) =>
                                    updateDraftDetail(
                                      day.id,
                                      draftIndex,
                                      "locationId",
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="">No location</option>
                                  {locationOptions.map((location) => (
                                    <option key={location.id} value={location.id}>
                                      {location.displayName}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                            {showCompanyColumn ? (
                              <details className="company-dropdown">
                                <summary
                                  aria-label="New detail company"
                                  className="company-dropdown-trigger"
                                >
                                  {getCompanyLabel(draft.companyIds || [])}
                                </summary>
                                <div className="company-dropdown-menu">
                                  {companies.map((company) => (
                                    <label className="company-dropdown-option" key={company.id}>
                                      <input
                                        type="checkbox"
                                        checked={(draft.companyIds || []).includes(company.id)}
                                        disabled={isOffline}
                                        onChange={() =>
                                          updateDraftDetail(
                                            day.id,
                                            draftIndex,
                                            "companyIds",
                                            toggleCompanyIds(draft.companyIds || [], company.id)
                                          )
                                        }
                                      />
                                      <span>{company.companyName}</span>
                                    </label>
                                  ))}
                                </div>
                              </details>
                            ) : null}
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
          <button
            className={activeSettingsTab === "locations" ? "tab active" : "tab"}
            type="button"
            onClick={() => setActiveSettingsTab("locations")}
          >
            Locations
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

        {activeSettingsTab === "locations" ? (
          <div className="settings-section">
            <form className="location-form" onSubmit={saveLocation}>
              <div className="form-row">
                <label htmlFor="locationName">
                  {editingLocationId
                    ? "Location name"
                    : locationForm.parentLocationId
                      ? "Sub-location name"
                      : "Main location"}
                </label>
                <input
                  id="locationName"
                  value={locationForm.name}
                  disabled={isOffline}
                  onChange={(event) => updateLocationFormField("name", event.target.value)}
                  placeholder={locationForm.parentLocationId ? "Backstage" : "Main Hall"}
                  required
                />
                {locationForm.parentLocationId ? (
                  <span className="item-meta">
                    Under{" "}
                    {locations.find((location) => location.id === locationForm.parentLocationId)
                      ?.name || "selected location"}
                  </span>
                ) : null}
              </div>
              <div className="actions">
                <button className="button" type="submit" disabled={savingLocation || isOffline}>
                  {savingLocation
                    ? "Saving..."
                    : editingLocationId
                      ? "Save location"
                      : "Create location"}
                </button>
                {editingLocationId ? (
                  <button
                    className="button secondary"
                    type="button"
                    disabled={savingLocation || isOffline}
                    onClick={resetLocationForm}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            {locationsLoading ? (
              <p className="item-meta">Loading locations...</p>
            ) : locations.length === 0 ? (
              <p className="item-meta">No locations yet.</p>
            ) : (
              <div
                className={[
                  "location-list",
                  locationDropTargetId === "main" ? "drop-target" : "",
                ].filter(Boolean).join(" ")}
                onDragOver={(event) => {
                  if (!draggedLocationIdRef.current) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setLocationDropTargetId("main");
                }}
                onDragLeave={() => {
                  setLocationDropTargetId((current) => (current === "main" ? "" : current));
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedLocationId = draggedLocationIdRef.current;
                  draggedLocationIdRef.current = "";
                  setLocationDropTargetId("");
                  if (draggedLocationId) moveLocation(draggedLocationId, "");
                }}
              >
                {locationTree.map((location) => renderLocationNode(location))}
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
