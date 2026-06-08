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
  getNoRowsMessage,
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
    getNoRowsMessage,
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

  return (
    <>
      {scheduleDays.length === 0 ? (
        <p className="item-meta">No schedule days yet.</p>
      ) : (
        <section className="list">
          {scheduleDays.map((day) => {
            const allDayDetails = detailsByDayId[day.id] || [];
            const dayDetails = filterDetailRows(allDayDetails, detailFilters);
            const draftDetails = draftDetailsByDayId[day.id] || [];

            return (
              <DetailDayCard
                key={day.id}
                day={day}
                dayDetails={dayDetails}
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
            );
          })}
        </section>
      )}

    </>
  );
}
