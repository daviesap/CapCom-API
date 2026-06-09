import { useEffect, useRef, useState } from "react";
import DetailRowActions from "./DetailRowActions.jsx";

function createDetailDragPreview(rowElement) {
  if (!rowElement || !document.body) return null;

  const rowRect = rowElement.getBoundingClientRect();
  const preview = rowElement.cloneNode(true);
  preview.classList.add("detail-drag-preview");
  preview.style.width = `${rowRect.width}px`;

  preview
    .querySelectorAll(".notes-popover-panel, .action-menu-list, .company-dropdown-menu")
    .forEach((element) => element.remove());

  document.body.appendChild(preview);
  return preview;
}

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
    getTruckDetailRowStyle,
    getRowTagStyle,
    getTagById,
    showTagColumn,
    getTagStyle,
    normaliseHexColour,
    tags,
    companyById,
    showLocationColumn,
    getLocationById,
    locationOptions,
    showCompanyColumn,
    getCompanyLabel,
    companies,
    showTruckDestinationColumn,
    getTruckDestinationValue,
    truckById,
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
    getAdjacentDay,
    draggedDetailIdRef,
    reorderDetail,
    moveDetailToDay,
  } = rowOrdering;
  const {
    savingDetailId,
    assignDetailTag,
    assignDetailLocation,
    assignDetailCompanies,
    toggleCompanyIds,
    assignTruckDetailDestination,
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
    startEditingDetail,
    startEditingDetailTime,
    closeActionMenu,
    deleteDetail,
  } = rowActions;
  const isEditingTime = isEditingDetailCell(detail.id, "time");
  const isEditingDescription = isEditingDetailCell(detail.id, "description");
  const isTruckRow = Boolean(detail.truckId);
  const rowStyle = isTruckRow
    ? getTruckDetailRowStyle(getRowTagStyle(getTagById(detail.tagId)))
    : getDetailRowStyle(getRowTagStyle(getTagById(detail.tagId)));
  const previousDay = getAdjacentDay(day.id, -1);
  const nextDay = getAdjacentDay(day.id, 1);
  const truck = truckById.get(detail.truckId);
  const truckCompanyName = String(companyById.get(truck?.companyId)?.companyName || "").trim();
  const truckSummary = [
    String(detail.truckNumber || truck?.truckNumber || "").trim(),
    truckCompanyName ? `(${truckCompanyName})` : "",
    String(detail.action || "").trim(),
  ]
    .filter(Boolean)
    .join(" ");
  const hasTruckDestination = Boolean(getTruckDestinationValue(detail));
  const selectableTag = tags.some((tag) => tag.id === detail.tagId)
    ? getTagById(detail.tagId)
    : null;
  const tagLabel = selectableTag?.name || "No tag";
  const locationLabel = getLocationById(detail.locationId)?.displayName || "No location";
  const companyLabel = getCompanyLabel(detail.companyIds || []);
  const truckDestinationValue = String(getTruckDestinationValue(detail) || "");
  const truckDestinationLabel = truckDestinationValue.startsWith("company:")
    ? companyById.get(truckDestinationValue.replace("company:", ""))?.companyName || "No destination"
    : truckDestinationValue.startsWith("location:")
      ? getLocationById(truckDestinationValue.replace("location:", ""))?.displayName || "No destination"
      : "No destination";
  const mobileMetaLabels = isTruckRow
    ? [truckDestinationLabel]
    : [tagLabel, locationLabel, companyLabel].filter(Boolean);
  const dragPreviewRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const canDragRow =
    !isMobileView && !isEditingTime && !isEditingDescription && !isOffline;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 700px)");
    const updateIsMobileView = () => setIsMobileView(mediaQuery.matches);

    updateIsMobileView();
    mediaQuery.addEventListener("change", updateIsMobileView);

    return () => {
      mediaQuery.removeEventListener("change", updateIsMobileView);
    };
  }, []);

  const clearDragPreview = () => {
    dragPreviewRef.current?.remove();
    dragPreviewRef.current = null;
  };

  return (
    <div
      className="detail-row draggable-row"
      style={rowStyle}
      draggable={canDragRow}
      onDragStart={(event) => {
        if (!canDragRow) {
          event.preventDefault();
          return;
        }
        draggedDetailIdRef.current = detail.id;
        event.dataTransfer.effectAllowed = "move";
        clearDragPreview();
        const dragPreview = createDetailDragPreview(event.currentTarget);
        if (dragPreview) {
          const rowRect = event.currentTarget.getBoundingClientRect();
          dragPreviewRef.current = dragPreview;
          if (event.dataTransfer.setDragImage) {
            event.dataTransfer.setDragImage(
              dragPreview,
              Math.max(0, Math.min(event.clientX - rowRect.left, dragPreview.offsetWidth)),
              Math.max(0, Math.min(event.clientY - rowRect.top, dragPreview.offsetHeight))
            );
          }
        }
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
        clearDragPreview();
      }}
      onDragEnd={() => {
        draggedDetailIdRef.current = "";
        clearDragPreview();
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
      ) : isOffline ? (
        <span className="detail-cell detail-time-display">
          {detail.time || "tbc"}
        </span>
      ) : (
        <button
          className="detail-cell detail-time-display"
          type="button"
          disabled={isOffline}
          onClick={() =>
            isMobileView
              ? startEditingDetailTime(day.id, detail)
              : startEditingDetailCell(day.id, detail.id, "time")
          }
        >
          {detail.time || "tbc"}
        </button>
      )}
      {isTruckRow ? (
        isOffline ? (
          <span className="detail-cell detail-description-cell">
            <span className="detail-description-text">{truckSummary}</span>
          </span>
        ) : (
        <button
          className="detail-cell detail-description-cell"
          type="button"
          disabled={isOffline}
        >
          <span className="detail-description-text">{truckSummary}</span>
        </button>
        )
      ) : isEditingDescription ? (
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
      ) : isOffline ? (
        <span
          className="detail-cell detail-description-cell"
          data-tooltip={detail.description || ""}
        >
          <span className="detail-description-text">{detail.description || ""}</span>
        </span>
      ) : (
        <button
          className="detail-cell detail-description-cell"
          type="button"
          data-tooltip={detail.description || ""}
          disabled={isOffline}
          onClick={() => startEditingDetailCell(day.id, detail.id, "description")}
        >
          <span className="detail-description-text">{detail.description || ""}</span>
        </button>
      )}
      <span className="mobile-detail-meta-line">
        {mobileMetaLabels.join(" · ")}
      </span>
      {!isTruckRow && showTagColumn ? (
        <>
          <div
            className="tag-select-wrap detail-select-field"
            style={getTagStyle(selectableTag)}
          >
            <span
              className="tag-dot"
              style={{
                backgroundColor:
                  normaliseHexColour(selectableTag?.colour) || "transparent",
              }}
            />
            <select
              aria-label={`Tag for ${detail.description || "schedule detail"}`}
              value={selectableTag ? detail.tagId : ""}
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
        </>
      ) : null}
      {!isTruckRow && showLocationColumn ? (
        <>
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
        </>
      ) : null}
      {!isTruckRow && showCompanyColumn ? (
        <>
          <details className="company-dropdown detail-select-field">
            <summary
              aria-label={`Company for ${detail.description || "schedule detail"}`}
              className="company-dropdown-trigger"
            >
              {companyLabel}
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
        </>
      ) : null}
      {isTruckRow && showTruckDestinationColumn ? (
        <>
          <div
            className={[
              "location-select-wrap",
              "detail-select-field",
              hasTruckDestination ? "" : "detail-select-field-missing",
            ].filter(Boolean).join(" ")}
          >
            <select
              aria-label="Destination for truck detail"
              value={getTruckDestinationValue(detail)}
              disabled={savingDetailId === detail.id || isOffline}
              onChange={(event) =>
                assignTruckDetailDestination(day.id, detail, event.target.value)
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
        </>
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
        previousDay={previousDay}
        nextDay={nextDay}
        moveDetailToDay={moveDetailToDay}
        duplicateDetail={duplicateDetail}
        startEditingDetail={startEditingDetail}
        closeActionMenu={closeActionMenu}
        deleteDetail={deleteDetail}
      />
    </div>
  );
}
