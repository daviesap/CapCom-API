import { useState } from "react";
import Modal from "../Modal.jsx";
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
  startEditingDetailTime,
  startEditingDetail,
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
  const [activeTruckDateSelectId, setActiveTruckDateSelectId] = useState("");
  const handleDraftTruckDetailKeyDown = (event, truck, draft, draftIndex) => {
    if (event.key === "Escape") {
      event.preventDefault();
      removeDraftTruckDetail(truck.id, draftIndex);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (
        savingDraftDayId === truck.id ||
        !draft.scheduleDayId ||
        isOffline
      ) {
        return;
      }

      saveDraftTruckDetail(truck, draftIndex, draft);
    }
  };

  const formatTruckDetailDateOption = (day, selectId) =>
    activeTruckDateSelectId === selectId
      ? [formatDetailDate(day.date), day.summary].filter(Boolean).join(" - ")
      : formatDetailDate(day.date);

  const renderTruckActionLabel = (action) => {
    const actionIconName =
      action === "Deliver"
        ? "arrowBendDownRight"
        : action === "Load"
          ? "arrowBendUpRight"
          : "question";

    const actionLabel = action || "Action";

    return (
      <>
        <CapcomIcon name={actionIconName} size={18} weight="bold" />
        <span className="truck-action-label-text">{actionLabel}</span>
      </>
    );
  };

  const getTruckDestinationLabel = (detail) => {
    const destinationValue = String(getTruckDestinationValue(detail) || "");
    if (destinationValue.startsWith("company:")) {
      return companyById.get(destinationValue.replace("company:", ""))?.companyName || "No destination";
    }
    if (destinationValue.startsWith("location:")) {
      return (
        locationOptions.find((location) => location.id === destinationValue.replace("location:", ""))
          ?.displayName || "No destination"
      );
    }
    return "No destination";
  };

  return (
    <section className="panel">
      <div className="settings-section">
        {!truckFormMode && !isOffline ? (
          <div className="panel-heading">
            <div />
            <button
              className="button"
              type="button"
              disabled={isOffline}
              onClick={startAddingTruck}
            >
              <CapcomIcon name="add" size={18} weight="bold" />
              Add truck
            </button>
          </div>
        ) : null}

        {truckFormMode ? (
          <Modal
            title={editingTruckId ? "Edit truck" : "Add truck"}
            labelledBy="truckFormTitle"
            closeLabel="Close truck form"
            onClose={resetTruckForm}
          >
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
          </Modal>
        ) : null}

        {trucks.length === 0 ? (
          <p className="item-meta">No trucks yet.</p>
        ) : (
          <section className="list">
            {trucks.map((truck) => {
              const truckDetails = getTruckDetails(truck);
              const draftTruckDetails = draftTruckDetailsByTruckId[truck.id] || [];

              return (
                <article className="list-item" key={truck.id}>
                  <div className="day-card-content">
                    <div className="day-heading trucking-card-heading">
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
                        </p>
                        {truck.driverName || truck.driverContactNumber ? (
                          <p className="item-meta">
                            {[truck.driverName, truck.driverContactNumber]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                        {truck.contents ? <p className="item-meta">{truck.contents}</p> : null}
                      </div>
                      {!isOffline ? (
                      <div className="day-card-actions trucking-card-actions">
                        <button
                          className="compact-button primary-soft icon-text-button"
                          type="button"
                          disabled={isOffline || scheduleDays.length === 0}
                          onClick={() => addDraftTruckDetail(truck.id)}
                        >
                          <CapcomIcon name="add" size={16} weight="bold" />
                          Add row
                        </button>
                        <button
                          className="compact-button icon-text-button"
                          type="button"
                          disabled={isOffline}
                          onClick={() => startEditingTruck(truck)}
                        >
                          <CapcomIcon name="edit" size={16} />Edit</button>
                        <button
                          className="compact-button icon-text-button"
                          type="button"
                          disabled={
                            deletingTruckId === truck.id ||
                            isOffline ||
                            truckDetails.length > 0 ||
                            draftTruckDetails.length > 0
                          }
                          onClick={() => removeTruck(truck.id)}
                        >
                          <CapcomIcon name="delete" size={16} />
                          {deletingTruckId === truck.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                      ) : null}
                    </div>

                    {scheduleDays.length === 0 ? (
                      <p className="item-meta">Add schedule days before adding truck rows.</p>
                    ) : truckDetails.length === 0 && draftTruckDetails.length === 0 ? (
                      null
                    ) : (
                      <div className="detail-list">
                        {truckDetails.map((detail, detailIndex) => {
                          const dayId = detail.scheduleDayId || "";
                          const isEditingTime = isEditingDetailCell(detail.id, "time");
                          const hasDate = Boolean(dayId);
                          const hasTime = Boolean(detail.time);
                          const hasDestination = Boolean(getTruckDestinationValue(detail));
                          const dateSelectId = `truck-detail-date-${detail.id}`;
                          const truckDetailDay = scheduleDays.find((day) => day.id === dayId);
                          const truckDetailDateLabel = truckDetailDay
                            ? formatDetailDate(truckDetailDay.date)
                            : "No date";
                          const destinationLabel = getTruckDestinationLabel(detail);

                          return (
                            <div
                              className="detail-row draggable-row truck-detail-row"
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
                              <span className="mobile-truck-detail-date-line">
                                {truckDetailDateLabel}
                              </span>
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
                                  onFocus={() => setActiveTruckDateSelectId(dateSelectId)}
                                  onBlur={() => setActiveTruckDateSelectId("")}
                                  onChange={(event) =>
                                    assignTruckDetailDate(dayId, detail, event.target.value)
                                  }
                                >
                                  <option value="">Choose date</option>
                                  {scheduleDays.map((day) => (
                                  <option key={day.id} value={day.id}>
                                      {formatTruckDetailDateOption(day, dateSelectId)}
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
                              ) : isOffline ? (
                                <span
                                  className={[
                                    "detail-cell",
                                    "detail-time-display",
                                    hasTime ? "" : "missing-time",
                                  ].filter(Boolean).join(" ")}
                                >
                                  {detail.time || "tbc"}
                                </span>
                              ) : (
                                <button
                                  className={[
                                    "detail-cell",
                                    "detail-time-display",
                                    hasTime ? "" : "missing-time",
                                  ].filter(Boolean).join(" ")}
                                  type="button"
                                  disabled={isOffline}
                                  onClick={() => {
                                    if (window.matchMedia("(max-width: 767px)").matches) {
                                      startEditingDetailTime(dayId, detail);
                                      return;
                                    }

                                    startEditingDetailCell(dayId, detail.id, "time");
                                  }}
                                >
                                  {detail.time || "tbc"}
                                </button>
                              )}
                              {isOffline ? (
                                <span className="detail-cell truck-action-cell">
                                  {renderTruckActionLabel(detail.action)}
                                </span>
                              ) : (
                              <button
                                className="detail-cell truck-action-cell"
                                type="button"
                                disabled={savingDetailId === detail.id || isOffline}
                                onClick={() => toggleTruckDetailAction(dayId, detail)}
                              >
                                {renderTruckActionLabel(detail.action)}
                              </button>
                              )}
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
                              <span className="mobile-detail-meta-line">
                                {destinationLabel}
                              </span>
                              {!isOffline ? (
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
                                    <CapcomIcon name="overflow" size={20} weight="bold" />
                                  </button>
                                  {openActionMenuId === detail.id ? (
                                    <div
                                      className="action-menu-list"
                                      onMouseDown={beginRowAction}
                                    >
                                      <button
                                        className="action-menu-item"
                                        type="button"
                                        disabled={savingDetailId === detail.id || isOffline}
                                        onClick={() => {
                                          closeActionMenu();
                                          startEditingDetail(dayId, detail);
                                          endRowAction();
                                        }}
                                      >
                                        <CapcomIcon name="edit" size={16} />
                                        Edit
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
                                        <CapcomIcon name="duplicate" size={16} />
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
                                        <CapcomIcon name="delete" size={16} />
                                        Delete
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              ) : null}
                            </div>
                          );
                        })}
                        {draftTruckDetails.map((draft, draftIndex) => (
                          (() => {
                            const dateSelectId = `truck-draft-date-${truck.id}-${draftIndex}`;
                            const draftDay = scheduleDays.find((day) => day.id === draft.scheduleDayId);
                            const draftDateLabel = draftDay ? formatDetailDate(draftDay.date) : "Choose date";
                            return (
                          <div
                            className="detail-row draft-row truck-detail-row"
                            key={`truck-draft-${draftIndex}`}
                            style={getTruckDetailRowStyle()}
                          >
                            <span className="mobile-truck-detail-date-line">
                              {draftDateLabel}
                            </span>
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
                                autoFocus={draftIndex === draftTruckDetails.length - 1}
                                onFocus={() => setActiveTruckDateSelectId(dateSelectId)}
                                onBlur={() => setActiveTruckDateSelectId("")}
                                onChange={(event) =>
                                  updateDraftTruckDetail(
                                    truck.id,
                                    draftIndex,
                                    "scheduleDayId",
                                    event.target.value
                                  )
                                }
                                onKeyDown={(event) =>
                                  handleDraftTruckDetailKeyDown(event, truck, draft, draftIndex)
                                }
                                required
                              >
                                <option value="">Choose date</option>
                                {scheduleDays.map((day) => (
                                  <option key={day.id} value={day.id}>
                                    {formatTruckDetailDateOption(day, dateSelectId)}
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
                              onKeyDown={(event) =>
                                handleDraftTruckDetailKeyDown(event, truck, draft, draftIndex)
                              }
                              onChange={(event) =>
                                updateDraftTruckDetail(truck.id, draftIndex, "time", event.target.value)
                              }
                            />
                              <button
                                className="detail-cell truck-action-cell"
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
                                {renderTruckActionLabel(draft.action)}
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
                                    updateDraftTruckDestination(
                                      truck.id,
                                      draftIndex,
                                      event.target.value
                                    )
                                  }
                                  onKeyDown={(event) =>
                                    handleDraftTruckDetailKeyDown(event, truck, draft, draftIndex)
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
                                  isOffline
                                }
                                onClick={() => saveDraftTruckDetail(truck, draftIndex, draft)}
                              >
                                {savingDraftDayId === truck.id ? "Saving..." : "Save"}
                              </button>
                            </div>
                          </div>
                            );
                          })()
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
