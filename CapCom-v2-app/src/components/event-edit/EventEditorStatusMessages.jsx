import { useEffect } from "react";
import useLoadingToast from "../../hooks/useLoadingToast.js";
import { useToast } from "../../components/ToastProvider.jsx";

export default function EventEditorStatusMessages({
  error,
  warning,
  isOffline,
  isSuperAdmin,
  clientId,
  activeTab,
  detailsLoading,
  tagsLoading,
  locationsLoading,
  trucksLoading,
  companiesLoading,
}) {
  const { showToast } = useToast();

  useLoadingToast(
    detailsLoading && (activeTab === "info" || activeTab === "detail"),
    "Loading schedule details..."
  );
  useLoadingToast(tagsLoading && activeTab === "settings", "Loading tags...");
  useLoadingToast(locationsLoading && activeTab === "settings", "Loading locations...");
  useLoadingToast(trucksLoading && activeTab === "trucks", "Loading trucks...");
  useLoadingToast(
    companiesLoading && (activeTab === "info" || activeTab === "detail" || activeTab === "trucks"),
    "Loading companies..."
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
