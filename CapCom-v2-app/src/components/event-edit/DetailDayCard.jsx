import DetailRow from "./DetailRow.jsx";
import DraftDetailRow from "./DraftDetailRow.jsx";

export default function DetailDayCard({
  day,
  dayDetails,
  draftDetails,
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
  return (
    <article className="list-item">
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
            {dayDetails.map((detail, detailIndex) => (
              <DetailRow
                key={detail.id}
                day={day}
                detail={detail}
                detailIndex={detailIndex}
                dayDetails={dayDetails}
                isOffline={isOffline}
                isEditingDetailCell={isEditingDetailCell}
                canMoveDetail={canMoveDetail}
                getAdjacentDay={getAdjacentDay}
                getDetailRowStyle={getDetailRowStyle}
                getRowTagStyle={getRowTagStyle}
                getTagById={getTagById}
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
                tags={tags}
                showLocationColumn={showLocationColumn}
                getLocationById={getLocationById}
                assignDetailLocation={assignDetailLocation}
                locationOptions={locationOptions}
                showCompanyColumn={showCompanyColumn}
                getCompanyLabel={getCompanyLabel}
                companies={companies}
                assignDetailCompanies={assignDetailCompanies}
                toggleCompanyIds={toggleCompanyIds}
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
                closeActionMenu={closeActionMenu}
                deleteDetail={deleteDetail}
              />
            ))}
            {draftDetails.map((draft, draftIndex) => (
              <DraftDetailRow
                key={`draft-${draftIndex}`}
                dayId={day.id}
                draft={draft}
                draftIndex={draftIndex}
                isOffline={isOffline}
                getDetailRowStyle={getDetailRowStyle}
                showTagColumn={showTagColumn}
                getTagStyle={getTagStyle}
                getTagById={getTagById}
                normaliseHexColour={normaliseHexColour}
                tags={tags}
                showLocationColumn={showLocationColumn}
                getLocationById={getLocationById}
                locationOptions={locationOptions}
                showCompanyColumn={showCompanyColumn}
                getCompanyLabel={getCompanyLabel}
                companies={companies}
                toggleCompanyIds={toggleCompanyIds}
                updateDraftDetail={updateDraftDetail}
                removeDraftDetail={removeDraftDetail}
                savingDraftDayId={savingDraftDayId}
                saveDraftDetail={saveDraftDetail}
              />
            ))}
          </div>
        )}
        {day.endOfDayTarget ? (
          <p className="end-target">End of day target: {day.endOfDayTarget}</p>
        ) : null}
      </div>
    </article>
  );
}
