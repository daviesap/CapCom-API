import { CapcomIcon } from "../../icons/capcomIcons.jsx";
import useLoadingToast from "../../hooks/useLoadingToast.js";

export default function EventEditorStatusMessages({
  error,
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

  return (
    <>
      {error ? <p className="error">{error}</p> : null}
      {isOffline ? (
        <p className="message offline-message">Offline mode: previously loaded schedules are read-only.</p>
      ) : null}
      {isSuperAdmin && !clientId ? (
        <p className="message warning-message">
          <CapcomIcon name="warning" size={18} weight="bold" />
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
      {trucksLoading && activeTab === "trucks" ? (
        <p className="message">Loading trucks...</p>
      ) : null}
      {companiesLoading && (activeTab === "info" || activeTab === "detail" || activeTab === "trucks") ? (
        <p className="message">Loading companies...</p>
      ) : null}
    </>
  );
}
