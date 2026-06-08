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
