import { CapcomIcon } from "../../icons/capcomIcons.jsx";

function DraftDetailRow({
  dayId,
  draft,
  draftIndex,
  isOffline,
  getDetailRowStyle,
  showTagColumn,
  getTagStyle,
  getTagById,
  normaliseHexColour,
  tags,
  showLocationColumn,
  getLocationById,
  locationOptions,
  showCompanyColumn,
  getCompanyLabel,
  companies,
  toggleCompanyIds,
  updateDraftDetail,
  removeDraftDetail,
  savingDraftDayId,
  saveDraftDetail,
}) {
  return (
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
        onChange={(event) => updateDraftDetail(dayId, draftIndex, "time", event.target.value)}
      />
      <input
        aria-label="New detail description"
        value={draft.description}
        disabled={isOffline}
        onChange={(event) =>
          updateDraftDetail(dayId, draftIndex, "description", event.target.value)
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
                normaliseHexColour(getTagById(draft.tagId)?.colour) || "transparent",
            }}
          />
          <select
            aria-label="New detail tag"
            value={getTagById(draft.tagId) ? draft.tagId : ""}
            disabled={isOffline}
            onChange={(event) => updateDraftDetail(dayId, draftIndex, "tagId", event.target.value)}
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
              updateDraftDetail(dayId, draftIndex, "locationId", event.target.value)
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
                      dayId,
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
          onClick={() => removeDraftDetail(dayId, draftIndex)}
        >
          Cancel
        </button>
        <button
          className="button"
          type="button"
          disabled={savingDraftDayId === dayId || !draft.description.trim() || isOffline}
          onClick={() => saveDraftDetail(dayId, draftIndex, draft)}
        >
          {savingDraftDayId === dayId ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}

function DetailRowActions({
  day,
  detail,
  isOffline,
  savingDetailId,
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
  canMoveUp,
  canMoveDown,
  reorderingDayId,
  previousDay,
  nextDay,
  moveDetail,
  moveDetailToDay,
  duplicateDetail,
  closeActionMenu,
  deleteDetail,
}) {
  return (
    <div className="detail-row-actions">
      <div
        className="notes-popover"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            closeNotesEditor();
          }
        }}
      >
        <button
          className={[
            "notes-button",
            openNotesDetailId === detail.id ? "active" : "",
            detail.notes ? "has-notes" : "",
          ].filter(Boolean).join(" ")}
          type="button"
          aria-label={`Notes for ${detail.description || "schedule detail"}`}
          aria-expanded={openNotesDetailId === detail.id}
          disabled={isOffline}
          onClick={() => openNotesEditor(detail)}
        >
          <CapcomIcon
            name="notes"
            size={18}
            weight={detail.notes?.trim() ? "fill" : "regular"}
          />
        </button>
        {openNotesDetailId === detail.id ? (
          <div className="notes-popover-panel">
            <label htmlFor={`notes-${detail.id}`}>Notes</label>
            <textarea
              id={`notes-${detail.id}`}
              value={notesDraft}
              disabled={savingDetailId === detail.id || isOffline}
              onChange={(event) => setNotesDraft(event.target.value)}
              rows={5}
            />
            <div className="notes-popover-actions">
              <button
                className="compact-button primary"
                type="button"
                disabled={savingDetailId === detail.id || isOffline}
                onClick={() => saveDetailNotes(detail)}
              >
                {savingDetailId === detail.id ? "Saving..." : "Save"}
              </button>
              <button
                className="compact-button"
                type="button"
                disabled={savingDetailId === detail.id}
                onClick={closeNotesEditor}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
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
            setOpenActionMenuId((current) => (current === detail.id ? "" : detail.id));
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
              disabled={savingDetailId === detail.id || isOffline || Boolean(detail.truckId)}
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
  );
}

function DetailRow({
  day,
  detail,
  detailIndex,
  dayDetails,
  isOffline,
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
}) {
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
        <div className="location-select-wrap">
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

function DetailDayCard({
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
  return (
    <>
      {scheduleDays.length === 0 ? (
        <p className="item-meta">No schedule days yet.</p>
      ) : (
        <section className="list">
          {scheduleDays.map((day) => {
            const allDayDetails = detailsByDayId[day.id] || [];
            const dayDetails = allDayDetails.filter((detail) => {
              const matchesTag = !selectedTagFilterId || detail.tagId === selectedTagFilterId;
              const detailLocation = detail.locationId
                ? locationById.get(detail.locationId)
                : null;
              const detailTopLocationId =
                detailLocation?.parentLocationId || detailLocation?.id || "";
              const matchesLocation =
                selectedLocationFilterIds.length === 0 ||
                selectedLocationFilterIds.includes(detailTopLocationId);
              const matchesSubLocation =
                selectedSubLocationFilterIds.length === 0 ||
                selectedSubLocationFilterIds.includes(detail.locationId);
              const matchesCompany =
                selectedCompanyFilterIds.length === 0 ||
                selectedCompanyFilterIds.some((companyId) =>
                  (detail.companyIds || []).includes(companyId)
                );
              return matchesTag && matchesLocation && matchesSubLocation && matchesCompany;
            });
            const draftDetails = draftDetailsByDayId[day.id] || [];

            return (
              <DetailDayCard
                key={day.id}
                day={day}
                dayDetails={dayDetails}
                draftDetails={draftDetails}
                formatDetailDate={formatDetailDate}
                isOffline={isOffline}
                addDraftDetail={addDraftDetail}
                startEditingDay={startEditingDay}
                getNoRowsMessage={getNoRowsMessage}
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
                updateDraftDetail={updateDraftDetail}
                removeDraftDetail={removeDraftDetail}
                savingDraftDayId={savingDraftDayId}
                saveDraftDetail={saveDraftDetail}
              />
            );
          })}
        </section>
      )}

    </>
  );
}
