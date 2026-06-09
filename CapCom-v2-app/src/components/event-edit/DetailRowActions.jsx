import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function DetailRowActions({
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
  previousDay,
  nextDay,
  moveDetailToDay,
  duplicateDetail,
  startEditingDetail,
  closeActionMenu,
  deleteDetail,
}) {
  if (isOffline) return null;

  const canMoveToPreviousDay =
    Boolean(previousDay) && savingDetailId !== detail.id && !isOffline;
  const canMoveToNextDay =
    Boolean(nextDay) && savingDetailId !== detail.id && !isOffline;
  const canDuplicate =
    savingDetailId !== detail.id && !isOffline && !detail.truckId;
  const canEdit = savingDetailId !== detail.id && !isOffline;
  const canDelete = savingDetailId !== detail.id && !isOffline;
  const hasAvailableActions = [
    canEdit,
    canMoveToPreviousDay,
    canMoveToNextDay,
    canDuplicate,
    canDelete,
  ].some(Boolean);

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
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => saveDetailNotes(detail, notesDraft)}
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
          disabled={!hasAvailableActions}
          onMouseDown={beginRowAction}
          onClick={() => {
            setOpenActionMenuId((current) => (current === detail.id ? "" : detail.id));
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
            {canEdit ? (
              <button
                className="action-menu-item"
                type="button"
                onClick={() => {
                  closeActionMenu();
                  startEditingDetail(day.id, detail);
                  endRowAction();
                }}
              >
                <CapcomIcon name="edit" size={16} />
                <span>Edit</span>
              </button>
            ) : null}
            {canMoveToPreviousDay ? (
              <button
                className="action-menu-item"
                type="button"
                onClick={() => {
                  moveDetailToDay(day.id, previousDay.id, detail);
                  endRowAction();
                }}
              >
                <CapcomIcon name="moveToPreviousDay" size={16} />
                <span>Move to previous day</span>
              </button>
            ) : null}
            {canMoveToNextDay ? (
              <button
                className="action-menu-item"
                type="button"
                onClick={() => {
                  moveDetailToDay(day.id, nextDay.id, detail);
                  endRowAction();
                }}
              >
                <CapcomIcon name="moveToNextDay" size={16} />
                <span>Move to next day</span>
              </button>
            ) : null}
            {canDuplicate ? (
              <button
                className="action-menu-item"
                type="button"
                onClick={() => {
                  duplicateDetail(day.id, detail);
                  endRowAction();
                }}
              >
                <CapcomIcon name="duplicate" size={16} />
                <span>Duplicate</span>
              </button>
            ) : null}
            {canDelete ? (
              <button
                className="action-menu-item danger"
                type="button"
                onClick={() => {
                  closeActionMenu();
                  deleteDetail(day.id, detail.id);
                  endRowAction();
                }}
              >
                <CapcomIcon name="delete" size={16} />
                <span>Delete</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
