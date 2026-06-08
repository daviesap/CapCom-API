import { useEffect, useMemo } from "react";
import useLoadingToast from "../../hooks/useLoadingToast.js";
import { useToast } from "../../components/ToastProvider.jsx";
import { getSectionLoadingMessage } from "../../utils/loadingMessages.js";

export default function EventEditorStatusMessages({
  error,
  warning,
  isOffline,
  isSuperAdmin,
  clientId,
  activeTab,
  activeInfoTab,
  detailsLoading,
  tagsLoading,
  locationsLoading,
  trucksLoading,
  companiesLoading,
  contactCompaniesLoading,
  truckSizesLoading,
  filteredViewsLoading,
  shareArchiveLoading,
}) {
  const { showToast } = useToast();

  const editorSectionLoadingMessage = useMemo(() => {
    const loadingSections = [];
    if (detailsLoading && (activeTab === "info" || activeTab === "detail")) {
      loadingSections.push(["schedule details", true]);
    }
    if (contactCompaniesLoading && activeTab === "info" && activeInfoTab === "contacts") {
      loadingSections.push(["contacts", true]);
    }
    if (tagsLoading && activeTab === "settings") {
      loadingSections.push(["tags", true]);
    }
    if (locationsLoading && activeTab === "settings") {
      loadingSections.push(["locations", true]);
    }
    if (truckSizesLoading && activeTab === "settings") {
      loadingSections.push(["truck sizes", true]);
    }
    if (trucksLoading && activeTab === "trucks") {
      loadingSections.push(["trucks", true]);
    }
    if (filteredViewsLoading && activeTab === "share") {
      loadingSections.push(["filtered views", true]);
    }
    if (shareArchiveLoading && activeTab === "share") {
      loadingSections.push(["archive", true]);
    }
    if (
      companiesLoading &&
      (activeTab === "info" || activeTab === "detail" || activeTab === "trucks")
    ) {
      loadingSections.push(["companies", true]);
    }

    return getSectionLoadingMessage(loadingSections);
  }, [
    activeTab,
    activeInfoTab,
    contactCompaniesLoading,
    companiesLoading,
    detailsLoading,
    locationsLoading,
    truckSizesLoading,
    tagsLoading,
    filteredViewsLoading,
    shareArchiveLoading,
    trucksLoading,
  ]);

  useLoadingToast(
    Boolean(editorSectionLoadingMessage),
    editorSectionLoadingMessage || "Loading event data...",
    { variant: "loading" }
  );

  useEffect(() => {
    if (!error) return;
    showToast(error, { variant: "error" });
  }, [error, showToast]);

  useEffect(() => {
    if (!warning) return;
    showToast(warning, { variant: "info" });
  }, [warning, showToast]);

  useEffect(() => {
    if (isOffline) {
      showToast("Offline mode: previously loaded schedules are read-only.", { variant: "info" });
    }
  }, [isOffline, showToast]);

  useEffect(() => {
    if (!isSuperAdmin || clientId || isOffline) return;
    showToast(
      "This event does not have a clientId yet. Choose a client and save the event to finish the assignment.",
      { variant: "info" }
    );
  }, [isSuperAdmin, clientId, isOffline, showToast]);

  return null;
}
