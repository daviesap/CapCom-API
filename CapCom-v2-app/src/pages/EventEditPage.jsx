import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.jsx";
import EventEditorHeader from "../components/event-edit/EventEditorHeader.jsx";
import EventEditorStatusMessages from "../components/event-edit/EventEditorStatusMessages.jsx";
import EventEditorTabs from "../components/event-edit/EventEditorTabs.jsx";
import DetailFilters from "../components/event-edit/DetailFilters.jsx";
import DetailPanel from "../components/event-edit/DetailPanel.jsx";
import InfoPanel from "../components/event-edit/InfoPanel.jsx";
import Modal from "../components/Modal.jsx";
import SettingsPanel from "../components/event-edit/SettingsPanel.jsx";
import SummaryPanel from "../components/event-edit/SummaryPanel.jsx";
import TruckingPanel from "../components/event-edit/TruckingPanel.jsx";
import Loading from "../components/Loading.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import useOnlineStatus from "../hooks/useOnlineStatus.js";
import {
  getCachedEventForUser,
  getEvent,
  updateEvent,
  updateEventContactCompanyOrder,
} from "../services/eventService.js";
import {
  uploadEventImage,
  validateEventImageFile,
} from "../services/eventImageService.js";
import {
  getScheduleDays,
  syncScheduleDaysToRange,
  updateScheduleDay,
} from "../services/scheduleDayService.js";
import {
  createScheduleDetail,
  deleteScheduleDetail,
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
  createTruckSize,
  deleteTruckSize,
  getTruckSizes,
  updateTruckSize,
} from "../services/truckSizeService.js";
import {
  createTruck,
  deleteTruck,
  getTrucks,
  updateTruck,
} from "../services/truckService.js";
import {
  createCompanyContact,
  getCompanyContacts,
  updateCompanyContact,
} from "../services/companyContactService.js";
import {
  addEventContactsFromCompanyContacts,
  getEventContacts,
  updateEventContact,
  updateEventContactOrder,
} from "../services/eventContactService.js";
import {
  createFilteredView,
  deleteFilteredView,
  getFilteredViews,
  updateFilteredView,
} from "../services/filteredViewService.js";
import {
  createKeyInfo,
  deleteKeyInfo,
  getKeyInfo,
  updateKeyInfo,
  updateKeyInfoOrder,
} from "../services/keyInfoService.js";
import { getShareArchive } from "../services/shareArchiveService.js";
import { getCompanies } from "../services/companyService.js";
import { generateHomeForEvent } from "../services/functionService.js";
import {
  getCachedCompanies,
  getCachedFilteredViews,
  getCachedKeyInfo,
  getCachedLocations,
  getCachedScheduleDays,
  getCachedScheduleDetails,
  getCachedTags,
  getCachedTrucks,
  getCachedTruckSizes,
  cacheScheduleDetails,
} from "../services/localScheduleCache.js";

const noopSetTopbarConfig = () => {};

const emptyEventForm = {
  name: "",
  venue: "",
  clientId: "",
  clientName: "",
  profileId: "",
  startDate: "",
  endDate: "",
  scheduleStartDate: "",
  scheduleEndDate: "",
  imageUrl: "",
  contactCompanyOrder: [],
  updatedAt: null,
  apiResponse: null,
};

