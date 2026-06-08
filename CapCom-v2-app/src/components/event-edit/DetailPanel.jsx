import DetailDayCard from "./DetailDayCard.jsx";
import { filterDetailRows } from "./detailFilters.js";

export default function DetailPanel({
  scheduleDays,
  detailsByDayId,
  selectedTagFilterId,
  locationById,
  selectedLocationFilterIds,
  selectedSubLocationFilterIds,
  selectedCompanyFilterIds,
  draftDetailsByDayId,
  formatDetailDate,
  isOffline,
  addDraftDetail,
  startEditingDay,
  isEditingDetailCell,
  canMoveDetail,
  getAdjacentDay,
  getDetailRowStyle,
  getRowTagStyle,
  getTagById,
  draggedDetailIdRef,
  reorderDetail,
  detailCellInputRef,
  suppressDetailBlurRef,
  saveDetailCell,
  updateDetailField,
  handleDetailCellKeyDown,
  startEditingDetailCell,
  showTagColumn,
  getTagStyle,
  normaliseHexColour,
  savingDetailId,
  assignDetailTag,
  tags,
  showLocationColumn,
  getLocationById,
  assignDetailLocation,
  locationOptions,
  showCompanyColumn,
  getCompanyLabel,
  companies,
  assignDetailCompanies,
  toggleCompanyIds,
  openNotesDetailId,
  closeNotesEditor,
  openNotesEditor,
  notesDraft,
  setNotesDraft,
  saveDetailNotes,
  openActionMenuId,
  setOpenActionMenuId,
  beginRowAction,
  endRowAction,
  reorderingDayId,
  moveDetail,
  moveDetailToDay,
  duplicateDetail,
  closeActionMenu,
  deleteDetail,
  updateDraftDetail,
  removeDraftDetail,
  savingDraftDayId,
  saveDraftDetail,
}) {
  const detailFilters = {
    selectedTagFilterId,
    locationById,
    selectedLocationFilterIds,
    selectedSubLocationFilterIds,
    selectedCompanyFilterIds,
  };
  const detailDisplay = {
    formatDetailDate,
    getDetailRowStyle,
    getRowTagStyle,
    getTagById,
    showTagColumn,
    getTagStyle,
    normaliseHexColour,
    tags,
    showLocationColumn,
    getLocationById,
    locationOptions,
    showCompanyColumn,
    getCompanyLabel,
    companies,
  };
  const dayActions = {
    isOffline,
    addDraftDetail,
    startEditingDay,
  };
  const rowEditing = {
    isEditingDetailCell,
    detailCellInputRef,
    suppressDetailBlurRef,
    saveDetailCell,
    updateDetailField,
    handleDetailCellKeyDown,
    startEditingDetailCell,
  };
  const rowOrdering = {
    canMoveDetail,
    getAdjacentDay,
    draggedDetailIdRef,
    reorderDetail,
    reorderingDayId,
    moveDetail,
    moveDetailToDay,
  };
  const rowAssignments = {
    savingDetailId,
    assignDetailTag,
    assignDetailLocation,
    assignDetailCompanies,
    toggleCompanyIds,
  };
  const rowNotes = {
    openNotesDetailId,
    closeNotesEditor,
    openNotesEditor,
    notesDraft,
    setNotesDraft,
    saveDetailNotes,
  };
  const rowActions = {
    openActionMenuId,
    setOpenActionMenuId,
    beginRowAction,
    endRowAction,
    duplicateDetail,
    closeActionMenu,
    deleteDetail,
  };
  const draftActions = {
    updateDraftDetail,
    removeDraftDetail,
    savingDraftDayId,
    saveDraftDetail,
  };
  const hasActiveDetailFilters =
    Boolean(selectedTagFilterId) ||
    selectedLocationFilterIds.length > 0 ||
    selectedSubLocationFilterIds.length > 0 ||
    selectedCompanyFilterIds.length > 0;
  const dayRows = scheduleDays.map((day) => {
    const allDayDetails = detailsByDayId[day.id] || [];
    const dayDetails = filterDetailRows(allDayDetails, detailFilters);
    const draftDetails = draftDetailsByDayId[day.id] || [];

    return {
      allDayDetails,
      day,
      dayDetails,
      draftDetails,
    };
  });
  const totalDetailCount = dayRows.reduce(
    (total, { allDayDetails }) => total + allDayDetails.length,
    0
  );
  const visibleDetailCount = dayRows.reduce(
    (total, { dayDetails }) => total + dayDetails.length,
    0
  );

  return (
    <>
      {scheduleDays.length === 0 ? (
        <p className="item-meta">No schedule days yet.</p>
      ) : (
        <section className="list">
          {hasActiveDetailFilters ? (
            <p className="detail-filter-summary">
              Showing {visibleDetailCount} of {totalDetailCount} schedule row
              {totalDetailCount === 1 ? "" : "s"}.
            </p>
          ) : null}
          {dayRows.map(({ allDayDetails, day, dayDetails, draftDetails }) => (
            <DetailDayCard
              key={day.id}
              day={day}
              dayDetails={dayDetails}
              allDayDetails={allDayDetails}
              allDayDetailCount={allDayDetails.length}
              draftDetails={draftDetails}
              detailDisplay={detailDisplay}
              dayActions={dayActions}
              rowEditing={rowEditing}
              rowOrdering={rowOrdering}
              rowAssignments={rowAssignments}
              rowNotes={rowNotes}
              rowActions={rowActions}
              draftActions={draftActions}
            />
          ))}
        </section>
      )}

    </>
  );
}
