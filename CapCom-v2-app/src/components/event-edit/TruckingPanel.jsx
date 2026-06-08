import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function TruckingPanel({
  truckFormMode,
  isOffline,
  startAddingTruck,
  saveTruck,
  truckForm,
  truckSizes,
  updateTruckFormField,
  companies,
  savingTruck,
  editingTruckId,
  resetTruckForm,
  trucksLoading,
  trucks,
  getTruckDetails,
  draftTruckDetailsByTruckId,
  truckSizeById,
  companyById,
  scheduleDays,
  addDraftTruckDetail,
  startEditingTruck,
  deletingTruckId,
  removeTruck,
  getTruckDetailRowStyle,
  getRowTagStyle,
  getTagById,
  draggedDetailIdRef,
  persistTruckDetailOrder,
  isEditingDetailCell,
  savingDetailId,
  assignTruckDetailDate,
  formatDetailDate,
  detailCellInputRef,
  suppressDetailBlurRef,
  saveDetailCell,
  updateDetailField,
  handleDetailCellKeyDown,
  startEditingDetailCell,
  toggleTruckDetailAction,
  showTruckDestinationColumn,
  getTruckDestinationValue,
  assignTruckDetailDestination,
  locationOptions,
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
  moveTruckDetail,
  duplicateTruckDetail,
  closeActionMenu,
  deleteDetail,
  updateDraftTruckDetail,
  getNextTruckDetailAction,
  updateDraftTruckDestination,
  removeDraftTruckDetail,
  savingDraftDayId,
  saveDraftTruckDetail,
}) {
  return (
    <section className="panel">
      <div className="settings-section">
        {!truckFormMode ? (
          <div className="panel-heading">
            <div />
            <button
              className="button"
              type="button"
              disabled={isOffline}
              onClick={startAddingTruck}
            >
              Add truck
            </button>
          </div>
        ) : null}

        {truckFormMode ? (
          <form className="truck-form" onSubmit={saveTruck}>
            <div className="form-grid">
              <div className="form-row">
                <label htmlFor="truckSizeId">Size</label>
                <select
                  id="truckSizeId"
                  value={truckForm.truckSizeId}
                  disabled={isOffline || truckSizes.length === 0}
                  onChange={(event) => updateTruckFormField("truckSizeId", event.target.value)}
                  required
                >
                  <option value="">Choose a size</option>
                  {truckSizes.map((truckSize) => (
                    <option key={truckSize.id} value={truckSize.id}>
                      {truckSize.size}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="truckNumber">Truck number</label>
                <input
                  id="truckNumber"
                  value={truckForm.truckNumber}
                  disabled={isOffline}
                  onChange={(event) => updateTruckFormField("truckNumber", event.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label htmlFor="truckCompanyId">Company</label>
                <select
                  id="truckCompanyId"
                  value={truckForm.companyId}
                  disabled={isOffline || companies.length === 0}
                  onChange={(event) => updateTruckFormField("companyId", event.target.value)}
                  required
                >
                  <option value="">Choose a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <label htmlFor="driverName">Driver name</label>
                <input
                  id="driverName"
                  value={truckForm.driverName}
                  disabled={isOffline}
                  onChange={(event) => updateTruckFormField("driverName", event.target.value)}
                />
              </div>
              <div className="form-row">
                <label htmlFor="driverContactNumber">Driver contact number</label>
                <input
                  id="driverContactNumber"
                  value={truckForm.driverContactNumber}
                  disabled={isOffline}
                  onChange={(event) => updateTruckFormField("driverContactNumber", event.target.value)}
                />
              </div>
              <div className="form-row full">
                <label htmlFor="truckContents">Truck contents</label>
                <textarea
                  id="truckContents"
                  value={truckForm.contents}
                  disabled={isOffline}
                  onChange={(event) => updateTruckFormField("contents", event.target.value)}
                  rows={3}
                />
              </div>
            </div>
            {truckSizes.length === 0 ? (
              <p className="item-meta">Add truck sizes in Settings before creating trucks.</p>
            ) : null}
            {companies.length === 0 ? (
              <p className="item-meta">Add companies for this client before creating trucks.</p>
            ) : null}
            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={savingTruck || isOffline || truckSizes.length === 0 || companies.length === 0}
              >
                {savingTruck ? "Saving..." : editingTruckId ? "Save truck" : "Create truck"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingTruck || isOffline}
                onClick={resetTruckForm}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {trucksLoading ? (
          <p className="item-meta">Loading trucks...</p>
        ) : trucks.length === 0 ? (
          <p className="item-meta">No trucks yet.</p>
        ) : (
          <section className="list">
            {trucks.map((truck) => {
              const truckDetails = getTruckDetails(truck);
              const draftTruckDetails = draftTruckDetailsByTruckId[truck.id] || [];
              const savedIncompleteCount = truckDetails.filter((detail) => {
                const hasDate = Boolean(detail.scheduleDayId);
                const hasDestination = !showTruckDestinationColumn || Boolean(
                  getTruckDestinationValue(detail)
                );
                const hasTime = Boolean(detail.time);

                return !(hasDate && hasDestination && hasTime);
              }).length;
              const draftIncompleteCount = draftTruckDetails.filter((draft) => {
                const hasDate = Boolean(draft.scheduleDayId);
                const hasDestination = !showTruckDestinationColumn || Boolean(
                  getTruckDestinationValue(draft)
                );
                const hasTime = Boolean(draft.time);

                return !(hasDate && hasDestination && hasTime);
              }).length;
              const incompleteTruckDetailCount = savedIncompleteCount + draftIncompleteCount;

              return (
                <article className="list-item" key={truck.id}>
                  <div className="day-card-content">
                    <div className="day-heading">
                      <div>
                        <p className="item-title day-title-line">
                          <span>{truck.truckNumber || "Truck"}</span>
                          {truck.truckSizeId || truck.size ? (
                            <span className="item-meta day-title-summary">
                              {truckSizeById.get(truck.truckSizeId)?.size ||
                                truck.size ||
                                "Unknown size"}
                            </span>
                          ) : null}
                          {truck.companyId || truck.companyName ? (
                            <span className="item-meta day-title-summary">
                              {companyById.get(truck.companyId)?.companyName ||
                                truck.companyName ||
                                "Unknown company"}
                            </span>
                          ) : null}
                          {incompleteTruckDetailCount > 0 ? (
                            <span className="day-row-count warning">
                              {incompleteTruckDetailCount} incomplete
                            </span>
                          ) : null}
                        </p>
                        {truck.driverName || truck.driverContactNumber || truck.contents ? (
                          <p className="item-meta">
                            {[truck.driverName, truck.driverContactNumber, truck.contents]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="day-card-actions">
                      <button
                        className="small-button"
                        type="button"
                        disabled={isOffline || scheduleDays.length === 0}
                        onClick={() => addDraftTruckDetail(truck.id)}
                      >
                        Add row
                      </button>
                      <button
                        className="compact-button"
                        type="button"
                        disabled={isOffline}
                        onClick={() => startEditingTruck(truck)}
                      >
                        Edit truck
                      </button>
                      <button
                        className="compact-button"
                        type="button"
                        disabled={deletingTruckId === truck.id || isOffline}
                        onClick={() => removeTruck(truck.id)}
                      >
                        {deletingTruckId === truck.id ? "Deleting..." : "Delete truck"}
                      </button>
                    </div>

                    {scheduleDays.length === 0 ? (
                      <p className="item-meta">Add schedule days before adding truck rows.</p>
                    ) : truckDetails.length === 0 && draftTruckDetails.length === 0 ? (
                      <p className="item-meta">No truck rows yet.</p>
                    ) : (
                      <div className="detail-list">
                        {truckDetails.map((detail, detailIndex) => {
                          const dayId = detail.scheduleDayId || "";
                          const isEditingTime = isEditingDetailCell(detail.id, "time");
                          const canMoveUp = detailIndex > 0;
                          const canMoveDown = detailIndex < truckDetails.length - 1;
                          const hasDate = Boolean(dayId);
                          const hasTime = Boolean(detail.time);
                          const hasDestination = Boolean(getTruckDestinationValue(detail));

                          return (
                            <div
                              className="detail-row draggable-row"
                              key={detail.id}
                              style={getTruckDetailRowStyle(
                                getRowTagStyle(getTagById(detail.tagId))
                              )}
                              draggable={!isEditingTime && !isOffline}
                              onDragStart={(event) => {
                                draggedDetailIdRef.current = detail.id;
                                event.dataTransfer.effectAllowed = "move";
                              }}
                              onDragOver={(event) => {
                                const draggedDetail = truckDetails.find(
                                  (nextDetail) => nextDetail.id === draggedDetailIdRef.current
                                );
                                if (draggedDetail && draggedDetail.id !== detail.id) {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = "move";
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const draggedDetailId = draggedDetailIdRef.current;
                                draggedDetailIdRef.current = "";
                                if (!draggedDetailId || draggedDetailId === detail.id) return;
                                const fromIndex = truckDetails.findIndex(
                                  (nextDetail) => nextDetail.id === draggedDetailId
                                );
                                const toIndex = truckDetails.findIndex(
                                  (nextDetail) => nextDetail.id === detail.id
                                );
                                if (fromIndex < 0 || toIndex < 0) return;
                                const nextDetails = [...truckDetails];
                                const [movedDetail] = nextDetails.splice(fromIndex, 1);
                                nextDetails.splice(toIndex, 0, movedDetail);
                                persistTruckDetailOrder(truck.id, nextDetails);
                              }}
                            onDragEnd={() => {
                              draggedDetailIdRef.current = "";
                            }}
                          >
                              <div
                                className={[
                                  "location-select-wrap",
                                  "detail-select-field",
                                  hasDate ? "" : "detail-select-field-missing",
                                ].filter(Boolean).join(" ")}
                              >
                                <select
                                  aria-label="Date for truck detail"
                                  value={dayId}
                                  disabled={savingDetailId === detail.id || isOffline}
                                  onChange={(event) =>
                                    assignTruckDetailDate(dayId, detail, event.target.value)
                                  }
                                >
                                  <option value="">Choose date</option>
                                  {scheduleDays.map((day) => (
                                    <option key={day.id} value={day.id}>
                                      {formatDetailDate(day.date)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {isEditingTime ? (
                                <input
                                  ref={detailCellInputRef}
                                  className="plain-input detail-time-input"
                                  aria-label="Time for truck detail"
                                  type="time"
                                  value={detail.time || ""}
                                  disabled={isOffline}
                                  onBlur={() => {
                                    if (suppressDetailBlurRef.current) return;
                                    saveDetailCell(dayId, detail);
                                  }}
                                  onChange={(event) =>
                                    updateDetailField(dayId, detail.id, "time", event.target.value)
                                  }
                                  onKeyDown={(event) =>
                                    handleDetailCellKeyDown(
                                      event,
                                      dayId,
                                      truckDetails,
                                      detail,
                                      detailIndex,
                                      "time"
                                    )
                                  }
                                />
                              ) : (
                                <button
                                  className={[
                                    "detail-cell",
                                    "detail-time-display",
                                    hasTime ? "" : "missing-time",
                                  ].filter(Boolean).join(" ")}
                                  type="button"
                                  disabled={isOffline}
                                  onClick={() => startEditingDetailCell(dayId, detail.id, "time")}
                                >
                                  {detail.time || "tbc"}
                                </button>
                              )}
                              <button
                                className="detail-cell"
                                type="button"
                                disabled={savingDetailId === detail.id || isOffline}
                                onClick={() => toggleTruckDetailAction(dayId, detail)}
                              >
                                {detail.action || ""}
                              </button>
                              {showTruckDestinationColumn ? (
                                <div
                                  className={[
                                    "location-select-wrap",
                                    "detail-select-field",
                                    hasDestination ? "" : "detail-select-field-missing",
                                  ].filter(Boolean).join(" ")}
                                >
                                  <select
                                    aria-label="Destination for truck detail"
                                    value={getTruckDestinationValue(detail)}
                                    disabled={savingDetailId === detail.id || isOffline}
                                    onChange={(event) =>
                                      assignTruckDetailDestination(dayId, detail, event.target.value)
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
                                    aria-label="Notes for truck detail"
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
                                        disabled={!canMoveUp || reorderingDayId === truck.id || isOffline}
                                        onClick={() => {
                                          moveTruckDetail(truck.id, truckDetails, detail.id, -1);
                                          endRowAction();
                                        }}
                                      >
                                        Move up
                                      </button>
                                      <button
                                        className="action-menu-item"
                                        type="button"
                                        disabled={!canMoveDown || reorderingDayId === truck.id || isOffline}
                                        onClick={() => {
                                          moveTruckDetail(truck.id, truckDetails, detail.id, 1);
                                          endRowAction();
                                        }}
                                      >
                                        Move down
                                      </button>
                                      <button
                                        className="action-menu-item"
                                        type="button"
                                        disabled={savingDetailId === detail.id || isOffline}
                                        onClick={() => {
                                          duplicateTruckDetail(truck, detail);
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
                                          deleteDetail(dayId, detail.id);
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
                        {draftTruckDetails.map((draft, draftIndex) => (
                          <div
                            className="detail-row draft-row"
                            key={`truck-draft-${draftIndex}`}
                            style={getTruckDetailRowStyle()}
                          >
                            <div
                              className={[
                                "location-select-wrap",
                                "detail-select-field",
                                draft.scheduleDayId ? "" : "detail-select-field-missing",
                              ].filter(Boolean).join(" ")}
                            >
                              <select
                                aria-label="New truck detail date"
                                value={draft.scheduleDayId}
                                disabled={isOffline}
                                onChange={(event) =>
                                  updateDraftTruckDetail(
                                    truck.id,
                                    draftIndex,
                                    "scheduleDayId",
                                    event.target.value
                                  )
                                }
                                required
                              >
                                <option value="">Choose date</option>
                                {scheduleDays.map((day) => (
                                  <option key={day.id} value={day.id}>
                                    {formatDetailDate(day.date)}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <input
                              className="plain-input"
                              aria-label="New truck detail time"
                              type="time"
                              value={draft.time}
                              disabled={isOffline}
                              onChange={(event) =>
                                updateDraftTruckDetail(truck.id, draftIndex, "time", event.target.value)
                              }
                            />
                            <button
                              className="detail-cell"
                              type="button"
                              disabled={isOffline}
                              onClick={() =>
                                updateDraftTruckDetail(
                                  truck.id,
                                  draftIndex,
                                  "action",
                                  getNextTruckDetailAction(draft.action)
                                )
                              }
                            >
                              {draft.action || ""}
                            </button>
                            {showTruckDestinationColumn ? (
                              <div
                                className={[
                                  "location-select-wrap",
                                  "detail-select-field",
                                  getTruckDestinationValue(draft) ? "" : "detail-select-field-missing",
                                ].filter(Boolean).join(" ")}
                              >
                                <select
                                  aria-label="New truck detail destination"
                                  value={getTruckDestinationValue(draft)}
                                  disabled={isOffline}
                                  onChange={(event) =>
                                    updateDraftTruckDestination(truck.id, draftIndex, event.target.value)
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
                            <div className="draft-actions">
                              <button
                                className="button secondary"
                                type="button"
                                disabled={isOffline}
                                onClick={() => removeDraftTruckDetail(truck.id, draftIndex)}
                              >
                                Cancel
                              </button>
                              <button
                                className="button"
                                type="button"
                                disabled={
                                  savingDraftDayId === truck.id ||
                                  !draft.scheduleDayId ||
                                  (showTruckDestinationColumn && !getTruckDestinationValue(draft)) ||
                                  isOffline
                                }
                                onClick={() => saveDraftTruckDetail(truck, draftIndex, draft)}
                              >
                                {savingDraftDayId === truck.id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </section>
  );
}