const eventEditTabs = [
  { id: "info", label: "Info", icon: "info" },
  { id: "summary", label: "Summary", icon: "summary" },
  { id: "detail", label: "Detail", icon: "detail" },
  { id: "trucks", label: "Trucking", icon: "trucking" },
  { id: "share", label: "Share", icon: "share" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const emptyTagForm = {
  name: "",
  colour: "#F39200",
};

const emptyLocationForm = {
  name: "",
  parentLocationId: "",
};

const emptyTruckSizeForm = {
  size: "",
};

const emptyTruckForm = {
  truckSizeId: "",
  companyId: "",
  truckNumber: "",
  driverName: "",
  driverContactNumber: "",
  contents: "",
};

const truckDetailActions = ["", "Load", "Deliver"];

const emptyCompanyContactForm = {
  name: "",
  email: "",
  phone: "",
  role: "",
};

const emptyDetailEditForm = {
  time: "",
  description: "",
  action: "",
  destinationValue: "",
  tagId: "",
  locationId: "",
  companyIds: [],
  notes: "",
};

const timePickerHours = Array.from({ length: 24 }, (_, hour) =>
  String(hour).padStart(2, "0")
);
const timePickerMinutes = Array.from({ length: 60 }, (_, minute) =>
  String(minute).padStart(2, "0")
);

const emptyKeyInfoForm = {
  title: "",
  description: "",
};

const emptyFilteredViewForm = {
  name: "",
  filterBox: true,
  showKeyInfo: true,
  showLocations: false,
  showContacts: false,
  groupPresetId: "",
  filterTagIds: [],
  filterLocationIds: [],
  filterSubLocationIds: [],
  filterSupplierIds: [],
  filterGroup: "",
  group: "",
  sortOrder: 1,
};

const FALLBACK_FILTERED_VIEW_SORT_ORDER = 1;

function getArrayValue(primary, fallback) {
  if (Array.isArray(primary)) return primary;
  if (typeof primary === "string") {
    return primary
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  if (Array.isArray(fallback)) return fallback;
  if (typeof fallback === "string") {
    return fallback
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function readBooleanValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (normalised === "true") return true;
    if (normalised === "false") return false;
  }
  return fallback;
}

function normaliseString(value) {
  if (typeof value === "string") return value.trim();
  return "";
}

function normaliseSortOrderValue(value, fallback = FALLBACK_FILTERED_VIEW_SORT_ORDER) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return fallback;
}

function getNextFilteredViewSortOrder(existingViews) {
  const maxSortOrder = existingViews.reduce((maxValue, view) => {
    const nextValue = Number(view?.sortOrder);
    if (!Number.isFinite(nextValue)) return maxValue;
    return nextValue > maxValue ? nextValue : maxValue;
  }, 0);

  return Number.isFinite(maxSortOrder) && maxSortOrder > 0
    ? maxSortOrder + 1
    : FALLBACK_FILTERED_VIEW_SORT_ORDER;
}

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

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const dateText = typeof value === "string" ? value.trim() : value;
  const timezoneLessIsoDate = typeof dateText === "string"
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateText)
    && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(dateText);
  const parsed = new Date(timezoneLessIsoDate ? `${dateText}Z` : dateText);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRelativeDate(value) {
  const date = toDateValue(value);
  if (!date) return "";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const units = [
    { name: "year", seconds: 60 * 60 * 24 * 365 },
    { name: "month", seconds: 60 * 60 * 24 * 30 },
    { name: "week", seconds: 60 * 60 * 24 * 7 },
    { name: "day", seconds: 60 * 60 * 24 },
    { name: "hour", seconds: 60 * 60 },
    { name: "minute", seconds: 60 },
  ];
  const unit = units.find((candidate) => absSeconds >= candidate.seconds);

  if (!unit) return "just now";
  const valueForUnit = Math.round(diffSeconds / unit.seconds);
  return new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" }).format(valueForUnit, unit.name);
}

function formatArchiveDate(value) {
  const date = toDateValue(value);
  if (!date) return "n/a";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatArchiveChangeLine(value) {
  return String(value || "").replace(/^-\s*/, "").trim();
}

function parseArchiveChangeText(value) {
  const text = String(value || "").trim();
  if (!text) return [{ heading: "", lines: ["No change text recorded."] }];

  const groups = text
    .split(/\n\s*\n/)
    .map((groupText) => {
      const lines = groupText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) return null;
      if (lines.length === 1) {
        const singleLineMatch = lines[0].match(/^(.+\d{4})\s+-\s+(.+)$/);
        if (singleLineMatch) {
          return {
            heading: singleLineMatch[1].trim(),
            lines: [formatArchiveChangeLine(singleLineMatch[2])],
          };
        }
      }

      return {
        heading: lines.length > 1 ? lines[0] : "",
        lines: (lines.length > 1 ? lines.slice(1) : lines).map(formatArchiveChangeLine),
      };
    })
    .filter(Boolean);

  return groups.length > 0 ? groups : [{ heading: "", lines: [text] }];
}

function ArchiveChangeText({ text }) {
  const displayText = String(text || "No change text recorded.").trim();
  const groups = parseArchiveChangeText(displayText);

  return (
    <div
      className="archive-change-preview"
      data-tooltip={displayText}
      tabIndex={0}
    >
      <div className="archive-change-preview-content">
        {groups.map((group, groupIndex) => (
          <div className="archive-change-group" key={`${group.heading}-${groupIndex}`}>
            {group.heading ? <strong>{group.heading}</strong> : null}
            {group.lines.map((line, lineIndex) => (
              <span key={`${line}-${lineIndex}`}>{line}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function normaliseApiResponse(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getShareSnapshotNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function normaliseHexColour(colour) {
  const trimmedColour = String(colour || "").trim();
  if (!trimmedColour) return "";
  const withHash = trimmedColour.startsWith("#") ? trimmedColour : `#${trimmedColour}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : "";
}

function getDetailSortOrder(detail) {
  return typeof detail?.sortOrder === "number" ? detail.sortOrder : 0;
}

function sortDetailsForDisplay(details = []) {
  return [...details].sort((a, b) => {
    const timeComparison = String(a.time || "").localeCompare(String(b.time || ""));
    if (timeComparison !== 0) return timeComparison;

    const orderComparison = getDetailSortOrder(a) - getDetailSortOrder(b);
    if (orderComparison !== 0) return orderComparison;

    return String(a.id || "").localeCompare(String(b.id || ""));
  });
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

function getSortOrder(contact, fallbackIndex = 0) {
  return typeof contact?.sortOrder === "number" ? contact.sortOrder : fallbackIndex;
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
  const outletContext = useOutletContext();
  const setTopbarConfig = outletContext?.setTopbarConfig || noopSetTopbarConfig;
  const { userProfile, profileLoading, isSuperAdmin, isAdmin, isUser, isViewer } = useAuth();
  const isOnline = useOnlineStatus();
  const isOffline = !isOnline;
  const isEventReadOnly = isViewer;
  const isWriteDisabled = isOffline || isEventReadOnly;
  const [form, setForm] = useState(emptyEventForm);
  const [savedEventForm, setSavedEventForm] = useState(emptyEventForm);
  const [isEditingEventDetails, setIsEditingEventDetails] = useState(false);
  const [eventImageFile, setEventImageFile] = useState(null);
  const [eventImagePreviewUrl, setEventImagePreviewUrl] = useState("");
  const [scheduleDays, setScheduleDays] = useState([]);
  const [editingDayId, setEditingDayId] = useState("");
  const [editingDayDraft, setEditingDayDraft] = useState({
    summary: "",
    endOfDayTarget: "",
  });
  const [editingDayMode, setEditingDayMode] = useState("");
  const [isEditingScheduleDateRange, setIsEditingScheduleDateRange] = useState(false);
  const [scheduleDateRangeDraft, setScheduleDateRangeDraft] = useState({
    scheduleStartDate: "",
    scheduleEndDate: "",
  });
  const [savingScheduleDateRange, setSavingScheduleDateRange] = useState(false);
  const [detailsByDayId, setDetailsByDayId] = useState({});
  const [draftDetailsByDayId, setDraftDetailsByDayId] = useState({});
  const [draftTruckDetailsByTruckId, setDraftTruckDetailsByTruckId] = useState({});
  const [savedDetailsById, setSavedDetailsById] = useState({});
  const [tags, setTags] = useState([]);
  const [locations, setLocations] = useState([]);
  const [truckSizes, setTruckSizes] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyContactsByCompanyId, setCompanyContactsByCompanyId] = useState({});
  const [eventContactsByCompanyId, setEventContactsByCompanyId] = useState({});
  const [tagForm, setTagForm] = useState(emptyTagForm);
  const [locationForm, setLocationForm] = useState(emptyLocationForm);
  const [truckSizeForm, setTruckSizeForm] = useState(emptyTruckSizeForm);
  const [tagFormMode, setTagFormMode] = useState("");
  const [locationFormMode, setLocationFormMode] = useState("");
  const [truckSizeFormMode, setTruckSizeFormMode] = useState("");
  const [truckForm, setTruckForm] = useState(emptyTruckForm);
  const [truckFormMode, setTruckFormMode] = useState("");
  const [companyContactForm, setCompanyContactForm] = useState(emptyCompanyContactForm);
  const [editingTagId, setEditingTagId] = useState("");
  const [editingTruckSizeId, setEditingTruckSizeId] = useState("");
  const [editingTruckId, setEditingTruckId] = useState("");
  const [editingLocationId, setEditingLocationId] = useState("");
  const [editingCompanyContactId, setEditingCompanyContactId] = useState("");
  const [editingCompanyContactCompanyId, setEditingCompanyContactCompanyId] = useState("");
  const [editingEventContactId, setEditingEventContactId] = useState("");
  const [editingDetailCell, setEditingDetailCell] = useState(null);
  const [editingDetailModal, setEditingDetailModal] = useState(null);
  const [editingDetailTimeModal, setEditingDetailTimeModal] = useState(null);
  const [addingDetailDayId, setAddingDetailDayId] = useState("");
  const [addingTruckDetailTruckId, setAddingTruckDetailTruckId] = useState("");
  const [detailEditForm, setDetailEditForm] = useState(emptyDetailEditForm);
  const [openActionMenuId, setOpenActionMenuId] = useState("");
  const [openNotesDetailId, setOpenNotesDetailId] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [selectedTagFilterIds, setSelectedTagFilterIds] = useState([]);
  const [selectedLocationFilterIds, setSelectedLocationFilterIds] = useState([]);
  const [selectedSubLocationFilterIds, setSelectedSubLocationFilterIds] = useState([]);
  const [selectedCompanyFilterIds, setSelectedCompanyFilterIds] = useState([]);
  const [openContactCompanyIds, setOpenContactCompanyIds] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [activeInfoTab, setActiveInfoTab] = useState("contacts");
  const [activeSettingsTab, setActiveSettingsTab] = useState("tags");
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [truckSizesLoading, setTruckSizesLoading] = useState(false);
  const [trucksLoading, setTrucksLoading] = useState(false);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companyContactsLoading, setCompanyContactsLoading] = useState(false);
  const [eventContactsLoading, setEventContactsLoading] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDayId, setSavingDayId] = useState("");
  const [savingDetailId, setSavingDetailId] = useState("");
  const [savingTruckSize, setSavingTruckSize] = useState(false);
  const [deletingTruckSizeId, setDeletingTruckSizeId] = useState("");
  const [savingTruck, setSavingTruck] = useState(false);
  const [deletingTruckId, setDeletingTruckId] = useState("");
  const [savingDraftDayId, setSavingDraftDayId] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState("");
  const [savingCompanyContact, setSavingCompanyContact] = useState(false);
  const [savingEventContact] = useState(false);
  const [reorderingCompanyContactId, setReorderingCompanyContactId] = useState("");
  const [savingContactCompanyOrder, setSavingContactCompanyOrder] = useState(false);
  const [filteredViews, setFilteredViews] = useState([]);
  const [filteredViewsLoading, setFilteredViewsLoading] = useState(false);
  const [keyInfoItems, setKeyInfoItems] = useState([]);
  const [keyInfoLoading, setKeyInfoLoading] = useState(false);
  const [keyInfoForm, setKeyInfoForm] = useState(emptyKeyInfoForm);
  const [keyInfoFormMode, setKeyInfoFormMode] = useState("");
  const [editingKeyInfoId, setEditingKeyInfoId] = useState("");
  const [savingKeyInfo, setSavingKeyInfo] = useState(false);
  const [deletingKeyInfoId, setDeletingKeyInfoId] = useState("");
  const [reorderingKeyInfoId, setReorderingKeyInfoId] = useState("");
  const [shareArchive, setShareArchive] = useState([]);
  const [shareArchiveLoading, setShareArchiveLoading] = useState(false);
  const [isShareArchiveOpen, setIsShareArchiveOpen] = useState(false);
  const [filteredViewFormMode, setFilteredViewFormMode] = useState("");
  const [editingFilteredViewId, setEditingFilteredViewId] = useState("");
  const [filteredViewForm, setFilteredViewForm] = useState(emptyFilteredViewForm);
  const [savingFilteredView, setSavingFilteredView] = useState(false);
  const [deletingFilteredViewId, setDeletingFilteredViewId] = useState("");
  const [updatingShareOutput, setUpdatingShareOutput] = useState(false);
  const [reorderingDayId, setReorderingDayId] = useState("");
  const [movingLocationId, setMovingLocationId] = useState("");
  const [locationDropTargetId, setLocationDropTargetId] = useState("");
  const [contactCompanyDropTargetId, setContactCompanyDropTargetId] = useState("");
  const [companyContactDropTargetId, setCompanyContactDropTargetId] = useState("");
  const [, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const suppressDetailBlurRef = useRef(false);
  const detailCellInputRef = useRef(null);
  const seededEventContactCompanyIdsRef = useRef(new Set());
  const eventContactSeedErrorCompanyIdsRef = useRef(new Set());
  const draggedDetailIdRef = useRef("");
  const draggedLocationIdRef = useRef("");
  const draggedContactCompanyIdRef = useRef("");
  const draggedCompanyContactIdRef = useRef("");
  const draggedKeyInfoIdRef = useRef("");
  const canManageCompanyContacts = !isEventReadOnly && (isSuperAdmin || isAdmin);
  const canManageFilteredViews = !isEventReadOnly && (isSuperAdmin || isAdmin || isUser);
  const canUpdateShareOutput = !isEventReadOnly && (isSuperAdmin || isAdmin || isUser);
  const canUseDebugJson = Boolean(userProfile?.debugMode);
  const canManageContactCompanyOrder = canManageCompanyContacts;

  useEffect(() => {
    if (profileLoading) return undefined;

    let cancelled = false;

    const buildEventForm = (event) => ({
      name: event.name || "",
      venue: event.venue || "",
      clientId: event.clientId || "",
      clientName: event.clientName || "",
      profileId: event.profileId || "",
      startDate: event.startDate || "",
      endDate: event.endDate || "",
      scheduleStartDate: event.scheduleStartDate || event.startDate || "",
      scheduleEndDate: event.scheduleEndDate || event.endDate || "",
      imageUrl: event.imageUrl || "",
      contactCompanyOrder: Array.isArray(event.contactCompanyOrder)
        ? event.contactCompanyOrder
        : [],
      showMomContacts: readBooleanValue(event.showMomContacts, false),
      showMomKeyInfo: readBooleanValue(event.showMomKeyInfo, false),
      updatedAt: event.updatedAt || null,
      apiResponse: normaliseApiResponse(event["API Response"]),
    });

    const seedCachedPage = () => {
      const cachedEvent = getCachedEventForUser(eventId, userProfile);
      const cachedDays = getCachedScheduleDays(eventId);
      if (!cachedEvent) return false;

      const cachedEventForm = buildEventForm(cachedEvent);
      setForm(cachedEventForm);
      setSavedEventForm(cachedEventForm);
      setCompanies(getCachedCompanies(cachedEventForm.clientId));

      if (cachedDays.length > 0) {
        setScheduleDays(cachedDays);
        setDetailsState(
          Object.fromEntries(
            cachedDays.map((day) => [day.id, getCachedScheduleDetails(day.id)])
          )
        );
      }

      setTags(getCachedTags(eventId));
      setLocations(getCachedLocations(eventId));
      setTruckSizes(getCachedTruckSizes(eventId));
      setTrucks(getCachedTrucks(eventId));
      setFilteredViews(getCachedFilteredViews(eventId));
      setKeyInfoItems(getCachedKeyInfo(eventId));
      setLoading(false);
      return true;
    };

    const hasCachedSeed = seedCachedPage();

    const loadPage = async () => {
      setLoading(!hasCachedSeed);
      setDetailsLoading(false);
      setTagsLoading(false);
      setLocationsLoading(false);
          setTruckSizesLoading(false);
          setTrucksLoading(false);
          setCompaniesLoading(false);
          setKeyInfoLoading(false);
          setShareArchiveLoading(false);
          setError("");
          setWarning("");
          try {
        const event = await getEvent(eventId, userProfile);
        if (cancelled) return;
        if (!event) {
          setError("Event not found.");
          return;
        }

        const days = await getScheduleDays(eventId);
        if (cancelled) return;

        const loadedEventForm = buildEventForm(event);
        setForm(loadedEventForm);
        setSavedEventForm(loadedEventForm);
        setScheduleDays(days);
        if (!hasCachedSeed) {
          setFilteredViews([]);
          setKeyInfoItems([]);
          setShareArchive([]);
          setEventContactsByCompanyId({});
        }
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
                setWarning((currentWarning) => currentWarning || errorMessage);
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
            label: "truck sizes",
            setLoadingState: setTruckSizesLoading,
            loadData: () => getTruckSizes(eventId),
            applyData: setTruckSizes,
            errorMessage: "Could not load truck sizes. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "trucks",
            setLoadingState: setTrucksLoading,
            loadData: () => getTrucks(eventId),
            applyData: setTrucks,
            errorMessage: "Could not load trucks. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "filtered views",
            setLoadingState: setFilteredViewsLoading,
            loadData: () => getFilteredViews(eventId),
            applyData: setFilteredViews,
            errorMessage: "Could not load filtered views. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "key info",
            setLoadingState: setKeyInfoLoading,
            loadData: () => getKeyInfo(eventId),
            applyData: setKeyInfoItems,
            errorMessage: "Could not load key info. Other event data is still available.",
          }),
          loadOptionalEditorData({
            label: "share archive",
            setLoadingState: setShareArchiveLoading,
            loadData: () => getShareArchive(eventId),
            applyData: setShareArchive,
            errorMessage: "Could not load share archive. Other event data is still available.",
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
          setTruckSizesLoading(false);
          setTrucksLoading(false);
          setCompaniesLoading(false);
          setKeyInfoLoading(false);
          setShareArchiveLoading(false);
        }
      }
    };

    loadPage();
    return () => {
      cancelled = true;
    };
  }, [eventId, profileLoading, userProfile]);

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

  useEffect(() => {
    if (!eventImageFile) {
      setEventImagePreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(eventImageFile);
    setEventImagePreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [eventImageFile]);

  const scheduleDetails = useMemo(() => {
    return Object.values(detailsByDayId).flat();
  }, [detailsByDayId]);

  const shareLastUpdatedText = useMemo(
    () => formatRelativeDate(form.apiResponse?.timestamp),
    [form.apiResponse]
  );
  const shareProtectedHomeUrl = form.apiResponse?.protectedHomeUrl || "";
  const shareHtmlUrl = form.apiResponse?.["html URL"] || form.apiResponse?.htmlUrl || "";
  const protectedSnapshotHtmlUrlByName = useMemo(() => {
    const snapshots = Array.isArray(form.apiResponse?.snapshots)
      ? form.apiResponse.snapshots
      : [];

    return new Map(
      snapshots
        .filter((snapshot) => snapshot?.protectedHtmlUrl)
        .map((snapshot) => [
          getShareSnapshotNameKey(snapshot.name),
          snapshot.protectedHtmlUrl,
        ])
    );
  }, [form.apiResponse]);

  const truckScheduleDetails = useMemo(() => {
    return scheduleDetails.filter((detail) => detail.truckId);
  }, [scheduleDetails]);

  const scheduleDayById = useMemo(() => {
    return new Map(scheduleDays.map((day) => [day.id, day]));
  }, [scheduleDays]);

  const usedTagIds = useMemo(() => {
    return new Set(
      scheduleDetails
        .map((detail) => detail.tagId)
        .filter(Boolean)
    );
  }, [scheduleDetails]);

  const usedTags = useMemo(() => {
    return tags.filter((tag) => usedTagIds.has(tag.id));
  }, [tags, usedTagIds]);

  const isReservedTruckTag = (tag) =>
    String(tag?.name || "").trim().toLowerCase() === "truck";

  const isReservedTruckTagId = (tagId) => isReservedTruckTag(getTagById(tagId));

  const getEditableDetailTagId = (tagId) =>
    isReservedTruckTagId(tagId) ? "" : tagId || "";

  const normalDetailTags = useMemo(
    () => tags.filter((tag) => !isReservedTruckTag(tag)),
    [tags]
  );

  const detailCountByTagId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      if (!detail.tagId) return counts;
      counts[detail.tagId] = (counts[detail.tagId] || 0) + 1;
      return counts;
    }, {});
  }, [scheduleDetails]);

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
      .sort((locationA, locationB) =>
        String(locationA.name || "").localeCompare(String(locationB.name || ""))
      )
      .map((location) => ({
        ...location,
        children: locations
          .filter((subLocation) => subLocation.parentLocationId === location.id)
          .sort((locationA, locationB) =>
            String(locationA.name || "").localeCompare(String(locationB.name || ""))
          ),
      }));
  }, [locations]);

  const locationById = useMemo(() => {
    return new Map(locations.map((location) => [location.id, location]));
  }, [locations]);

  const truckSizeById = useMemo(() => {
    return new Map(truckSizes.map((truckSize) => [truckSize.id, truckSize]));
  }, [truckSizes]);

  const truckById = useMemo(() => {
    return new Map(trucks.map((truck) => [truck.id, truck]));
  }, [trucks]);

  const companyById = useMemo(() => {
    return new Map(companies.map((company) => [company.id, company]));
  }, [companies]);

  const usedLocationIds = useMemo(() => {
    return new Set(
      scheduleDetails
        .map((detail) => detail.locationId)
        .filter(Boolean)
    );
  }, [scheduleDetails]);

  const usedLocationFilterIds = useMemo(() => {
    const filterIds = new Set();
    usedLocationIds.forEach((locationId) => {
      const location = locationById.get(locationId);
      if (!location) return;
      filterIds.add(location.parentLocationId || location.id);
    });
    return filterIds;
  }, [locationById, usedLocationIds]);

  const usedLocationFilters = useMemo(() => {
    return locations.filter(
      (location) => !location.parentLocationId && usedLocationFilterIds.has(location.id)
    );
  }, [locations, usedLocationFilterIds]);

  const detailCountByLocationFilterId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      if (!detail.locationId) return counts;
      const location = locationById.get(detail.locationId);
      if (!location) return counts;
      const filterLocationId = location.parentLocationId || location.id;
      counts[filterLocationId] = (counts[filterLocationId] || 0) + 1;
      return counts;
    }, {});
  }, [locationById, scheduleDetails]);

  const usedSubLocationFilters = useMemo(() => {
    return locationOptions.filter(
      (location) => location.parentLocationId && usedLocationIds.has(location.id)
    );
  }, [locationOptions, usedLocationIds]);

  const detailCountBySubLocationId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      if (!detail.locationId) return counts;
      counts[detail.locationId] = (counts[detail.locationId] || 0) + 1;
      return counts;
    }, {});
  }, [scheduleDetails]);

  const usedCompanyIds = useMemo(() => {
    return new Set(
      scheduleDetails
        .flatMap((detail) => detail.companyIds || [])
        .filter(Boolean)
    );
  }, [scheduleDetails]);

  const filteredViewCompanyOptions = useMemo(() => {
    const eventCompanyIds = new Set([
      ...(Array.isArray(form.contactCompanyOrder) ? form.contactCompanyOrder : []),
      ...usedCompanyIds,
    ]);

    if (eventCompanyIds.size === 0) {
      return [];
    }

    return companies
      .filter((company) => eventCompanyIds.has(company.id))
      .sort((companyA, companyB) =>
        String(companyA.companyName || "").localeCompare(
          String(companyB.companyName || "")
        )
      );
  }, [companies, form.contactCompanyOrder, usedCompanyIds]);

  const filteredViewTagOptions = useMemo(() => {
    return [...tags].sort((tagA, tagB) =>
      String(tagA.name || "").localeCompare(String(tagB.name || ""))
    );
  }, [tags]);

  const usedCompanies = useMemo(() => {
    return companies.filter((company) => usedCompanyIds.has(company.id));
  }, [companies, usedCompanyIds]);

  const detailCountByCompanyId = useMemo(() => {
    return scheduleDetails.reduce((counts, detail) => {
      (detail.companyIds || []).forEach((companyId) => {
        if (!companyId) return;
        counts[companyId] = (counts[companyId] || 0) + 1;
      });
      return counts;
    }, {});
  }, [scheduleDetails]);
  const showTagColumn = tags.length > 0;
  const showLocationColumn = locationOptions.length > 0;
  const showCompanyColumn = companies.length > 0;
  const showTruckDestinationColumn = showLocationColumn || showCompanyColumn;
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
  const truckDetailRowGridColumnParts = [
    "150px",
    "76px",
    "92px",
    showTruckDestinationColumn ? "180px" : "",
    "auto",
  ].filter(Boolean);
  const truckDetailRowGridColumns = truckDetailRowGridColumnParts.join(" ");
  const truckDetailActionGridColumn = truckDetailRowGridColumnParts.length;
  const getTruckDetailRowStyle = (rowStyle) => ({
    ...rowStyle,
    "--detail-row-columns": truckDetailRowGridColumns,
    "--detail-actions-column": truckDetailActionGridColumn,
  });
  const detailTruckRowGridColumnParts = [
    "76px",
    "minmax(0, 1fr)",
    showTruckDestinationColumn ? "180px" : "",
    "auto",
  ].filter(Boolean);
  const detailTruckRowGridColumns = detailTruckRowGridColumnParts.join(" ");
  const detailTruckActionGridColumn = detailTruckRowGridColumnParts.length;
  const getDetailTruckDetailRowStyle = (rowStyle) => ({
    ...rowStyle,
    "--detail-row-columns": detailTruckRowGridColumns,
    "--detail-actions-column": detailTruckActionGridColumn,
  });

  const contactCompanies = useMemo(() => {
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
  }, [detailCountByCompanyId, form.contactCompanyOrder, usedCompanies]);

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
  }, [contactCompanyIds, eventId]);

  useEffect(() => {
    let cancelled = false;

    const loadContacts = async () => {
      if (contactCompanyIds.length === 0) {
        setEventContactsByCompanyId({});
        setCompanyContactsByCompanyId({});
        setEventContactsLoading(false);
        setCompanyContactsLoading(false);
        return;
      }

      setEventContactsLoading(true);
      setCompanyContactsLoading(true);
      const [eventContactsResult, companyContactsResult] = await Promise.allSettled([
        getEventContacts(eventId, contactCompanyIds),
        getCompanyContacts(contactCompanyIds),
      ]);

      if (cancelled) return;

      if (eventContactsResult.status === "fulfilled") {
        const eventContactRows = eventContactsResult.value;
        setEventContactsByCompanyId(
          Object.fromEntries(
            contactCompanyIds.map((companyId) => [
              companyId,
              eventContactRows.filter((contact) => contact.companyId === companyId),
            ])
          )
        );
      } else {
        console.error("Could not load event contacts.", eventContactsResult.reason);
        setEventContactsByCompanyId({});
        setWarning("Could not load event contacts.");
      }

      if (companyContactsResult.status === "fulfilled") {
        const companyContactRows = companyContactsResult.value;
        setCompanyContactsByCompanyId(
          Object.fromEntries(
            contactCompanyIds.map((companyId) => [
              companyId,
              companyContactRows.filter((contact) => contact.companyId === companyId),
            ])
          )
        );
      } else {
        console.error("Could not load master company contacts.", companyContactsResult.reason);
        setCompanyContactsByCompanyId({});
        setWarning("Could not load master company contacts.");
      }

      setEventContactsLoading(false);
      setCompanyContactsLoading(false);
    };

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [contactCompanyIds]);

  useEffect(() => {
    if (isWriteDisabled || contactCompanyIds.length === 0 || eventContactsLoading) return;

    const companyIdsToSeed = contactCompanyIds.filter((companyId) => {
      const seeded = seededEventContactCompanyIdsRef.current.has(companyId);
      const hadSeedError = eventContactSeedErrorCompanyIdsRef.current.has(companyId);
      const hasExistingContacts = (eventContactsByCompanyId[companyId] || []).length > 0;
      const hasCompanyContacts = (companyContactsByCompanyId[companyId] || []).length > 0;
      return !seeded && !hadSeedError && !hasExistingContacts && hasCompanyContacts;
    });

    if (companyIdsToSeed.length === 0) return;

    let cancelled = false;

  const seedCompanyContactsForEvent = async () => {
      let didSeedContacts = false;

      for (const companyId of companyIdsToSeed) {
        if (cancelled) return;
        seededEventContactCompanyIdsRef.current.add(companyId);

        const companyContacts = companyContactsByCompanyId[companyId];
        if (!companyContacts || companyContacts.length === 0) {
          seededEventContactCompanyIdsRef.current.delete(companyId);
          continue;
        }

        try {
          const existingEventContacts = eventContactsByCompanyId[companyId] || [];
          const existingCompanyContactIds = new Set(
            existingEventContacts
              .map((contact) => contact.companyContactId || contact.id)
              .filter(Boolean)
          );
          const contactsToSeed = companyContacts.filter(
            (contact) => !existingCompanyContactIds.has(contact.id)
          );

          if (contactsToSeed.length === 0) {
            continue;
          }

          const nextSortOrder = existingEventContacts.reduce(
            (currentMax, contact, contactIndex) => Math.max(currentMax, getSortOrder(contact, contactIndex)),
            -1
          ) + 1;

          await addEventContactsFromCompanyContacts({
            eventId,
            companyId,
            companyContacts: contactsToSeed,
            startSortOrder: nextSortOrder,
          });
          didSeedContacts = true;
        } catch (seedError) {
          console.error("Could not seed event contacts.", seedError);
          if (!cancelled) {
            eventContactSeedErrorCompanyIdsRef.current.add(companyId);
            setError("Could not seed event contacts for this event.");
          }
        } finally {
          seededEventContactCompanyIdsRef.current.delete(companyId);
        }
      }

      if (!cancelled && didSeedContacts) {
        await reloadEventContacts();
      }
    };

    seedCompanyContactsForEvent();
    return () => {
      cancelled = true;
    };
  }, [
    contactCompanyIds,
    isWriteDisabled,
    companyContactsByCompanyId,
    eventContactsByCompanyId,
    eventContactsLoading,
    eventId,
  ]);

  useEffect(() => {
    if (selectedTagFilterIds.some((tagId) => !usedTagIds.has(tagId))) {
      setSelectedTagFilterIds((current) =>
        current.filter((tagId) => usedTagIds.has(tagId))
      );
    }
  }, [selectedTagFilterIds, usedTagIds]);

  useEffect(() => {
    setSelectedLocationFilterIds((current) =>
      current.filter((locationId) => usedLocationFilterIds.has(locationId))
    );
  }, [usedLocationFilterIds]);

  useEffect(() => {
    setSelectedSubLocationFilterIds((current) =>
      current.filter((locationId) => usedLocationIds.has(locationId))
    );
  }, [usedLocationIds]);

  useEffect(() => {
    setSelectedCompanyFilterIds((current) =>
      current.filter((companyId) => usedCompanyIds.has(companyId))
    );
  }, [usedCompanyIds]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleEventImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setEventImageFile(null);
      return;
    }

    const validationMessage = validateEventImageFile(file);
    if (validationMessage) {
      setError(validationMessage);
      event.target.value = "";
      setEventImageFile(null);
      return;
    }

    setError("");
    setEventImageFile(file);
  };

  const removeEventImage = () => {
    setEventImageFile(null);
    updateField("imageUrl", "");
  };

  const cancelEditingEventDetails = () => {
    setForm(savedEventForm);
    setEventImageFile(null);
    setIsEditingEventDetails(false);
    setError("");
  };

  const loadScheduleDays = async () => {
    const days = await getScheduleDays(eventId);
    applyScheduleDays(days);
  };

  const reloadEventContacts = async (companyIds = contactCompanyIds) => {
    if (companyIds.length === 0) {
      setEventContactsByCompanyId({});
      return;
    }

    setEventContactsLoading(true);
    try {
      const contacts = await getEventContacts(eventId, companyIds);
      setEventContactsByCompanyId(
        Object.fromEntries(
          companyIds.map((companyId) => [
            companyId,
            contacts.filter((contact) => contact.companyId === companyId),
          ])
        )
      );
    } catch (loadError) {
      console.error("Could not load event contacts.", loadError);
      setWarning("Could not load company contacts.");
    } finally {
      setEventContactsLoading(false);
    }
  };

  const loadTags = async () => {
    setTagsLoading(true);
    try {
      setTags(await getTags(eventId));
    } catch (loadError) {
      console.error("Could not load tags.", loadError);
      setWarning("Could not load tags.");
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
      setWarning("Could not load locations.");
    } finally {
      setLocationsLoading(false);
    }
  };

  const loadTruckSizes = async () => {
    setTruckSizesLoading(true);
    try {
      setTruckSizes(await getTruckSizes(eventId));
    } catch (loadError) {
      console.error("Could not load truck sizes.", loadError);
      setWarning("Could not load truck sizes.");
    } finally {
      setTruckSizesLoading(false);
    }
  };

  const loadTrucks = async () => {
    setTrucksLoading(true);
    try {
      setTrucks(await getTrucks(eventId));
    } catch (loadError) {
      console.error("Could not load trucks.", loadError);
      setWarning("Could not load trucks.");
    } finally {
      setTrucksLoading(false);
    }
  };

  const loadFilteredViews = async () => {
    setFilteredViewsLoading(true);
    try {
      setFilteredViews(await getFilteredViews(eventId));
    } catch (loadError) {
      console.error("Could not load filtered views.", loadError);
      setWarning("Could not load filtered views.");
    } finally {
      setFilteredViewsLoading(false);
    }
  };

  const loadCompanies = async (clientId = form.clientId) => {
    setCompaniesLoading(true);
    try {
      setCompanies(await getCompanies(clientId));
    } catch (loadError) {
      console.error("Could not load companies.", loadError);
      setWarning("Could not load companies.");
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
      setWarning("Could not load schedule details.");
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
              notes: detail.notes || "",
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

  const getSavedDetailSnapshot = (detail, fallbackIndex = 0) => ({
    time: detail.time || "",
    description: detail.description || "",
    sortOrder: typeof detail.sortOrder === "number" ? detail.sortOrder : fallbackIndex,
    colour: normaliseHexColour(detail.colour),
    tagId: detail.tagId || "",
    locationId: detail.locationId || "",
    companyIds: detail.companyIds || [],
    notes: detail.notes || "",
  });

  const setDayDetails = (dayId, nextDetails) => {
    const sortedDetails = sortDetailsForDisplay(nextDetails);
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: sortedDetails,
    }));
    setSavedDetailsById((current) => ({
      ...current,
      ...Object.fromEntries(
        sortedDetails.map((detail, detailIndex) => [
          detail.id,
          getSavedDetailSnapshot(detail, detailIndex),
        ])
      ),
    }));
    cacheScheduleDetails(dayId, sortedDetails);
  };

  const removeDetailFromDay = (dayId, detailId) => {
    setDayDetails(
      dayId,
      (detailsByDayId[dayId] || []).filter((detail) => detail.id !== detailId)
    );
    setSavedDetailsById((current) => {
      const remainingDetails = { ...current };
      delete remainingDetails[detailId];
      return remainingDetails;
    });
  };

  const addCreatedDetailToDay = (dayId, detailRef, detailData) => {
    const createdDetail = {
      id: detailRef.id,
      eventId,
      scheduleDayId: dayId,
      truckId: "",
      truckNumber: "",
      action: "",
      notes: "",
      colour: "",
      tagId: "",
      locationId: "",
      companyIds: [],
      ...detailData,
    };
    setDayDetails(dayId, [...(detailsByDayId[dayId] || []), createdDetail]);
    return createdDetail;
  };

  const moveDetailLocally = (sourceDayId, targetDayId, detail, updates) => {
    if (sourceDayId === targetDayId) {
      setDayDetails(
        targetDayId,
        (detailsByDayId[targetDayId] || []).map((currentDetail) =>
          currentDetail.id === detail.id ? { ...currentDetail, ...updates } : currentDetail
        )
      );
      return;
    }

    setDayDetails(
      sourceDayId,
      (detailsByDayId[sourceDayId] || []).filter((currentDetail) => currentDetail.id !== detail.id)
    );
    setDayDetails(targetDayId, [
      ...(detailsByDayId[targetDayId] || []),
      {
        ...detail,
        ...updates,
      },
    ]);
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
    if (isWriteDisabled) {
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

  const updateDetailAcrossDays = (detailId, fields) => {
    setDetailsByDayId((current) =>
      Object.fromEntries(
        Object.entries(current).map(([dayId, details]) => [
          dayId,
          details.map((detail) =>
            detail.id === detailId ? { ...detail, ...fields } : detail
          ),
        ])
      )
    );
  };

  const toggleCompanyFilter = (companyId) => {
    setSelectedCompanyFilterIds((current) =>
      current.includes(companyId)
        ? current.filter((currentCompanyId) => currentCompanyId !== companyId)
        : [...current, companyId]
    );
  };

  const toggleTagFilter = (tagId) => {
    setSelectedTagFilterIds((current) =>
      current.includes(tagId)
        ? current.filter((currentTagId) => currentTagId !== tagId)
        : [...current, tagId]
    );
  };

  const toggleLocationFilter = (locationId) => {
    setSelectedLocationFilterIds((current) =>
      current.includes(locationId)
        ? current.filter((currentLocationId) => currentLocationId !== locationId)
        : [...current, locationId]
    );
  };

  const toggleSubLocationFilter = (locationId) => {
    setSelectedSubLocationFilterIds((current) =>
      current.includes(locationId)
        ? current.filter((currentLocationId) => currentLocationId !== locationId)
        : [...current, locationId]
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
      setCompanyContactsLoading(false);
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
      setWarning("Could not load company contacts.");
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
    setEditingEventContactId("");
    setCompanyContactForm(emptyCompanyContactForm);
  };

  const setEventContactHiddenState = (contactId, isHidden) => {
    let updated = false;

    setEventContactsByCompanyId((current) => {
      const nextByCompany = Object.fromEntries(
        Object.entries(current).map(([companyId, contacts]) => {
          const nextContacts = contacts.map((contact) => {
            if (contact.id !== contactId) return contact;
            return { ...contact, isHidden };
          });
          if (!updated && nextContacts !== contacts) {
            updated = true;
          }
          return [companyId, nextContacts];
        })
      );

      return updated ? nextByCompany : current;
    });

    return updated;
  };

  const startAddingCompanyContact = (companyId) => {
    if (!canManageCompanyContacts || isWriteDisabled) return;
    setEditingCompanyContactId("");
    setEditingCompanyContactCompanyId(companyId);
    setCompanyContactForm(emptyCompanyContactForm);
    setMessage("");
    setError("");
  };

  const startEditingCompanyContact = (companyId, contact) => {
    if (!canManageCompanyContacts || isWriteDisabled) return;
    setEditingCompanyContactId(contact.companyContactId || "");
    setEditingCompanyContactCompanyId(companyId);
    setEditingEventContactId(contact.id || "");
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
    if (isWriteDisabled) {
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
        if (editingEventContactId) {
          await updateEventContact(editingEventContactId, {
            name,
            email,
            phone,
            role,
          });
        }
        setMessage("Company contact saved.");
      } else {
        eventContactSeedErrorCompanyIdsRef.current.delete(
          editingCompanyContactCompanyId
        );
        const createdContact = await createCompanyContact({
          companyId: editingCompanyContactCompanyId,
          name,
          email,
          phone,
          role,
        });
        const companyContactId = createdContact?.id;
        if (companyContactId) {
          const nextSortOrder = (
            eventContactsByCompanyId[editingCompanyContactCompanyId] || []
          ).reduce(
            (currentMax, eventContact, eventContactIndex) => Math.max(
              currentMax,
              getSortOrder(eventContact, eventContactIndex)
            ),
            -1
          ) + 1;

          await addEventContactsFromCompanyContacts({
            eventId,
            companyId: editingCompanyContactCompanyId,
            companyContacts: [
              {
                id: companyContactId,
                name,
                email,
                phone,
                role,
              },
            ],
            startSortOrder: nextSortOrder,
          });
        }
        setMessage("Company contact created.");
      }

      resetCompanyContactForm();
      await reloadCompanyContacts();
      await reloadEventContacts();
    } catch (contactError) {
      console.error(contactError);
      setError(
        contactError?.code === "permission-denied"
          ? "You do not have permission to save contacts for this company."
          : "Could not save company contact."
      );
    } finally {
      setSavingCompanyContact(false);
    }
  };

  const toggleEventContactHidden = async (contactId) => {
    const targetContact = Object.values(eventContactsByCompanyId)
      .flat()
      .find((contact) => contact.id === contactId);

    if (!targetContact || isWriteDisabled || !canManageCompanyContacts) return;

    setMessage("");
    setError("");

    const nextIsHidden = !targetContact.isHidden;
    const didUpdate = setEventContactHiddenState(contactId, nextIsHidden);
    if (!didUpdate) return;

    try {
      await updateEventContact(contactId, {
        isHidden: nextIsHidden,
      });
      setMessage(nextIsHidden ? "Event contact hidden." : "Event contact unhidden.");
    } catch (contactError) {
      console.error(contactError);
      setEventContactHiddenState(contactId, targetContact.isHidden);
      const errorCode = contactError?.code || "";
      const isPermissionError = errorCode === "permission-denied";
      setError(
        isPermissionError
          ? "You do not have permission to update this event contact."
          : "Could not update event contact visibility."
      );
    }
  };

  const resetKeyInfoForm = () => {
    setKeyInfoFormMode("");
    setEditingKeyInfoId("");
    setKeyInfoForm(emptyKeyInfoForm);
  };

  const updateKeyInfoFormField = (field, value) => {
    setKeyInfoForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const startAddingKeyInfo = () => {
    if (isWriteDisabled) return;
    resetKeyInfoForm();
    setKeyInfoFormMode("create");
    setError("");
  };

  const startEditingKeyInfo = (item) => {
    if (isWriteDisabled) return;
    setKeyInfoFormMode("edit");
    setEditingKeyInfoId(item.id);
    setKeyInfoForm({
      title: item.title || "",
      description: item.description || "",
    });
    setError("");
  };

  const saveKeyInfo = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const title = keyInfoForm.title.trim();
    const description = keyInfoForm.description.trim();
    if (!title) {
      setError("Key info title is required.");
      return;
    }

    setSavingKeyInfo(true);
    setError("");

    try {
      if (editingKeyInfoId) {
        await updateKeyInfo(editingKeyInfoId, { title, description });
      } else {
        await createKeyInfo({ eventId, title, description });
      }

      resetKeyInfoForm();
      setKeyInfoItems(await getKeyInfo(eventId));
    } catch (keyInfoError) {
      console.error(keyInfoError);
      setError("Could not save key info.");
    } finally {
      setSavingKeyInfo(false);
    }
  };

  const removeKeyInfo = async (keyInfoId) => {
    if (isWriteDisabled) return;

    setDeletingKeyInfoId(keyInfoId);
    setError("");

    try {
      await deleteKeyInfo(keyInfoId);
      if (editingKeyInfoId === keyInfoId) resetKeyInfoForm();
      setKeyInfoItems(await getKeyInfo(eventId));
    } catch (keyInfoError) {
      console.error(keyInfoError);
      setError("Could not delete key info.");
    } finally {
      setDeletingKeyInfoId("");
    }
  };

  const reorderKeyInfo = async (draggedKeyInfoId, targetKeyInfoId) => {
    if (!draggedKeyInfoId || !targetKeyInfoId || draggedKeyInfoId === targetKeyInfoId || isWriteDisabled) {
      return;
    }

    const currentItems = keyInfoItems;
    const draggedIndex = currentItems.findIndex((item) => item.id === draggedKeyInfoId);
    const targetIndex = currentItems.findIndex((item) => item.id === targetKeyInfoId);
    if (draggedIndex < 0 || targetIndex < 0) return;

    const nextItems = [...currentItems];
    const [draggedItem] = nextItems.splice(draggedIndex, 1);
    nextItems.splice(targetIndex, 0, draggedItem);

    setKeyInfoItems(nextItems.map((item, index) => ({ ...item, sortOrder: index })));
    setReorderingKeyInfoId(draggedKeyInfoId);
    setError("");

    try {
      await updateKeyInfoOrder(nextItems);
      setKeyInfoItems(await getKeyInfo(eventId));
    } catch (keyInfoError) {
      console.error(keyInfoError);
      setKeyInfoItems(currentItems);
      setError("Could not reorder key info.");
    } finally {
      setReorderingKeyInfoId("");
    }
  };

  const resetFilteredViewForm = () => {
    setFilteredViewFormMode("");
    setEditingFilteredViewId("");
    setFilteredViewForm(emptyFilteredViewForm);
  };

  const updateFilteredViewFormField = (field, value) => {
    setFilteredViewForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleFilteredViewMultiSelectField = (field, value) => {
    if (!value) return;

    if (field === "filterLocationIds") {
      setFilteredViewForm((current) => {
        const currentValues = current.filterLocationIds || [];
        const selectedValues = currentValues.includes(value)
          ? currentValues.filter((currentValue) => currentValue !== value)
          : [...currentValues, value];

        return {
          ...current,
          filterLocationIds: selectedValues,
        };
      });
      return;
    }

    setFilteredViewForm((current) => {
      const currentValues = current[field] || [];
      const selectedValues = currentValues.includes(value)
        ? currentValues.filter((currentValue) => currentValue !== value)
        : [...currentValues, value];

      return {
        ...current,
        [field]: selectedValues,
      };
    });
  };

  const clearFilteredViewFilters = () => {
    setFilteredViewForm((current) => ({
      ...current,
      filterTagIds: [],
      filterLocationIds: [],
      filterSubLocationIds: [],
      filterSupplierIds: [],
    }));
  };

  const buildFilteredViewApiPayload = (sourceView) => {
    const nextName = String(sourceView?.name || "").trim();
    return {
      eventId,
      name: nextName,
      filterBox: readBooleanValue(sourceView?.filterBox, true),
      showKeyInfo: readBooleanValue(sourceView?.showKeyInfo, true),
      showLocations: readBooleanValue(sourceView?.showLocations, false),
      showContacts: readBooleanValue(sourceView?.showContacts ?? sourceView?.includeContacts, false),
      groupPresetId: normaliseString(sourceView?.groupPresetId),
      filterTagIds: getArrayValue(sourceView?.filterTagIds),
      filterLocationIds: getArrayValue(sourceView?.filterLocationIds),
      filterSubLocationIds: getArrayValue(sourceView?.filterSubLocationIds),
      filterSupplierIds: getArrayValue(sourceView?.filterSupplierIds),
      filterGroup: normaliseString(sourceView?.filterGroup),
      group: normaliseString(sourceView?.group || nextName),
      sortOrder: normaliseSortOrderValue(sourceView?.sortOrder, FALLBACK_FILTERED_VIEW_SORT_ORDER),
    };
  };

  const updateShareOutput = async () => {
    if (isWriteDisabled) {
      setError("Updating is disabled while offline.");
      return;
    }
    if (!canUpdateShareOutput) {
      setError("Your role cannot update the share output.");
      return;
    }

    setUpdatingShareOutput(true);
    setMessage("");
    setError("");

    try {
      const result = await generateHomeForEvent(eventId, { debugPayload: canUseDebugJson });
      const refreshedEvent = await getEvent(eventId, userProfile);
      if (refreshedEvent) {
        setForm((currentForm) => ({
          ...currentForm,
          updatedAt: refreshedEvent.updatedAt || currentForm.updatedAt,
          apiResponse: normaliseApiResponse(refreshedEvent["API Response"]),
        }));
      }
      setShareArchive(await getShareArchive(eventId));
      const payloadPath = result?.debugPayloadPath;
      const responsePath = result?.debugResponsePath;
      const debugStatus = result?.debug?.reason || "";
      if (payloadPath) {
        setMessage(
          `${result?.message || "Share output updated."} (payload: ${payloadPath}${
            responsePath ? `, response: ${responsePath}` : ""
          }${debugStatus ? `, debug: ${debugStatus}` : ""})`
        );
      } else {
        const debugMessage = result?.debug?.enabled ? " (debug enabled)" : " (debug disabled for this user)";
        const debugError = result?.debug?.reason && result.debug.reason !== "ok"
          ? ` (${result.debug.reason})`
          : "";
        setMessage(`${result?.message || "Share output updated."}${debugMessage}${debugError}`);
      }
    } catch (updateError) {
      console.error(updateError);
      const debugPayloadPath = updateError?.customData?.debugPayloadPath;
      const debugStatus = updateError?.customData?.debug?.reason;
      if (debugPayloadPath || debugStatus) {
        setError(
          `${updateError?.customData?.message || updateError?.message || "Could not update share output."}`
          + `${debugPayloadPath ? ` | payload: ${debugPayloadPath}` : ""}`
          + `${debugStatus ? ` | debug: ${debugStatus}` : ""}`
        );
        return;
      }
      const messageText =
        updateError?.customData?.message ||
        updateError?.message ||
        "Could not update share output.";
      setError(messageText);
    } finally {
      setUpdatingShareOutput(false);
    }
  };

  const updateShowMomContacts = async (checked) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canUpdateShareOutput) {
      setError("Your role cannot update the share output.");
      return;
    }

    const nextEventForm = {
      ...form,
      showMomContacts: checked,
    };
    setForm(nextEventForm);
    setMessage("");
    setError("");

    try {
      await updateEvent(eventId, nextEventForm, userProfile);
      setSavedEventForm((current) => ({
        ...current,
        showMomContacts: checked,
      }));
      setMessage("Home page contact setting saved.");
    } catch (updateError) {
      console.error(updateError);
      setForm(form);
      setError("Could not save home page contact setting.");
    }
  };

  const updateShowMomKeyInfo = async (checked) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canUpdateShareOutput) {
      setError("Your role cannot update the share output.");
      return;
    }

    const nextEventForm = {
      ...form,
      showMomKeyInfo: checked,
    };
    setForm(nextEventForm);
    setMessage("");
    setError("");

    try {
      await updateEvent(eventId, nextEventForm, userProfile);
      setSavedEventForm((current) => ({
        ...current,
        showMomKeyInfo: checked,
      }));
      setMessage("Home page key info setting saved.");
    } catch (updateError) {
      console.error(updateError);
      setForm(form);
      setError("Could not save home page key info setting.");
    }
  };

  const startAddingFilteredView = () => {
    if (!canManageFilteredViews) return;
    setFilteredViewFormMode("add");
    setEditingFilteredViewId("");
    setFilteredViewForm({
      ...emptyFilteredViewForm,
      sortOrder: getNextFilteredViewSortOrder(filteredViews),
    });
    setMessage("");
    setError("");
  };

  const startEditingFilteredView = (view) => {
    if (!canManageFilteredViews) return;
    setFilteredViewFormMode("edit");
    setEditingFilteredViewId(view.id);

    const nextTagIds = getArrayValue(view.filterTagIds);
    const nextLocationIds = getArrayValue(view.filterLocationIds);
    const nextSubLocationIds = getArrayValue(view.filterSubLocationIds);
    const nextSupplierIds = getArrayValue(view.filterSupplierIds);
    const inferredLocationIds = nextSubLocationIds
      .map((subLocationId) => locationById.get(subLocationId)?.parentLocationId)
      .filter(Boolean);

    const mergedLocationIds = [...new Set([...nextLocationIds, ...inferredLocationIds])];

    setFilteredViewForm({
      name: view.name || "",
      filterBox: readBooleanValue(view.filterBox, true),
      showKeyInfo: readBooleanValue(view.showKeyInfo, true),
      showLocations: readBooleanValue(view.showLocations, false),
      showContacts: readBooleanValue(view.showContacts ?? view.includeContacts, false),
      groupPresetId: view.groupPresetId || "",
      filterTagIds: nextTagIds,
      filterLocationIds: mergedLocationIds,
      filterSubLocationIds: nextSubLocationIds.filter((subLocationId) => {
        const subLocation = locationById.get(subLocationId);
        return (
          subLocation?.parentLocationId
          && (mergedLocationIds.length > 0 ? mergedLocationIds.includes(subLocation.parentLocationId) : false)
        );
      }),
      filterSupplierIds: nextSupplierIds,
      filterGroup: view.filterGroup || "",
      group: view.group || "",
      sortOrder: normaliseSortOrderValue(view.sortOrder, FALLBACK_FILTERED_VIEW_SORT_ORDER),
    });
    setMessage("");
    setError("");
  };

  const saveFilteredView = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageFilteredViews) {
      setError("Your role cannot manage filtered views.");
      return;
    }

    const name = filteredViewForm.name.trim();
    if (!name) {
      setError("Filtered view name is required.");
      return;
    }

    setSavingFilteredView(true);
    setMessage("");
    setError("");

    try {
      const nextFilteredView = buildFilteredViewApiPayload({
        ...filteredViewForm,
        name,
      });

      if (editingFilteredViewId) {
        await updateFilteredView(editingFilteredViewId, nextFilteredView);
        setMessage("Filtered view saved.");
      } else {
        await createFilteredView(nextFilteredView);
        setMessage("Filtered view created.");
      }

      resetFilteredViewForm();
      await loadFilteredViews();
    } catch (filteredViewError) {
      console.error(filteredViewError);
      setError("Could not save filtered view.");
    } finally {
      setSavingFilteredView(false);
    }
  };

  const removeFilteredView = async (filteredViewId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!canManageFilteredViews) {
      setError("Your role cannot manage filtered views.");
      return;
    }

    const targetView = filteredViews.find((view) => view.id === filteredViewId);
    const confirmed = window.confirm(
      `Delete ${targetView?.name ? `"${targetView.name}"` : "this filtered view"}?`
    );
    if (!confirmed) return;

    setDeletingFilteredViewId(filteredViewId);
    setMessage("");
    setError("");

    try {
      await deleteFilteredView(filteredViewId);
      if (editingFilteredViewId === filteredViewId) resetFilteredViewForm();
      await loadFilteredViews();
      setMessage("Filtered view deleted.");
    } catch (filteredViewError) {
      console.error(filteredViewError);
      setError("Could not delete filtered view.");
    } finally {
      setDeletingFilteredViewId("");
    }
  };

  const reorderCompanyContact = async (companyId, sourceContactId, targetContactId) => {
    if (!canManageCompanyContacts || isWriteDisabled || reorderingCompanyContactId) return;
    if (!companyId || !sourceContactId || !targetContactId || sourceContactId === targetContactId) {
      return;
    }

    const currentContacts = eventContactsByCompanyId[companyId] || [];
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

    setEventContactsByCompanyId((current) => ({
      ...current,
      [companyId]: orderedContacts,
    }));
    setCompanyContactDropTargetId("");
    setReorderingCompanyContactId(companyId);
    setMessage("");
    setError("");

    try {
      await updateEventContactOrder(orderedContacts);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder company contacts.");
      await reloadEventContacts();
    } finally {
      setReorderingCompanyContactId("");
    }
  };

  const reorderContactCompany = async (sourceCompanyId, targetCompanyId) => {
    if (!canManageContactCompanyOrder || isWriteDisabled || savingContactCompanyOrder) return;
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
  const getTruckDestinationValue = ({ locationId = "", companyIds = [] } = {}) => {
    if (locationId) return `location:${locationId}`;
    if (companyIds[0]) return `company:${companyIds[0]}`;
    return "";
  };
  const parseTruckDestinationValue = (value) => {
    const [type, id] = String(value || "").split(":");
    if (type === "location" && id) return { locationId: id, companyIds: [] };
    if (type === "company" && id) return { locationId: "", companyIds: [id] };
    return { locationId: "", companyIds: [] };
  };
  const toggleCompanyIds = (companyIds = [], companyId) =>
    companyIds.includes(companyId)
      ? companyIds.filter((currentCompanyId) => currentCompanyId !== companyId)
      : [...companyIds, companyId];
  const activeScheduleFilterCount = [
    selectedTagFilterIds.length > 0,
    selectedLocationFilterIds.length > 0,
    selectedSubLocationFilterIds.length > 0,
    selectedCompanyFilterIds.length > 0,
  ].filter(Boolean).length;
  const hasActiveScheduleFilters = activeScheduleFilterCount > 0;
  const clearScheduleFilters = () => {
    setSelectedTagFilterIds([]);
    setSelectedLocationFilterIds([]);
    setSelectedSubLocationFilterIds([]);
    setSelectedCompanyFilterIds([]);
  };
  const ensureTruckTag = async () => {
    const existingTruckTag = tags.find(isReservedTruckTag);
    if (existingTruckTag) return existingTruckTag;

    const truckTag = {
      eventId,
      name: "Truck",
      colour: emptyTagForm.colour,
    };
    const truckTagRef = await createTag(truckTag);
    const createdTruckTag = {
      id: truckTagRef.id,
      ...truckTag,
    };
    setTags((current) =>
      [...current, createdTruckTag].sort((tagA, tagB) =>
        String(tagA.name || "").localeCompare(String(tagB.name || ""))
      )
    );
    return createdTruckTag;
  };

  const assignDetailTag = async (dayId, detail, tagId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setSavingDetailId(detail.id);
    setError("");

    try {
      const nextTagId = detail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(tagId);
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: (current[dayId] || []).map((nextDetail) =>
          nextDetail.id === detail.id ? { ...nextDetail, tagId: nextTagId } : nextDetail
        ),
      }));
      await updateScheduleDetail(detail.id, {
        eventId,
        tagId: nextTagId,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          tagId: nextTagId,
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
    if (isWriteDisabled) {
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
        locationId,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          locationId,
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
    if (isWriteDisabled) {
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
        companyIds,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
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
    setTagFormMode("");
    setEditingTagId("");
    setTagForm(emptyTagForm);
  };

  const startAddingTag = () => {
    setTagFormMode("add");
    setEditingTagId("");
    setTagForm(emptyTagForm);
    setError("");
    setMessage("");
  };

  const startEditingTag = (tag) => {
    setTagFormMode("edit");
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
    if (isWriteDisabled) {
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
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTagId(tagId);
    setError("");
    setMessage("");

    try {
      const targetTag = tags.find((tag) => tag.id === tagId);
      const isTruckTag = isReservedTruckTag(targetTag);
      if (isTruckTag && truckScheduleDetails.length > 0) {
        setError("Truck can not be deleted whilst truck entries exist.");
        return;
      }

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

  const updateTruckSizeFormField = (field, value) => {
    setTruckSizeForm((current) => ({ ...current, [field]: value }));
  };

  const resetTruckSizeForm = () => {
    setTruckSizeFormMode("");
    setEditingTruckSizeId("");
    setTruckSizeForm(emptyTruckSizeForm);
  };

  const startAddingTruckSize = () => {
    setTruckSizeFormMode("add");
    setEditingTruckSizeId("");
    setTruckSizeForm(emptyTruckSizeForm);
    setError("");
    setMessage("");
  };

  const startEditingTruckSize = (truckSize) => {
    setTruckSizeFormMode("edit");
    setEditingTruckSizeId(truckSize.id);
    setTruckSizeForm({
      size: truckSize.size || "",
    });
    setError("");
    setMessage("");
  };

  const saveTruckSize = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingTruckSize(true);
    setError("");
    setMessage("");

    try {
      const size = truckSizeForm.size.trim();
      if (!size) {
        setError("Truck size is required.");
        return;
      }

      if (editingTruckSizeId) {
        await updateTruckSize(editingTruckSizeId, { size });
        setMessage("Truck size saved.");
      } else {
        await createTruckSize({ eventId, size });
        setMessage("Truck size created.");
      }

      resetTruckSizeForm();
      await loadTruckSizes();
    } catch (truckSizeError) {
      console.error(truckSizeError);
      setError("Could not save truck size.");
    } finally {
      setSavingTruckSize(false);
    }
  };

  const removeTruckSize = async (truckSizeId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTruckSizeId(truckSizeId);
    setError("");
    setMessage("");

    try {
      await deleteTruckSize(truckSizeId);
      if (editingTruckSizeId === truckSizeId) resetTruckSizeForm();
      await loadTruckSizes();
      setMessage("Truck size deleted.");
    } catch (truckSizeError) {
      console.error(truckSizeError);
      setError("Could not delete truck size.");
    } finally {
      setDeletingTruckSizeId("");
    }
  };

  const updateTruckFormField = (field, value) => {
    setTruckForm((current) => ({ ...current, [field]: value }));
  };

  const resetTruckForm = () => {
    setEditingTruckId("");
    setTruckForm(emptyTruckForm);
    setTruckFormMode("");
  };

  const startAddingTruck = () => {
    setEditingTruckId("");
    setTruckForm(emptyTruckForm);
    setTruckFormMode("create");
    setError("");
    setMessage("");
  };

  const startEditingTruck = (truck) => {
    setEditingTruckId(truck.id);
    setTruckFormMode("edit");
    setTruckForm({
      truckSizeId: truck.truckSizeId || "",
      companyId: truck.companyId || "",
      truckNumber: truck.truckNumber || "",
      driverName: truck.driverName || "",
      driverContactNumber: truck.driverContactNumber || "",
      contents: truck.contents || "",
    });
    setError("");
    setMessage("");
  };

  const buildTruckPayload = () => {
    const selectedTruckSize = truckSizes.find((truckSize) => truckSize.id === truckForm.truckSizeId);
    if (!selectedTruckSize) return null;
    const selectedCompany = companies.find((company) => company.id === truckForm.companyId);
    if (!selectedCompany) return null;

    return {
      eventId,
      truckSizeId: selectedTruckSize.id,
      size: selectedTruckSize.size || "",
      companyId: selectedCompany.id,
      companyName: selectedCompany.companyName || "",
      truckNumber: truckForm.truckNumber.trim(),
      driverName: truckForm.driverName.trim(),
      driverContactNumber: truckForm.driverContactNumber.trim(),
      contents: truckForm.contents.trim(),
    };
  };

  const saveTruck = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingTruck(true);
    setError("");
    setMessage("");

    try {
      const truckPayload = buildTruckPayload();
      if (!truckPayload) {
        setError("Truck size and company are required.");
        return;
      }
      if (!truckPayload.truckNumber) {
        setError("Truck number is required.");
        return;
      }

      if (editingTruckId) {
        await updateTruck(editingTruckId, truckPayload);
        setMessage("Truck saved.");
      } else {
        await createTruck(truckPayload);
        setMessage("Truck created.");
      }

      resetTruckForm();
      await loadTrucks();
    } catch (truckError) {
      console.error(truckError);
      setError("Could not save truck.");
    } finally {
      setSavingTruck(false);
    }
  };

  const removeTruck = async (truckId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    setDeletingTruckId(truckId);
    setError("");
    setMessage("");

    try {
      await deleteTruck(truckId);
      if (editingTruckId === truckId) resetTruckForm();
      await loadTrucks();
      setMessage("Truck deleted.");
    } catch (truckError) {
      console.error(truckError);
      setError("Could not delete truck.");
    } finally {
      setDeletingTruckId("");
    }
  };

  const updateLocationFormField = (field, value) => {
    setLocationForm((current) => ({ ...current, [field]: value }));
  };

  const resetLocationForm = () => {
    setLocationFormMode("");
    setEditingLocationId("");
    setLocationForm(emptyLocationForm);
  };

  const startAddingLocation = () => {
    setLocationFormMode("add");
    setEditingLocationId("");
    setLocationForm(emptyLocationForm);
    setError("");
    setMessage("");
  };

  const startEditingLocation = (location) => {
    setLocationFormMode("edit");
    setEditingLocationId(location.id);
    setLocationForm({
      name: location.name || "",
      parentLocationId: location.parentLocationId || "",
    });
    setError("");
    setMessage("");
  };

  const startAddingSubLocation = (location) => {
    if (isWriteDisabled || location.parentLocationId) return;
    setLocationFormMode("add");
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
    if (isWriteDisabled) {
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
    if (isWriteDisabled) {
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
    if (isWriteDisabled) {
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

  const openNotesEditor = (detail) => {
    if (isWriteDisabled) return;
    setOpenActionMenuId("");
    setOpenNotesDetailId((current) => {
      if (current === detail.id) return "";
      setNotesDraft(detail.notes || "");
      return detail.id;
    });
    setMessage("");
    setError("");
  };

  const closeNotesEditor = () => {
    setOpenNotesDetailId("");
    setNotesDraft("");
  };

  const saveDetailNotes = async (detail, nextNotes = notesDraft) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingDetailId(detail.id);
    setError("");

    try {
      await updateScheduleDetail(detail.id, {
        notes: nextNotes,
      });
      updateDetailAcrossDays(detail.id, { notes: nextNotes });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          notes: nextNotes,
        },
      }));
      closeNotesEditor();
      setMessage("Notes saved.");
    } catch (notesError) {
      console.error(notesError);
      setError("Could not save notes.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const isEditingDetailCell = (detailId, field) =>
    editingDetailCell?.detailId === detailId && editingDetailCell?.field === field;

  const startEditingDetailCell = (dayId, detailId, field) => {
    if (isWriteDisabled) return;
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
    if (isWriteDisabled) {
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
      });
      setDetailsByDayId((current) => ({
        ...current,
        [dayId]: sortDetailsForDisplay(
          (current[dayId] || []).map((nextDetail) =>
            nextDetail.id === detail.id
              ? {
                  ...nextDetail,
                  time: detail.time || "",
                  description: detail.description || "",
                  sortOrder: detail.sortOrder,
                }
              : nextDetail
          )
        ),
      }));
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          time: detail.time || "",
          description: detail.description || "",
          sortOrder: detail.sortOrder,
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

  const startEditingDetail = (dayId, detail) => {
    const tagId = detail.truckId
      ? detail.tagId || ""
      : getEditableDetailTagId(detail.tagId);
    setEditingDetailModal({ dayId, detailId: detail.id });
    setDetailEditForm({
      time: detail.time || "",
      description: detail.description || "",
      action: detail.action || "",
      destinationValue: getTruckDestinationValue(detail),
      tagId,
      locationId: detail.locationId || "",
      companyIds: Array.isArray(detail.companyIds) ? detail.companyIds : [],
      notes: detail.notes || "",
    });
    setOpenActionMenuId("");
    setMessage("");
    setError("");
  };

  const startEditingDetailTime = (dayId, detail) => {
    const tagId = detail.truckId
      ? detail.tagId || ""
      : getEditableDetailTagId(detail.tagId);
    setEditingDetailTimeModal({ dayId, detailId: detail.id });
    setDetailEditForm({
      time: detail.time || "",
      description: detail.description || "",
      action: detail.action || "",
      destinationValue: getTruckDestinationValue(detail),
      tagId,
      locationId: detail.locationId || "",
      companyIds: Array.isArray(detail.companyIds) ? detail.companyIds : [],
      notes: detail.notes || "",
    });
    setOpenActionMenuId("");
    setMessage("");
    setError("");
  };

  const cancelEditingDetail = () => {
    setEditingDetailModal(null);
    setEditingDetailTimeModal(null);
    setAddingDetailDayId("");
    setAddingTruckDetailTruckId("");
    setDetailEditForm(emptyDetailEditForm);
  };

  const updateDetailEditFormField = (field, value) => {
    setDetailEditForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  };

  const updateDetailEditTimePart = (part, value) => {
    setDetailEditForm((currentForm) => {
      const [currentHour = "00", currentMinute = "00"] = (currentForm.time || "00:00").split(":");
      const nextHour = part === "hour" ? value : currentHour.padStart(2, "0");
      const nextMinute = part === "minute" ? value : currentMinute.padStart(2, "0");

      return {
        ...currentForm,
        time: `${nextHour}:${nextMinute}`,
      };
    });
  };

  const handleDetailTimeWheelKeyDown = (part, event) => {
    const handledKeys = ["ArrowUp", "ArrowDown", "Home", "End"];
    if (!handledKeys.includes(event.key)) return;

    event.preventDefault();
    const values = part === "hour" ? timePickerHours : timePickerMinutes;
    const [currentHour = "00", currentMinute = "00"] = (detailEditForm.time || "00:00").split(":");
    const currentValue = part === "hour" ? currentHour.padStart(2, "0") : currentMinute.padStart(2, "0");
    const currentIndex = Math.max(0, values.indexOf(currentValue));
    let nextIndex = currentIndex;

    if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
    if (event.key === "ArrowDown") nextIndex = Math.min(values.length - 1, currentIndex + 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = values.length - 1;

    updateDetailEditTimePart(part, values[nextIndex]);
  };

  const toggleDetailEditCompany = (companyId) => {
    setDetailEditForm((currentForm) => ({
      ...currentForm,
      companyIds: toggleCompanyIds(currentForm.companyIds || [], companyId),
    }));
  };

  const saveDetailEditForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editingDetailModal) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const currentDetail = detailsByDayId[editingDetailModal.dayId]?.find(
      (detail) => detail.id === editingDetailModal.detailId
    );
    if (!currentDetail) {
      setError("Could not find schedule detail.");
      return;
    }

    setSavingDetailId(currentDetail.id);
    setMessage("");
    setError("");

    try {
      const truckDestination = currentDetail.truckId
        ? parseTruckDestinationValue(detailEditForm.destinationValue)
        : null;
      const tagId = currentDetail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(detailEditForm.tagId);
      const updates = {
        eventId,
        time: detailEditForm.time || "",
        description: currentDetail.truckId
          ? currentDetail.description || ""
          : detailEditForm.description || "",
        action: currentDetail.truckId ? detailEditForm.action || "" : currentDetail.action || "",
        notes: detailEditForm.notes || "",
        sortOrder: currentDetail.sortOrder,
        colour: normaliseHexColour(currentDetail.colour),
        tagId,
        locationId: currentDetail.truckId
          ? truckDestination.locationId
          : detailEditForm.locationId || "",
        companyIds: currentDetail.truckId
          ? truckDestination.companyIds
          : detailEditForm.companyIds || [],
      };

      await updateScheduleDetail(currentDetail.id, updates);

      setDetailsByDayId((current) => ({
        ...current,
        [editingDetailModal.dayId]: sortDetailsForDisplay(
          (current[editingDetailModal.dayId] || []).map((detail) =>
            detail.id === currentDetail.id
              ? {
                  ...detail,
                  ...updates,
                }
              : detail
          )
        ),
      }));
      setSavedDetailsById((current) => ({
        ...current,
        [currentDetail.id]: {
          ...(current[currentDetail.id] || {}),
          ...updates,
        },
      }));
      cancelEditingDetail();
      setMessage("Schedule row saved.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save schedule row.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const saveDetailTimeForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!editingDetailTimeModal) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const currentDetail = detailsByDayId[editingDetailTimeModal.dayId]?.find(
      (detail) => detail.id === editingDetailTimeModal.detailId
    );
    if (!currentDetail) {
      setError("Could not find schedule detail.");
      return;
    }

    setSavingDetailId(currentDetail.id);
    setMessage("");
    setError("");

    try {
      await updateScheduleDetail(currentDetail.id, {
        eventId,
        time: detailEditForm.time || "",
      });
      setDetailsByDayId((current) => ({
        ...current,
        [editingDetailTimeModal.dayId]: sortDetailsForDisplay(
          (current[editingDetailTimeModal.dayId] || []).map((detail) =>
            detail.id === currentDetail.id
              ? { ...detail, time: detailEditForm.time || "" }
              : detail
          )
        ),
      }));
      setSavedDetailsById((current) => ({
        ...current,
        [currentDetail.id]: {
          ...(current[currentDetail.id] || {}),
          time: detailEditForm.time || "",
        },
      }));
      cancelEditingDetail();
      setMessage("Time saved.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not save time.");
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
      return previousDetail
        ? {
            dayId: previousDetail.scheduleDayId || dayId,
            detailId: previousDetail.id,
            field: "description",
          }
        : null;
    }

    if (field === "time") {
      return { dayId, detailId: dayDetails[detailIndex].id, field: "description" };
    }
    const nextDetail = dayDetails[detailIndex + 1];
    return nextDetail
      ? { dayId: nextDetail.scheduleDayId || dayId, detailId: nextDetail.id, field: "time" }
      : null;
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
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    setSavingDetailId(detailId);
    setError("");

    try {
      await deleteScheduleDetail(detailId);
      removeDetailFromDay(dayId, detailId);
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
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    const orderedDetails = nextDetails.map((detail, detailIndex) => ({
      ...detail,
      sortOrder: detailIndex,
    }));
    const changedDetails = orderedDetails.filter((detail, detailIndex) =>
      detail.sortOrder !== nextDetails[detailIndex]?.sortOrder
    );

    setDayDetails(dayId, orderedDetails);
    setReorderingDayId(dayId);
    setError("");

    try {
      await updateScheduleDetailOrder(changedDetails);
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
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!targetDayId || savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      const tagId = detail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(detail.tagId);
      await updateScheduleDetail(detail.id, {
        eventId,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: getNextSortOrder(targetDayId),
        scheduleDayId: targetDayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        action: detail.action || "",
        colour: normaliseHexColour(detail.colour),
        tagId,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
      moveDetailLocally(sourceDayId, targetDayId, detail, {
        scheduleDayId: targetDayId,
        sortOrder: getNextSortOrder(targetDayId),
        tagId,
      });
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
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      const tagId = detail.truckId
        ? (await ensureTruckTag()).id
        : getEditableDetailTagId(detail.tagId);
      const detailData = {
        eventId,
        scheduleDayId: dayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        time: detail.time || "",
        description: detail.description || "",
        notes: detail.notes || "",
        sortOrder: getNextSortOrder(dayId),
        colour: normaliseHexColour(detail.colour),
        tagId,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(dayId, detailRef, detailData);
    } catch (duplicateError) {
      console.error(duplicateError);
      setError("Could not duplicate schedule detail.");
    } finally {
      setSavingDetailId("");
    }
  };

  const buildDraftDetailDefaultsFromFilters = () => {
    const validTagFilterIds = selectedTagFilterIds.filter(
      (tagId) => getTagById(tagId) && !isReservedTruckTagId(tagId)
    );
    const tagId = validTagFilterIds.length > 0
      ? validTagFilterIds[0]
      : "";

    const filteredCompanyIds = selectedCompanyFilterIds.filter(
      (companyId) => companyById.has(companyId)
    );
    const defaultCompanyIds =
      showCompanyColumn
        ? (filteredCompanyIds.length > 0
          ? filteredCompanyIds
          : (showCompanyColumn && companies.length === 1 ? [companies[0].id] : []))
        : [];

    let locationId = "";
    if (showLocationColumn) {
      const validSubLocationId = selectedSubLocationFilterIds.find((locationId) =>
        locationById.has(locationId) && locationOptions.some((location) => location.id === locationId)
      );
      if (validSubLocationId) {
        locationId = validSubLocationId;
      } else if (selectedLocationFilterIds.length > 0) {
        const selectedLocation = locationById.get(selectedLocationFilterIds[0]);
        if (selectedLocation) {
          const topLocationId = selectedLocation.parentLocationId || selectedLocation.id;
          const defaultSubLocation = locationOptions.find(
            (location) =>
              location.parentLocationId === topLocationId || location.id === topLocationId
          );
          if (defaultSubLocation) {
            locationId = defaultSubLocation.id;
          }
        }
      }
    }

    if (!locationId && showLocationColumn && locationOptions.length === 1) {
      locationId = locationOptions[0].id;
    }

    return {
      tagId,
      locationId,
      companyIds: defaultCompanyIds,
    };
  };

  const addDraftDetail = (dayId) => {
    if (isWriteDisabled) return;
    const defaults = buildDraftDetailDefaultsFromFilters();

    if (window.matchMedia("(max-width: 700px)").matches) {
      setAddingDetailDayId(dayId);
      setDetailEditForm({
        ...emptyDetailEditForm,
        tagId: defaults.tagId,
        locationId: defaults.locationId,
        companyIds: defaults.companyIds,
      });
      setMessage("");
      setError("");
      return;
    }

    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: [
        {
          time: "",
          description: "",
          colour: "",
          tagId: defaults.tagId,
          locationId: defaults.locationId,
          companyIds: defaults.companyIds,
        },
        ...(current[dayId] || []),
      ],
    }));
  };

  const updateDraftDetail = (dayId, draftIndex, field, value) => {
    const nextValue = field === "tagId" ? getEditableDetailTagId(value) : value;
    setDraftDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, [field]: nextValue } : draft
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
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!draft.description?.trim()) {
      setError("Description is required.");
      return;
    }
    if (!scheduleDayById.get(dayId)?.date) {
      setError("Date is required.");
      return;
    }
    setSavingDraftDayId(dayId);
    setError("");

    try {
      const detailData = {
        eventId,
        scheduleDayId: dayId,
        time: draft.time,
        description: draft.description.trim(),
        notes: draft.notes || "",
        sortOrder: getNextSortOrder(dayId),
        colour: normaliseHexColour(draft.colour),
        tagId: getEditableDetailTagId(draft.tagId),
        locationId: draft.locationId || "",
        companyIds: draft.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      removeDraftDetail(dayId, draftIndex);
      addCreatedDetailToDay(dayId, detailRef, detailData);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add schedule detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const saveMobileAddDetailForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!addingDetailDayId) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!detailEditForm.description?.trim()) {
      setError("Description is required.");
      return;
    }
    if (!scheduleDayById.get(addingDetailDayId)?.date) {
      setError("Date is required.");
      return;
    }

    setSavingDraftDayId(addingDetailDayId);
    setMessage("");
    setError("");

    try {
      const detailData = {
        eventId,
        scheduleDayId: addingDetailDayId,
        time: detailEditForm.time || "",
        description: detailEditForm.description.trim(),
        notes: detailEditForm.notes || "",
        sortOrder: getNextSortOrder(addingDetailDayId),
        colour: "",
        tagId: getEditableDetailTagId(detailEditForm.tagId),
        locationId: detailEditForm.locationId || "",
        companyIds: detailEditForm.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(addingDetailDayId, detailRef, detailData);
      cancelEditingDetail();
      setMessage("Schedule row added.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add schedule detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const getTruckDetails = (truck) => {
    return truckScheduleDetails
      .filter((detail) => detail.truckId === truck.id)
      .sort((detailA, detailB) => {
        const dateA = String(scheduleDayById.get(detailA.scheduleDayId)?.date || "");
        const dateB = String(scheduleDayById.get(detailB.scheduleDayId)?.date || "");
        const dateComparison = dateA.localeCompare(dateB);
        if (dateComparison !== 0) return dateComparison;

        const orderA = typeof detailA.sortOrder === "number" ? detailA.sortOrder : 0;
        const orderB = typeof detailB.sortOrder === "number" ? detailB.sortOrder : 0;
        const timeComparison = String(detailA.time || "").localeCompare(String(detailB.time || ""));
        if (timeComparison !== 0) return timeComparison;
        if (orderA !== orderB) return orderA - orderB;

        return String(detailA.id || "").localeCompare(String(detailB.id || ""));
      });
  };

  const getNextTruckDetailSortOrder = (truckId) => {
    return (
      truckScheduleDetails
        .filter((detail) => detail.truckId === truckId)
        .reduce(
          (maxSortOrder, detail, detailIndex) =>
            Math.max(
              maxSortOrder,
              typeof detail.sortOrder === "number" ? detail.sortOrder : detailIndex
            ),
          -1
        ) + 1
      );
  };

  const buildDefaultTruckDestination = () => {
    const hasSingleDestination =
      showTruckDestinationColumn &&
      (locationOptions.length + companies.length === 1);
    return hasSingleDestination && locationOptions.length === 1
      ? { locationId: locationOptions[0].id, companyIds: [] }
      : hasSingleDestination && companies.length === 1
      ? { locationId: "", companyIds: [companies[0].id] }
      : { locationId: "", companyIds: [] };
  };

  const addDraftTruckDetail = (truckId) => {
    if (isWriteDisabled) return;
    const defaultTruckDestination = buildDefaultTruckDestination();

    if (window.matchMedia("(max-width: 700px)").matches) {
      setAddingTruckDetailTruckId(truckId);
      setDetailEditForm({
        ...emptyDetailEditForm,
        scheduleDayId: scheduleDays[0]?.id || "",
        destinationValue: getTruckDestinationValue(defaultTruckDestination),
        ...defaultTruckDestination,
      });
      setMessage("");
      setError("");
      return;
    }

    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: [
        ...(current[truckId] || []),
        {
          scheduleDayId: scheduleDays[0]?.id || "",
          action: "",
          time: "",
          description: "",
          colour: "",
          tagId: "",
          notes: "",
          ...defaultTruckDestination,
        },
      ],
    }));
  };

  const updateDraftTruckDetail = (truckId, draftIndex, field, value) => {
    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: (current[truckId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, [field]: value } : draft
      ),
    }));
  };

  const updateDraftTruckDestination = (truckId, draftIndex, value) => {
    const destination = parseTruckDestinationValue(value);
    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: (current[truckId] || []).map((draft, index) =>
        index === draftIndex ? { ...draft, ...destination } : draft
      ),
    }));
  };

  const removeDraftTruckDetail = (truckId, draftIndex) => {
    setDraftTruckDetailsByTruckId((current) => ({
      ...current,
      [truckId]: (current[truckId] || []).filter((_, index) => index !== draftIndex),
    }));
  };

  const saveDraftTruckDetail = async (truck, draftIndex, draft) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!draft.scheduleDayId) {
      setError("Date is required.");
      return;
    }
    setSavingDraftDayId(truck.id);
    setError("");

    try {
      const truckTag = await ensureTruckTag();
      const detailData = {
        eventId,
        scheduleDayId: draft.scheduleDayId,
        truckId: truck.id,
        truckNumber: truck.truckNumber || "",
        action: draft.action || "",
        time: draft.time,
        description: String(draft.description || "").trim(),
        notes: draft.notes || "",
        sortOrder: getNextTruckDetailSortOrder(truck.id),
        colour: normaliseHexColour(truckTag.colour),
        tagId: truckTag.id,
        locationId: draft.locationId || "",
        companyIds: draft.locationId ? [] : draft.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      removeDraftTruckDetail(truck.id, draftIndex);
      addCreatedDetailToDay(draft.scheduleDayId, detailRef, detailData);
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add truck detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const saveMobileAddTruckDetailForm = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!addingTruckDetailTruck) return;
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!detailEditForm.scheduleDayId) {
      setError("Date is required.");
      return;
    }

    setSavingDraftDayId(addingTruckDetailTruck.id);
    setMessage("");
    setError("");

    try {
      const truckTag = await ensureTruckTag();
      const destination = parseTruckDestinationValue(detailEditForm.destinationValue);
      const detailData = {
        eventId,
        scheduleDayId: detailEditForm.scheduleDayId,
        truckId: addingTruckDetailTruck.id,
        truckNumber: addingTruckDetailTruck.truckNumber || "",
        action: detailEditForm.action || "",
        time: detailEditForm.time || "",
        description: "",
        notes: detailEditForm.notes || "",
        sortOrder: getNextTruckDetailSortOrder(addingTruckDetailTruck.id),
        colour: normaliseHexColour(truckTag.colour),
        tagId: truckTag.id,
        locationId: destination.locationId || "",
        companyIds: destination.locationId ? [] : destination.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(detailEditForm.scheduleDayId, detailRef, detailData);
      cancelEditingDetail();
      setMessage("Truck row added.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not add truck detail.");
    } finally {
      setSavingDraftDayId("");
    }
  };

  const assignTruckDetailDate = async (sourceDayId, detail, targetDayId) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (!targetDayId || targetDayId === sourceDayId) return;

    setSavingDetailId(detail.id);
    setError("");

    try {
      const truckTag = await ensureTruckTag();
      const updates = {
        eventId,
        scheduleDayId: targetDayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        action: detail.action || "",
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: getNextSortOrder(targetDayId),
        colour: normaliseHexColour(detail.colour),
        tagId: truckTag.id,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      };
      await updateScheduleDetail(detail.id, {
        ...updates,
      });
      moveDetailLocally(sourceDayId, targetDayId, detail, updates);
    } catch (dateError) {
      console.error(dateError);
      setError("Could not update truck detail date.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const persistTruckDetailOrder = async (truckId, nextDetails) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    const orderedDetails = nextDetails.map((detail, detailIndex) => ({
      ...detail,
      sortOrder: detailIndex,
    }));
    const changedDetails = orderedDetails.filter((detail, detailIndex) =>
      detail.sortOrder !== nextDetails[detailIndex]?.sortOrder
    );

    setDetailsByDayId((current) => {
      const orderedById = new Map(orderedDetails.map((detail) => [detail.id, detail]));
      const nextDetailsByDayId = Object.fromEntries(
        Object.entries(current).map(([dayId, details]) => [
          dayId,
          details.map((detail) => orderedById.get(detail.id) || detail),
        ])
      );
      Object.entries(nextDetailsByDayId).forEach(([dayId, details]) => {
        cacheScheduleDetails(dayId, sortDetailsForDisplay(details));
      });
      return nextDetailsByDayId;
    });
    setReorderingDayId(truckId);
    setError("");

    try {
      await updateScheduleDetailOrder(changedDetails);
    } catch (reorderError) {
      console.error(reorderError);
      setError("Could not reorder truck details.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setReorderingDayId("");
    }
  };

  const getNextTruckDetailAction = (currentAction) => {
    const normalisedAction =
      currentAction === "Collect" ? "Deliver" : currentAction || "";
    const currentActionIndex = truckDetailActions.indexOf(normalisedAction);
    return truckDetailActions[(currentActionIndex + 1) % truckDetailActions.length];
  };

  const toggleTruckDetailAction = async (dayId, detail) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const nextAction = getNextTruckDetailAction(detail.action);
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, action: nextAction } : nextDetail
      ),
    }));

    try {
      const truckTag = await ensureTruckTag();
      await updateScheduleDetail(detail.id, {
        eventId,
        scheduleDayId: dayId,
        truckId: detail.truckId || "",
        truckNumber: detail.truckNumber || "",
        action: nextAction,
        time: detail.time || "",
        description: detail.description || "",
        sortOrder: detail.sortOrder,
        colour: normaliseHexColour(detail.colour),
        tagId: truckTag.id,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      });
    } catch (actionError) {
      console.error(actionError);
      setError("Could not update truck action.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const assignTruckDetailDestination = async (dayId, detail, value) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    const destination = parseTruckDestinationValue(value);
    setSavingDetailId(detail.id);
    setError("");
    setDetailsByDayId((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((nextDetail) =>
        nextDetail.id === detail.id ? { ...nextDetail, ...destination } : nextDetail
      ),
    }));

    try {
      const truckTag = await ensureTruckTag();
      await updateScheduleDetail(detail.id, {
        eventId,
        tagId: truckTag.id,
        locationId: destination.locationId,
        companyIds: destination.companyIds,
      });
      setSavedDetailsById((current) => ({
        ...current,
        [detail.id]: {
          ...(current[detail.id] || {}),
          tagId: truckTag.id,
          locationId: destination.locationId,
          companyIds: destination.companyIds,
        },
      }));
    } catch (destinationError) {
      console.error(destinationError);
      setError("Could not update truck destination.");
      await loadScheduleDetails(scheduleDays);
    } finally {
      setSavingDetailId("");
    }
  };

  const moveTruckDetail = async (truckId, truckDetails, detailId, direction) => {
    if (reorderingDayId) return;

    const detailIndex = truckDetails.findIndex((detail) => detail.id === detailId);
    const targetIndex = detailIndex + direction;
    if (detailIndex < 0 || targetIndex < 0 || targetIndex >= truckDetails.length) return;

    const nextDetails = [...truckDetails];
    [nextDetails[detailIndex], nextDetails[targetIndex]] = [
      nextDetails[targetIndex],
      nextDetails[detailIndex],
    ];
    closeActionMenu();
    await persistTruckDetailOrder(truckId, nextDetails);
  };

  const duplicateTruckDetail = async (truck, detail) => {
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }
    if (savingDetailId === detail.id) return;

    setSavingDetailId(detail.id);
    setError("");
    closeActionMenu();

    try {
      const truckTag = await ensureTruckTag();
      const detailData = {
        eventId,
        scheduleDayId: detail.scheduleDayId,
        truckId: truck.id,
        truckNumber: truck.truckNumber || "",
        action: detail.action || "",
        time: detail.time || "",
        description: detail.description || "",
        notes: detail.notes || "",
        sortOrder: getNextTruckDetailSortOrder(truck.id),
        colour: normaliseHexColour(truckTag.colour),
        tagId: truckTag.id,
        locationId: detail.locationId || "",
        companyIds: detail.companyIds || [],
      };
      const detailRef = await createScheduleDetail(detailData);
      addCreatedDetailToDay(detail.scheduleDayId, detailRef, detailData);
    } catch (duplicateError) {
      console.error(duplicateError);
      setError("Could not duplicate truck detail.");
    } finally {
      setSavingDetailId("");
    }
  };

  const handleEventSave = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
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

      const imageUrl = eventImageFile
        ? await uploadEventImage(eventId, eventImageFile)
        : form.imageUrl;
      const nextEventForm = {
        ...form,
        imageUrl,
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
      setEventImageFile(null);
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

  const startEditingScheduleDateRange = () => {
    setScheduleDateRangeDraft({
      scheduleStartDate: form.scheduleStartDate || form.startDate || "",
      scheduleEndDate: form.scheduleEndDate || form.endDate || "",
    });
    setMessage("");
    setError("");
    setIsEditingScheduleDateRange(true);
  };

  const updateScheduleDateRangeField = (field, value) => {
    setScheduleDateRangeDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const cancelEditingScheduleDateRange = () => {
    setIsEditingScheduleDateRange(false);
    setScheduleDateRangeDraft({
      scheduleStartDate: "",
      scheduleEndDate: "",
    });
  };

  const saveScheduleDateRange = async (submitEvent) => {
    submitEvent.preventDefault();
    if (isWriteDisabled) {
      setError("Editing is disabled while offline.");
      return;
    }

    if (!scheduleDateRangeDraft.scheduleStartDate || !scheduleDateRangeDraft.scheduleEndDate) {
      setError("Schedule start and end dates are required.");
      return;
    }

    if (scheduleDateRangeDraft.scheduleStartDate > scheduleDateRangeDraft.scheduleEndDate) {
      setError("Schedule start date must be before or equal to schedule end date.");
      return;
    }

    setSavingScheduleDateRange(true);
    setMessage("");
    setError("");

    try {
      const nextEventForm = {
        ...form,
        scheduleStartDate: scheduleDateRangeDraft.scheduleStartDate,
        scheduleEndDate: scheduleDateRangeDraft.scheduleEndDate,
      };

      await updateEvent(eventId, nextEventForm, userProfile);
      const days = await syncScheduleDaysToRange(
        eventId,
        nextEventForm.scheduleStartDate,
        nextEventForm.scheduleEndDate
      );

      setForm(nextEventForm);
      setSavedEventForm(nextEventForm);
      applyScheduleDays(days);
      setIsEditingScheduleDateRange(false);
      setMessage("Schedule date range updated.");
    } catch (saveError) {
      console.error(saveError);
      setError("Could not update schedule date range.");
    } finally {
      setSavingScheduleDateRange(false);
    }
  };

  const eventHeaderImageUrl = eventImagePreviewUrl || form.imageUrl;
  const eventDateRangeLabel = formatEventDateRange(form.startDate, form.endDate);
  const eventTopbarDate = eventDateRangeLabel || "No event dates";

  useEffect(() => {
    if (loading) {
      setTopbarConfig(null);
      return;
    }

    setTopbarConfig({
      variant: "event",
      content: (
        <div className="event-topbar-content">
          <div className="event-topbar-copy">
            <h1 className="event-topbar-title">{form.name || eventId}</h1>
            {form.venue ? (
              <>
                <span className="event-topbar-separator">-</span>
                <p className="event-topbar-venue">{form.venue}</p>
              </>
            ) : null}
            <span className="event-topbar-separator">-</span>
            <p className="event-topbar-meta">{eventTopbarDate}</p>
          </div>
          {!isEditingEventDetails && !isEventReadOnly ? (
            <button
              className="button event-topbar-edit-button"
              type="button"
              aria-label="Edit event"
              disabled={isOffline}
              onClick={() => {
                setIsEditingEventDetails(true);
                setMessage("");
                setError("");
              }}
            >
              <CapcomIcon name="edit" size={18} weight="bold" />
              <span className="button-label">Edit</span>
            </button>
          ) : null}
        </div>
      ),
    });
  }, [
    eventId,
    eventTopbarDate,
    form.venue,
    form.name,
    isEditingEventDetails,
    isEventReadOnly,
    isOffline,
    loading,
    setTopbarConfig,
  ]);

  useEffect(() => () => {
    setTopbarConfig(null);
  }, [setTopbarConfig]);

  if (loading) return <Loading />;

  const editingDetailDay = editingDetailModal
    ? scheduleDays.find((day) => day.id === editingDetailModal.dayId)
    : null;
  const editingDetail = editingDetailModal
    ? detailsByDayId[editingDetailModal.dayId]?.find(
        (detail) => detail.id === editingDetailModal.detailId
      )
    : null;
  const addingDetailDay = addingDetailDayId
    ? scheduleDays.find((day) => day.id === addingDetailDayId)
    : null;
  const addingTruckDetailTruck = addingTruckDetailTruckId
    ? trucks.find((truck) => truck.id === addingTruckDetailTruckId)
    : null;
  const editingDetailTimeDay = editingDetailTimeModal
    ? scheduleDays.find((day) => day.id === editingDetailTimeModal.dayId)
    : null;
  const editingDetailTime = editingDetailTimeModal
    ? detailsByDayId[editingDetailTimeModal.dayId]?.find(
        (detail) => detail.id === editingDetailTimeModal.detailId
      )
    : null;

  return (
    <main className="page">
      <EventEditorHeader
        eventId={eventId}
        form={form}
        imageUrl={eventHeaderImageUrl}
        dateRangeLabel={eventDateRangeLabel}
        isEditing={isEditingEventDetails}
        isOffline={isOffline}
        canEditEvent={!isEventReadOnly}
        savingEvent={savingEvent}
        onStartEditing={() => {
          setIsEditingEventDetails(true);
          setMessage("");
          setError("");
        }}
        onSubmit={handleEventSave}
        onCancel={cancelEditingEventDetails}
        onUpdateField={updateField}
        onImageChange={handleEventImageChange}
        onRemoveImage={removeEventImage}
        showSummary={false}
      />

      <EventEditorStatusMessages
        error={error}
        warning={warning}
        isOffline={isWriteDisabled}
        isSuperAdmin={isSuperAdmin}
        clientId={form.clientId}
        activeTab={activeTab}
        activeInfoTab={activeInfoTab}
        detailsLoading={detailsLoading}
        tagsLoading={tagsLoading}
        locationsLoading={locationsLoading}
        trucksLoading={trucksLoading}
        companiesLoading={companiesLoading}
        contactCompaniesLoading={companyContactsLoading || eventContactsLoading}
        truckSizesLoading={truckSizesLoading}
        filteredViewsLoading={filteredViewsLoading}
        shareArchiveLoading={shareArchiveLoading}
      />

      <EventEditorTabs
        tabs={eventEditTabs}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "info" ? (
      <InfoPanel
        activeInfoTab={activeInfoTab}
        setActiveInfoTab={setActiveInfoTab}
        detailsLoading={detailsLoading}
        companiesLoading={companiesLoading}
        keyInfoItems={keyInfoItems}
        keyInfoLoading={keyInfoLoading}
        keyInfoForm={keyInfoForm}
        keyInfoFormMode={keyInfoFormMode}
        editingKeyInfoId={editingKeyInfoId}
        savingKeyInfo={savingKeyInfo}
        deletingKeyInfoId={deletingKeyInfoId}
        reorderingKeyInfoId={reorderingKeyInfoId}
        draggedKeyInfoIdRef={draggedKeyInfoIdRef}
        contactCompanies={contactCompanies}
        companyContactsByCompanyId={eventContactsByCompanyId}
        editingCompanyContactCompanyId={editingCompanyContactCompanyId}
        openContactCompanyIds={openContactCompanyIds}
        canManageContactCompanyOrder={canManageContactCompanyOrder}
        canManageCompanyContacts={canManageCompanyContacts}
        isOffline={isWriteDisabled}
        savingContactCompanyOrder={savingContactCompanyOrder}
        contactCompanyDropTargetId={contactCompanyDropTargetId}
        draggedContactCompanyIdRef={draggedContactCompanyIdRef}
        companyContactsLoading={eventContactsLoading}
        companyContactDropTargetId={companyContactDropTargetId}
        reorderingCompanyContactId={reorderingCompanyContactId}
        draggedCompanyContactIdRef={draggedCompanyContactIdRef}
        savingCompanyContact={savingCompanyContact}
        companyContactForm={companyContactForm}
        editingCompanyContactId={editingCompanyContactId}
        reorderContactCompany={reorderContactCompany}
        reorderCompanyContact={reorderCompanyContact}
        setContactCompanyDropTargetId={setContactCompanyDropTargetId}
        setCompanyContactDropTargetId={setCompanyContactDropTargetId}
        toggleContactCompanyOpen={toggleContactCompanyOpen}
        startAddingCompanyContact={startAddingCompanyContact}
        startEditingCompanyContact={startEditingCompanyContact}
        updateCompanyContactFormField={updateCompanyContactFormField}
        saveCompanyContact={saveCompanyContact}
        toggleEventContactHidden={toggleEventContactHidden}
        savingEventContact={savingEventContact}
        resetCompanyContactForm={resetCompanyContactForm}
        startAddingKeyInfo={startAddingKeyInfo}
        startEditingKeyInfo={startEditingKeyInfo}
        updateKeyInfoFormField={updateKeyInfoFormField}
        saveKeyInfo={saveKeyInfo}
        removeKeyInfo={removeKeyInfo}
        reorderKeyInfo={reorderKeyInfo}
        resetKeyInfoForm={resetKeyInfoForm}
      />
      ) : null}

      {activeTab === "summary" ? (
      <SummaryPanel
        scheduleDays={scheduleDays}
        editingDayId={editingDayId}
        editingDayMode={editingDayMode}
        editingDayDraft={editingDayDraft}
        isOffline={isWriteDisabled}
        isEditingScheduleDateRange={isEditingScheduleDateRange}
        scheduleDateRangeDraft={scheduleDateRangeDraft}
        savingScheduleDateRange={savingScheduleDateRange}
        savingDayId={savingDayId}
        formatFriendlyDate={formatFriendlyDate}
        onUpdateEditingDayField={updateEditingDayField}
        onSaveDay={saveDay}
        onCancelEditingDay={cancelEditingDay}
        onStartEditingDay={startEditingDay}
        onStartEditingScheduleDateRange={startEditingScheduleDateRange}
        onUpdateScheduleDateRangeField={updateScheduleDateRangeField}
        onSaveScheduleDateRange={saveScheduleDateRange}
        onCancelEditingScheduleDateRange={cancelEditingScheduleDateRange}
      />
      ) : null}

      {activeTab === "detail" ? (
      <section className="panel">
        <DetailFilters
          usedTags={usedTags}
          usedLocationFilters={usedLocationFilters}
          usedSubLocationFilters={usedSubLocationFilters}
          usedCompanies={usedCompanies}
          detailCountByTagId={detailCountByTagId}
          detailCountByLocationFilterId={detailCountByLocationFilterId}
          detailCountBySubLocationId={detailCountBySubLocationId}
          detailCountByCompanyId={detailCountByCompanyId}
          hasActiveScheduleFilters={hasActiveScheduleFilters}
          selectedTagFilterIds={selectedTagFilterIds}
          selectedLocationFilterIds={selectedLocationFilterIds}
          selectedSubLocationFilterIds={selectedSubLocationFilterIds}
          selectedCompanyFilterIds={selectedCompanyFilterIds}
          normaliseHexColour={normaliseHexColour}
          clearScheduleFilters={clearScheduleFilters}
          setSelectedTagFilterIds={setSelectedTagFilterIds}
          toggleTagFilter={toggleTagFilter}
          setSelectedLocationFilterIds={setSelectedLocationFilterIds}
          setSelectedSubLocationFilterIds={setSelectedSubLocationFilterIds}
          setSelectedCompanyFilterIds={setSelectedCompanyFilterIds}
          toggleLocationFilter={toggleLocationFilter}
          toggleSubLocationFilter={toggleSubLocationFilter}
          toggleCompanyFilter={toggleCompanyFilter}
        />
        <DetailPanel
          scheduleDays={scheduleDays}
          detailsByDayId={detailsByDayId}
          selectedTagFilterIds={selectedTagFilterIds}
          locationById={locationById}
          selectedLocationFilterIds={selectedLocationFilterIds}
          selectedSubLocationFilterIds={selectedSubLocationFilterIds}
          selectedCompanyFilterIds={selectedCompanyFilterIds}
          draftDetailsByDayId={draftDetailsByDayId}
          formatDetailDate={formatDetailDate}
          isOffline={isWriteDisabled}
          addDraftDetail={addDraftDetail}
          startEditingDay={startEditingDay}
          isEditingDetailCell={isEditingDetailCell}
          canMoveDetail={canMoveDetail}
          getAdjacentDay={getAdjacentDay}
          getDetailRowStyle={getDetailRowStyle}
          getTruckDetailRowStyle={getDetailTruckDetailRowStyle}
          getRowTagStyle={getRowTagStyle}
          getTagById={getTagById}
          truckById={truckById}
          companyById={companyById}
          draggedDetailIdRef={draggedDetailIdRef}
          reorderDetail={reorderDetail}
          detailCellInputRef={detailCellInputRef}
          suppressDetailBlurRef={suppressDetailBlurRef}
          saveDetailCell={saveDetailCell}
          updateDetailField={updateDetailField}
          handleDetailCellKeyDown={handleDetailCellKeyDown}
          startEditingDetailCell={startEditingDetailCell}
          showTagColumn={showTagColumn}
          getTagStyle={getTagStyle}
          normaliseHexColour={normaliseHexColour}
          savingDetailId={savingDetailId}
          assignDetailTag={assignDetailTag}
          tags={normalDetailTags}
          showLocationColumn={showLocationColumn}
          getLocationById={getLocationById}
          assignDetailLocation={assignDetailLocation}
          locationOptions={locationOptions}
          showCompanyColumn={showCompanyColumn}
          getCompanyLabel={getCompanyLabel}
          companies={companies}
          assignDetailCompanies={assignDetailCompanies}
          toggleCompanyIds={toggleCompanyIds}
          showTruckDestinationColumn={showTruckDestinationColumn}
          getTruckDestinationValue={getTruckDestinationValue}
          assignTruckDetailDestination={assignTruckDetailDestination}
          openNotesDetailId={openNotesDetailId}
          closeNotesEditor={closeNotesEditor}
          openNotesEditor={openNotesEditor}
          notesDraft={notesDraft}
          setNotesDraft={setNotesDraft}
          saveDetailNotes={saveDetailNotes}
          openActionMenuId={openActionMenuId}
          setOpenActionMenuId={setOpenActionMenuId}
          beginRowAction={beginRowAction}
          endRowAction={endRowAction}
          reorderingDayId={reorderingDayId}
          moveDetail={moveDetail}
          moveDetailToDay={moveDetailToDay}
          duplicateDetail={duplicateDetail}
          startEditingDetail={startEditingDetail}
          startEditingDetailTime={startEditingDetailTime}
          closeActionMenu={closeActionMenu}
          deleteDetail={deleteDetail}
          updateDraftDetail={updateDraftDetail}
          removeDraftDetail={removeDraftDetail}
          savingDraftDayId={savingDraftDayId}
          saveDraftDetail={saveDraftDetail}
        />
      </section>
      ) : null}

      {addingDetailDayId ? (
        <Modal
          title="Add row"
          subtitle={addingDetailDay ? formatDetailDate(addingDetailDay.date) : ""}
          labelledBy="addScheduleRowTitle"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveMobileAddDetailForm}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="detailAddTime">Time</label>
                <input
                  id="detailAddTime"
                  type="time"
                  autoFocus
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </div>
              <div className="form-row full">
                <label htmlFor="detailAddDescription">Description</label>
                <input
                  id="detailAddDescription"
                  value={detailEditForm.description}
                  disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                  onChange={(event) =>
                    updateDetailEditFormField("description", event.target.value)
                  }
                  required
                />
              </div>
              {showTagColumn ? (
                <div className="form-row">
                  <label htmlFor="detailAddTag">Tag</label>
                  <select
                    id="detailAddTag"
                    value={detailEditForm.tagId}
                    disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                    onChange={(event) => updateDetailEditFormField("tagId", event.target.value)}
                  >
                    <option value="">No tag</option>
                    {normalDetailTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {showLocationColumn ? (
                <div className="form-row">
                  <label htmlFor="detailAddLocation">Location</label>
                  <select
                    id="detailAddLocation"
                    value={detailEditForm.locationId}
                    disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                    onChange={(event) =>
                      updateDetailEditFormField("locationId", event.target.value)
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
                <div className="form-row full">
                  <span className="form-label">Companies</span>
                  <div className="checkbox-stack">
                    {companies.length === 0 ? (
                      <span className="item-meta">No companies available.</span>
                    ) : (
                      companies.map((company) => (
                        <label className="checkbox-row" key={company.id}>
                          <input
                            type="checkbox"
                            checked={(detailEditForm.companyIds || []).includes(company.id)}
                            disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                            onChange={() => toggleDetailEditCompany(company.id)}
                          />
                          <span>{company.companyName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <div className="form-row full">
                <label htmlFor="detailAddNotes">Notes</label>
                <textarea
                  id="detailAddNotes"
                  value={detailEditForm.notes}
                  disabled={isWriteDisabled || savingDraftDayId === addingDetailDayId}
                  rows={4}
                  onChange={(event) => updateDetailEditFormField("notes", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={
                  isWriteDisabled ||
                  savingDraftDayId === addingDetailDayId ||
                  !detailEditForm.description.trim()
                }
              >
                {savingDraftDayId === addingDetailDayId ? "Adding..." : "Add row"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDraftDayId === addingDetailDayId}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {addingTruckDetailTruck ? (
        <Modal
          title="Add truck row"
          subtitle={addingTruckDetailTruck.truckNumber || "Truck"}
          labelledBy="addTruckRowTitle"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveMobileAddTruckDetailForm}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="truckDetailAddDate">Date</label>
                <select
                  id="truckDetailAddDate"
                  value={detailEditForm.scheduleDayId || ""}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  onChange={(event) =>
                    updateDetailEditFormField("scheduleDayId", event.target.value)
                  }
                  required
                >
                  <option value="">Choose date</option>
                  {scheduleDays.map((day) => (
                    <option key={day.id} value={day.id}>
                      {[formatDetailDate(day.date), day.summary].filter(Boolean).join(" - ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="truckDetailAddTime">Time</label>
                <input
                  id="truckDetailAddTime"
                  type="time"
                  autoFocus
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="truckDetailAddAction">Action</label>
                <select
                  id="truckDetailAddAction"
                  value={detailEditForm.action}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  onChange={(event) => updateDetailEditFormField("action", event.target.value)}
                >
                  {truckDetailActions.map((action) => (
                    <option key={action || "none"} value={action}>
                      {action || "Action"}
                    </option>
                  ))}
                </select>
              </div>
              {showTruckDestinationColumn ? (
                <div className="form-row">
                  <label htmlFor="truckDetailAddDestination">Destination</label>
                  <select
                    id="truckDetailAddDestination"
                    value={detailEditForm.destinationValue}
                    disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                    onChange={(event) =>
                      updateDetailEditFormField("destinationValue", event.target.value)
                    }
                  >
                    <option value="">No destination</option>
                    {companies.length > 0 ? (
                      <optgroup label="Companies">
                        {companies.map((company) => (
                          <option key={company.id} value={`company:${company.id}`}>
                            {company.companyName}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                    {locationOptions.length > 0 ? (
                      <optgroup label="Locations">
                        {locationOptions.map((location) => (
                          <option key={location.id} value={`location:${location.id}`}>
                            {location.displayName}
                          </option>
                        ))}
                      </optgroup>
                    ) : null}
                  </select>
                </div>
              ) : null}
              <div className="form-row full">
                <label htmlFor="truckDetailAddNotes">Notes</label>
                <textarea
                  id="truckDetailAddNotes"
                  value={detailEditForm.notes}
                  disabled={isWriteDisabled || savingDraftDayId === addingTruckDetailTruck.id}
                  rows={4}
                  onChange={(event) => updateDetailEditFormField("notes", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={
                  isWriteDisabled ||
                  savingDraftDayId === addingTruckDetailTruck.id ||
                  !detailEditForm.scheduleDayId
                }
              >
                {savingDraftDayId === addingTruckDetailTruck.id ? "Adding..." : "Add row"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDraftDayId === addingTruckDetailTruck.id}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingDetail ? (
        <Modal
          title="Edit row"
          subtitle={editingDetailDay ? formatDetailDate(editingDetailDay.date) : ""}
          labelledBy="editScheduleRowTitle"
          closeLabel="Close edit row form"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveDetailEditForm}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="detailEditTime">Time</label>
                <input
                  id="detailEditTime"
                  type="time"
                  autoFocus
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </div>
              {!editingDetail.truckId ? (
                <div className="form-row full">
                  <label htmlFor="detailEditDescription">Description</label>
                  <input
                    id="detailEditDescription"
                    value={detailEditForm.description}
                    disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                    onChange={(event) =>
                      updateDetailEditFormField("description", event.target.value)
                    }
                  />
                </div>
              ) : null}
              {editingDetail.truckId ? (
                <>
                  <div className="form-row">
                    <label htmlFor="detailEditAction">Action</label>
                    <select
                      id="detailEditAction"
                      value={detailEditForm.action}
                      disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                      onChange={(event) =>
                        updateDetailEditFormField("action", event.target.value)
                      }
                    >
                      {truckDetailActions.map((action) => (
                        <option key={action || "none"} value={action}>
                          {action || "Action"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <label htmlFor="detailEditDestination">Destination</label>
                    <select
                      id="detailEditDestination"
                      value={detailEditForm.destinationValue}
                      disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                      onChange={(event) =>
                        updateDetailEditFormField("destinationValue", event.target.value)
                      }
                    >
                      <option value="">No destination</option>
                      {companies.length > 0 ? (
                        <optgroup label="Companies">
                          {companies.map((company) => (
                            <option key={company.id} value={`company:${company.id}`}>
                              {company.companyName}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                      {locationOptions.length > 0 ? (
                        <optgroup label="Locations">
                          {locationOptions.map((location) => (
                            <option key={location.id} value={`location:${location.id}`}>
                              {location.displayName}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                  </div>
                </>
              ) : null}
              {!editingDetail.truckId && showTagColumn ? (
                <div className="form-row">
                  <label htmlFor="detailEditTag">Tag</label>
                  <select
                    id="detailEditTag"
                    value={detailEditForm.tagId}
                    disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                    onChange={(event) => updateDetailEditFormField("tagId", event.target.value)}
                  >
                    <option value="">No tag</option>
                    {normalDetailTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {!editingDetail.truckId && showLocationColumn ? (
                <div className="form-row">
                  <label htmlFor="detailEditLocation">Location</label>
                  <select
                    id="detailEditLocation"
                    value={detailEditForm.locationId}
                    disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                    onChange={(event) =>
                      updateDetailEditFormField("locationId", event.target.value)
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
              {!editingDetail.truckId && showCompanyColumn ? (
                <div className="form-row full">
                  <span className="form-label">Companies</span>
                  <div className="checkbox-stack">
                    {companies.length === 0 ? (
                      <span className="item-meta">No companies available.</span>
                    ) : (
                      companies.map((company) => (
                        <label className="checkbox-row" key={company.id}>
                          <input
                            type="checkbox"
                            checked={(detailEditForm.companyIds || []).includes(company.id)}
                            disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                            onChange={() => toggleDetailEditCompany(company.id)}
                          />
                          <span>{company.companyName}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
              <div className="form-row full">
                <label htmlFor="detailEditNotes">Notes</label>
                <textarea
                  id="detailEditNotes"
                  value={detailEditForm.notes}
                  disabled={isWriteDisabled || savingDetailId === editingDetail.id}
                  rows={4}
                  onChange={(event) => updateDetailEditFormField("notes", event.target.value)}
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={isWriteDisabled || savingDetailId === editingDetail.id}
              >
                {savingDetailId === editingDetail.id ? "Saving..." : "Save"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDetailId === editingDetail.id}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {editingDetailTime ? (
        <Modal
          title="Edit time"
          subtitle={editingDetailTimeDay ? formatDetailDate(editingDetailTimeDay.date) : ""}
          labelledBy="editScheduleTimeTitle"
          closeLabel="Close edit time form"
          onClose={cancelEditingDetail}
        >
          <form className="admin-inline-form" onSubmit={saveDetailTimeForm}>
            <div className="mobile-time-picker">
              <p className="mobile-time-picker-label">Start time</p>
              <label className="desktop-time-input-row" htmlFor="detailTimeKeyboardInput">
                <span>Type time</span>
                <input
                  id="detailTimeKeyboardInput"
                  type="time"
                  value={detailEditForm.time}
                  disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
                  onChange={(event) => updateDetailEditFormField("time", event.target.value)}
                />
              </label>
              <div className="mobile-time-picker-controls">
                <div className="mobile-time-picker-column" aria-label="Hour">
                  <span>Hour</span>
                  <div className="mobile-time-wheel" role="listbox" aria-label="Hour">
                    {timePickerHours.map((hour) => (
                      <button
                        className={
                          ((detailEditForm.time || "00:00").split(":")[0] || "00") === hour
                            ? "mobile-time-wheel-option active"
                            : "mobile-time-wheel-option"
                        }
                        key={hour}
                        type="button"
                        disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
                        onClick={() => updateDetailEditTimePart("hour", hour)}
                        onKeyDown={(event) => handleDetailTimeWheelKeyDown("hour", event)}
                      >
                        {hour}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="mobile-time-picker-separator">:</span>
                <div className="mobile-time-picker-column" aria-label="Minute">
                  <span>Minute</span>
                  <div className="mobile-time-wheel" role="listbox" aria-label="Minute">
                    {timePickerMinutes.map((minute) => (
                      <button
                        className={
                          ((detailEditForm.time || "00:00").split(":")[1] || "00") === minute
                            ? "mobile-time-wheel-option active"
                            : "mobile-time-wheel-option"
                        }
                        key={minute}
                        type="button"
                        disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
                        onClick={() => updateDetailEditTimePart("minute", minute)}
                        onKeyDown={(event) => handleDetailTimeWheelKeyDown("minute", event)}
                      >
                        {minute}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={isWriteDisabled || savingDetailId === editingDetailTime.id}
              >
                {savingDetailId === editingDetailTime.id ? "Saving..." : "Save"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingDetailId === editingDetailTime.id}
                onClick={cancelEditingDetail}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {activeTab === "trucks" ? (
      <TruckingPanel
        truckFormMode={truckFormMode}
        isOffline={isWriteDisabled}
        startAddingTruck={startAddingTruck}
        saveTruck={saveTruck}
        truckForm={truckForm}
        truckSizes={truckSizes}
        updateTruckFormField={updateTruckFormField}
        companies={companies}
        savingTruck={savingTruck}
        editingTruckId={editingTruckId}
        resetTruckForm={resetTruckForm}
        trucksLoading={trucksLoading}
        trucks={trucks}
        getTruckDetails={getTruckDetails}
        draftTruckDetailsByTruckId={draftTruckDetailsByTruckId}
        truckSizeById={truckSizeById}
        companyById={companyById}
        scheduleDays={scheduleDays}
        addDraftTruckDetail={addDraftTruckDetail}
        startEditingTruck={startEditingTruck}
        deletingTruckId={deletingTruckId}
        removeTruck={removeTruck}
        getTruckDetailRowStyle={getTruckDetailRowStyle}
        getRowTagStyle={getRowTagStyle}
        getTagById={getTagById}
        draggedDetailIdRef={draggedDetailIdRef}
        persistTruckDetailOrder={persistTruckDetailOrder}
        isEditingDetailCell={isEditingDetailCell}
        savingDetailId={savingDetailId}
        assignTruckDetailDate={assignTruckDetailDate}
        formatDetailDate={formatDetailDate}
        detailCellInputRef={detailCellInputRef}
        suppressDetailBlurRef={suppressDetailBlurRef}
        saveDetailCell={saveDetailCell}
        updateDetailField={updateDetailField}
        handleDetailCellKeyDown={handleDetailCellKeyDown}
        startEditingDetailCell={startEditingDetailCell}
        startEditingDetailTime={startEditingDetailTime}
        startEditingDetail={startEditingDetail}
        toggleTruckDetailAction={toggleTruckDetailAction}
        showTruckDestinationColumn={showTruckDestinationColumn}
        getTruckDestinationValue={getTruckDestinationValue}
        assignTruckDetailDestination={assignTruckDetailDestination}
        locationOptions={locationOptions}
        openNotesDetailId={openNotesDetailId}
        closeNotesEditor={closeNotesEditor}
        openNotesEditor={openNotesEditor}
        notesDraft={notesDraft}
        setNotesDraft={setNotesDraft}
        saveDetailNotes={saveDetailNotes}
        openActionMenuId={openActionMenuId}
        setOpenActionMenuId={setOpenActionMenuId}
        beginRowAction={beginRowAction}
        endRowAction={endRowAction}
        reorderingDayId={reorderingDayId}
        moveTruckDetail={moveTruckDetail}
        duplicateTruckDetail={duplicateTruckDetail}
        closeActionMenu={closeActionMenu}
        deleteDetail={deleteDetail}
        updateDraftTruckDetail={updateDraftTruckDetail}
        getNextTruckDetailAction={getNextTruckDetailAction}
        updateDraftTruckDestination={updateDraftTruckDestination}
        removeDraftTruckDetail={removeDraftTruckDetail}
        savingDraftDayId={savingDraftDayId}
        saveDraftTruckDetail={saveDraftTruckDetail}
      />
      ) : null}

      {activeTab === "share" ? (
        <>
          <section className="panel share-panel">
            <div className="panel-heading">
              <div>
                <p className="item-meta">
                  Last updated {shareLastUpdatedText || "not yet"}
                </p>
              </div>
              <div className="share-actions">
                {canUpdateShareOutput ? (
                  <button
                    className="button secondary icon-text-button"
                    type="button"
                    disabled={
                      isWriteDisabled ||
                      updatingShareOutput ||
                      filteredViewsLoading ||
                      detailsLoading ||
                      tagsLoading ||
                      locationsLoading ||
                      trucksLoading ||
                      companiesLoading
                    }
                    onClick={updateShareOutput}
                  >
                    <CapcomIcon name="refresh" size={18} weight="bold" />
                    {updatingShareOutput ? "Updating..." : "Update"}
                  </button>
                ) : null}
                {shareProtectedHomeUrl ? (
                  <a
                    className="button secondary icon-text-button"
                    href={shareProtectedHomeUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <CapcomIcon name="lock" size={16} weight="bold" />
                    Open Homepage
                    <CapcomIcon name="externalLink" size={16} weight="bold" />
                  </a>
                ) : null}
                {shareHtmlUrl ? (
                  <a
                    className="button secondary icon-text-button"
                    href={shareHtmlUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <CapcomIcon name="bookOpen" size={18} weight="bold" />
                    Open Homepage
                    <CapcomIcon name="externalLink" size={16} weight="bold" />
                  </a>
                ) : null}
              </div>
            </div>

            <div className="share-section share-home-section">
              <h3>Show on home page</h3>
              <div className="share-home-options">
                <label className="switch-row">
                  <input
                    checked={form.showMomContacts}
                    disabled={isWriteDisabled || updatingShareOutput}
                    role="switch"
                    type="checkbox"
                    onChange={(event) => updateShowMomContacts(event.target.checked)}
                  />
                  <span className="switch-control" aria-hidden="true" />
                  <span>Contacts</span>
                </label>
                <label className="switch-row">
                  <input
                    checked={form.showMomKeyInfo}
                    disabled={isWriteDisabled || updatingShareOutput}
                    role="switch"
                    type="checkbox"
                    onChange={(event) => updateShowMomKeyInfo(event.target.checked)}
                  />
                  <span className="switch-control" aria-hidden="true" />
                  <span>Key info</span>
                </label>
              </div>
            </div>

            {filteredViewFormMode ? (
              <Modal
                title={editingFilteredViewId ? "Edit filtered view" : "New filtered view"}
                subtitle="Share view"
                labelledBy="filteredViewFormTitle"
                onClose={resetFilteredViewForm}
              >
              <form className="tag-form" onSubmit={saveFilteredView}>
                <div className="form-grid">
                  <div className="form-row full">
                    <label htmlFor="filteredViewName">Filtered view name</label>
                    <input
                      id="filteredViewName"
                      value={filteredViewForm.name}
                      disabled={isOffline}
                      onChange={(event) => updateFilteredViewFormField("name", event.target.value)}
                      placeholder="Example: Main floor / confirmed only"
                      required
                    />
                  </div>
                  <div className="form-row full">
                    <div className="filtered-view-filter-card">
                      <div className="filtered-view-card-heading">
                        <h3>Filters</h3>
                        <button
                          className="compact-button"
                          type="button"
                          disabled={isOffline}
                          onClick={clearFilteredViewFilters}
                        >
                          Clear Filters
                        </button>
                      </div>
                      <div className="filtered-view-filter-grid">
                        <div className="form-row">
                          <span className="form-chip-label">Tags</span>
                          <div className="multi-chip-list" role="group" aria-label="Tags">
                            {filteredViewTagOptions.map((tag) => {
                              const isSelected = filteredViewForm.filterTagIds.includes(tag.id);
                              return (
                                <button
                                  className={isSelected ? "multi-chip selected" : "multi-chip"}
                                  type="button"
                                  key={tag.id}
                                  disabled={isOffline}
                                  aria-pressed={isSelected}
                                  onClick={() => toggleFilteredViewMultiSelectField("filterTagIds", tag.id)}
                                >
                                  {tag.name}
                                </button>
                              );
                            })}
                          </div>
                          {filteredViewTagOptions.length === 0 ? <span className="item-meta">No tags available.</span> : null}
                        </div>
                        <div className="form-row">
                          <span className="form-chip-label">Companies</span>
                          <div className="multi-chip-list" role="group" aria-label="Companies">
                            {filteredViewCompanyOptions.map((company) => {
                              const isSelected = filteredViewForm.filterSupplierIds.includes(company.id);
                              return (
                                <button
                                  className={isSelected ? "multi-chip selected" : "multi-chip"}
                                  type="button"
                                  key={company.id}
                                  disabled={isOffline}
                                  aria-pressed={isSelected}
                                  onClick={() => toggleFilteredViewMultiSelectField("filterSupplierIds", company.id)}
                                >
                                  {company.companyName}
                                </button>
                              );
                            })}
                          </div>
                          {filteredViewCompanyOptions.length === 0 ? (
                            <span className="item-meta">No companies available for this event.</span>
                          ) : null}
                        </div>
                        <div className="form-row full">
                          <span className="form-chip-label">Locations</span>
                          <div className="location-chip-tree" role="group" aria-label="Locations">
                            {locationTree.map((location) => {
                              const isSelected = filteredViewForm.filterLocationIds.includes(location.id);
                              return (
                                <div className="location-chip-group" key={location.id}>
                                  <button
                                    className={isSelected ? "multi-chip selected" : "multi-chip"}
                                    type="button"
                                    disabled={isOffline}
                                    aria-pressed={isSelected}
                                    onClick={() => toggleFilteredViewMultiSelectField("filterLocationIds", location.id)}
                                  >
                                    {location.name}
                                  </button>
                                  {location.children.length > 0 ? (
                                    <div className="location-sub-chip-list">
                                      {location.children.map((subLocation) => {
                                        const isSubLocationSelected = filteredViewForm.filterSubLocationIds.includes(subLocation.id);
                                        return (
                                          <button
                                            className={
                                              isSubLocationSelected
                                                ? "multi-chip sub-location selected"
                                                : "multi-chip sub-location"
                                            }
                                            type="button"
                                            key={subLocation.id}
                                            disabled={isOffline}
                                            aria-pressed={isSubLocationSelected}
                                            onClick={() => toggleFilteredViewMultiSelectField("filterSubLocationIds", subLocation.id)}
                                          >
                                            {subLocation.name}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                          {locationTree.length === 0 ? (
                            <span className="item-meta">No locations available.</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <label htmlFor="filteredViewGroupPresetId">Group preset</label>
                    <input
                      id="filteredViewGroupPresetId"
                      value={filteredViewForm.groupPresetId}
                      disabled={isOffline}
                      onChange={(event) => updateFilteredViewFormField("groupPresetId", event.target.value)}
                      placeholder="DY-1"
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="filteredViewFilterGroup">Filter group</label>
                    <input
                      id="filteredViewFilterGroup"
                      value={filteredViewForm.filterGroup}
                      disabled={isOffline}
                      onChange={(event) => updateFilteredViewFormField("filterGroup", event.target.value)}
                      placeholder="a-euY4.fxRfmBhTGPs7gO-A"
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="filteredViewGroup">Group</label>
                    <input
                      id="filteredViewGroup"
                      value={filteredViewForm.group}
                      disabled={isOffline}
                      onChange={(event) => updateFilteredViewFormField("group", event.target.value)}
                      placeholder="Full schedule"
                    />
                  </div>
                  <div className="form-row full">
                    <div className="filtered-view-display-card">
                      <h3>Display options</h3>
                      <div className="filtered-view-display-options">
                        <label className="switch-row">
                          <input
                            checked={filteredViewForm.filterBox}
                            disabled={isOffline}
                            role="switch"
                            type="checkbox"
                            onChange={(event) => updateFilteredViewFormField("filterBox", event.target.checked)}
                          />
                          <span className="switch-control" aria-hidden="true" />
                          <span>Filter box</span>
                        </label>
                        <label className="switch-row">
                          <input
                            checked={filteredViewForm.showKeyInfo}
                            disabled={isOffline}
                            role="switch"
                            type="checkbox"
                            onChange={(event) => updateFilteredViewFormField("showKeyInfo", event.target.checked)}
                          />
                          <span className="switch-control" aria-hidden="true" />
                          <span>Key info</span>
                        </label>
                        <label className="switch-row">
                          <input
                            checked={filteredViewForm.showLocations}
                            disabled={isOffline}
                            role="switch"
                            type="checkbox"
                            onChange={(event) => updateFilteredViewFormField("showLocations", event.target.checked)}
                          />
                          <span className="switch-control" aria-hidden="true" />
                          <span>Locations</span>
                        </label>
                        <label className="switch-row">
                          <input
                            checked={filteredViewForm.showContacts}
                            disabled={isOffline}
                            role="switch"
                            type="checkbox"
                            onChange={(event) => updateFilteredViewFormField("showContacts", event.target.checked)}
                          />
                          <span className="switch-control" aria-hidden="true" />
                          <span>Contacts</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="actions">
                  <button className="button" type="submit" disabled={savingFilteredView || isWriteDisabled}>
                    {savingFilteredView ? "Saving..." : editingFilteredViewId ? "Save filtered view" : "Create filtered view"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={savingFilteredView || isWriteDisabled}
                    onClick={resetFilteredViewForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              </Modal>
            ) : null}

            <div className="share-section">
              <div className="share-section-heading">
                <h3>Filtered views</h3>
                {canManageFilteredViews && !filteredViewFormMode ? (
                  <button
                    className="button secondary icon-text-button"
                    type="button"
                    disabled={isOffline}
                    onClick={startAddingFilteredView}
                  >
                    <CapcomIcon name="add" size={18} weight="bold" />
                    New filtered view
                  </button>
                ) : null}
              </div>

              {filteredViews.length === 0 ? (
                <p className="item-meta">No filtered views yet.</p>
              ) : (
                <div className="share-filtered-view-list">
                  {filteredViews.map((view) => {
                    const protectedSnapshotHtmlUrl = protectedSnapshotHtmlUrlByName.get(
                      getShareSnapshotNameKey(view.name)
                    );

                    return (
                      <article className="share-filtered-view-row" key={view.id}>
                        <h3>{view.name || "Unnamed filtered view"}</h3>
                        <div className="share-filtered-view-actions">
                          {protectedSnapshotHtmlUrl ? (
                            <a
                              className="compact-button"
                              href={protectedSnapshotHtmlUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <CapcomIcon name="externalLink" size={16} />
                              Open
                            </a>
                          ) : (
                            <button
                              className="compact-button"
                              type="button"
                              disabled
                              title="No protected HTML URL found for this view"
                            >
                              <CapcomIcon name="externalLink" size={16} />
                              Open
                            </button>
                          )}
                          {canManageFilteredViews ? (
                            <>
                              <button
                                className="compact-button"
                                type="button"
                                disabled={isOffline}
                                onClick={() => startEditingFilteredView(view)}
                              >
                                <CapcomIcon name="edit" size={16} />
                                Edit
                              </button>
                              <button
                                className="compact-button"
                                type="button"
                                disabled={deletingFilteredViewId === view.id || isWriteDisabled}
                                onClick={() => removeFilteredView(view.id)}
                              >
                                <CapcomIcon name="delete" size={16} />
                                {deletingFilteredViewId === view.id ? "Deleting..." : "Delete"}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="panel archive-panel">
            <div className="company-accordion-heading">
              <button
                className="company-accordion-trigger"
                type="button"
                aria-controls="shareArchiveBody"
                aria-expanded={isShareArchiveOpen}
                onClick={() => setIsShareArchiveOpen((current) => !current)}
              >
                <span className="accordion-indicator" aria-hidden="true">
                  <CapcomIcon
                    name={isShareArchiveOpen ? "caretDoubleDown" : "caretDoubleRight"}
                    size={14}
                    weight="bold"
                  />
                </span>
                <span>
                  <span className="company-accordion-title">Archive</span>
                  <span className="item-meta company-accordion-meta">
                    {shareArchiveLoading
                      ? "Loading..."
                      : `${shareArchive.length} entr${shareArchive.length === 1 ? "y" : "ies"}`}
                  </span>
                </span>
              </button>
            </div>

            {isShareArchiveOpen ? (
              <div className="company-accordion-body" id="shareArchiveBody">
                {shareArchive.length === 0 ? (
                  <p className="item-meta">No archive entries yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="schedule-days-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Changes</th>
                          <th aria-label="Change details"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {shareArchive.map((archiveRow) => (
                          <tr key={archiveRow.id}>
                            <td>{formatArchiveDate(archiveRow.timestamp || archiveRow.createdAt)}</td>
                            <td>{archiveRow.numberOfChanges ?? 0}</td>
                            <td>
                              <ArchiveChangeText text={archiveRow.text} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {activeTab === "settings" ? (
      <SettingsPanel
        activeSettingsTab={activeSettingsTab}
        setActiveSettingsTab={setActiveSettingsTab}
        isOffline={isWriteDisabled}
        tagFormMode={tagFormMode}
        tagForm={tagForm}
        tags={tags}
        tagsLoading={tagsLoading}
        editingTagId={editingTagId}
        savingTag={savingTag}
        deletingTagId={deletingTagId}
        defaultTagColour={emptyTagForm.colour}
        locations={locations}
        locationTree={locationTree}
        locationFormMode={locationFormMode}
        locationForm={locationForm}
        locationsLoading={locationsLoading}
        editingLocationId={editingLocationId}
        savingLocation={savingLocation}
        deletingLocationId={deletingLocationId}
        movingLocationId={movingLocationId}
        locationDropTargetId={locationDropTargetId}
        truckSizes={truckSizes}
        truckSizesLoading={truckSizesLoading}
        truckSizeFormMode={truckSizeFormMode}
        truckSizeForm={truckSizeForm}
        editingTruckSizeId={editingTruckSizeId}
        savingTruckSize={savingTruckSize}
        deletingTruckSizeId={deletingTruckSizeId}
        draggedLocationIdRef={draggedLocationIdRef}
        normaliseHexColour={normaliseHexColour}
        getTagStyle={getTagStyle}
        startAddingTag={startAddingTag}
        startEditingTag={startEditingTag}
        updateTagFormField={updateTagFormField}
        saveTag={saveTag}
        resetTagForm={resetTagForm}
        removeTag={removeTag}
        startAddingLocation={startAddingLocation}
        startAddingSubLocation={startAddingSubLocation}
        startEditingLocation={startEditingLocation}
        updateLocationFormField={updateLocationFormField}
        saveLocation={saveLocation}
        resetLocationForm={resetLocationForm}
        removeLocation={removeLocation}
        moveLocation={moveLocation}
        setLocationDropTargetId={setLocationDropTargetId}
        startAddingTruckSize={startAddingTruckSize}
        startEditingTruckSize={startEditingTruckSize}
        updateTruckSizeFormField={updateTruckSizeFormField}
        saveTruckSize={saveTruckSize}
        resetTruckSizeForm={resetTruckSizeForm}
        removeTruckSize={removeTruckSize}
      />
      ) : null}

      {editingDayMode === "overlay" ? (
        <Modal
          title="Edit day"
          subtitle={formatDetailDate(scheduleDays.find((day) => day.id === editingDayId)?.date)}
          labelledBy="editDayTitle"
          closeLabel="Close edit day form"
          onClose={cancelEditingDay}
        >
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
              disabled={savingDayId === editingDayId || isWriteDisabled}
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
              disabled={savingDayId === editingDayId || isWriteDisabled}
              onClick={cancelEditingDay}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </main>
  );
}
