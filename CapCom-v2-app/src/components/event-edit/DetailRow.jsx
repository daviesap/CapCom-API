import DetailRowActions from "./DetailRowActions.jsx";

export default function DetailRow({
  day,
  detail,
  detailIndex,
  dayDetails,
  isOffline,
  detailDisplay,
  rowEditing,
  rowOrdering,
  rowAssignments,
  rowNotes,
  rowActions,
}) {
  const {
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
  } = detailDisplay;
  const {
    isEditingDetailCell,
    detailCellInputRef,
    suppressDetailBlurRef,
    saveDetailCell,
    updateDetailField,
    handleDetailCellKeyDown,
    startEditingDetailCell,
  } = rowEditing;
  const {
    canMoveDetail,
    getAdjacentDay,
    draggedDetailIdRef,
    reorderDetail,
    reorderingDayId,
    moveDetail,
    moveDetailToDay,
  } = rowOrdering;
  const {
    savingDetailId,
    assignDetailTag,
    assignDetailLocation,
    assignDetailCompanies,
    toggleCompanyIds,
  } = rowAssignments;
  const {
    openNotesDetailId,
    closeNotesEditor,
    openNotesEditor,
    notesDraft,
    setNotesDraft,
    saveDetailNotes,
  } = rowNotes;
  const {
    openActionMenuId,
    setOpenActionMenuId,
    beginRowAction,
    endRowAction,
    duplicateDetail,
    closeActionMenu,
    deleteDetail,
  } = rowActions;
  const isEditingTime = isEditingDetailCell(detail.id, "time");
  const isEditingDescription = isEditingDetailCell(detail.id, "description");
  const canMoveUp = canMoveDetail(dayDetails, detailIndex, -1);
  const canMoveDown = canMoveDetail(dayDetails, detailIndex, 1);
  const previousDay = getAdjacentDay(day.id, -1);
  const nextDay = getAdjacentDay(day.id, 1);

  return (
    <div
      className="detail-row draggable-row"
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
            updateDetailField(day.id, detail.id, "description", event.target.value)
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
          className="detail-cell detail-description-cell"
          type="button"
          data-tooltip={detail.description || ""}
          disabled={isOffline}
          onClick={() => startEditingDetailCell(day.id, detail.id, "description")}
        >
          <span className="detail-description-text">{detail.description || ""}</span>
          {detail.notes?.trim() ? <span className="detail-notes-badge">Notes</span> : null}
        </button>
      )}
      {showTagColumn ? (
        <div
          className="tag-select-wrap detail-select-field"
          style={getTagStyle(getTagById(detail.tagId))}
        >
          <span
            className="tag-dot"
            style={{
              backgroundColor:
                normaliseHexColour(getTagById(detail.tagId)?.colour) || "transparent",
            }}
          />
          <select
            aria-label={`Tag for ${detail.description || "schedule detail"}`}
            value={getTagById(detail.tagId) ? detail.tagId : ""}
            disabled={savingDetailId === detail.id || isOffline || Boolean(detail.truckId)}
            onChange={(event) => assignDetailTag(day.id, detail, event.target.value)}
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
        <div className="location-select-wrap detail-select-field">
          <select
            aria-label={`Location for ${detail.description || "schedule detail"}`}
            value={getLocationById(detail.locationId) ? detail.locationId : ""}
            disabled={savingDetailId === detail.id || isOffline}
            onChange={(event) => assignDetailLocation(day.id, detail, event.target.value)}
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
        <details className="company-dropdown detail-select-field">
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
      <DetailRowActions
        day={day}
        detail={detail}
        isOffline={isOffline}
        savingDetailId={savingDetailId}
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
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        reorderingDayId={reorderingDayId}
        previousDay={previousDay}
        nextDay={nextDay}
        moveDetail={moveDetail}
        moveDetailToDay={moveDetailToDay}
        duplicateDetail={duplicateDetail}
        closeActionMenu={closeActionMenu}
        deleteDetail={deleteDetail}
      />
    </div>
  );
}
