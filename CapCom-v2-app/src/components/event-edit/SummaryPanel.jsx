import Modal from "../Modal.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function SummaryPanel({
  scheduleDays,
  editingDayId,
  editingDayMode,
  editingDayDraft,
  isEditingScheduleDateRange,
  isOffline,
  scheduleDateRangeDraft,
  savingScheduleDateRange,
  savingDayId,
  formatFriendlyDate,
  onUpdateEditingDayField,
  onSaveDay,
  onCancelEditingDay,
  onStartEditingDay,
  onStartEditingScheduleDateRange,
  onUpdateScheduleDateRangeField,
  onSaveScheduleDateRange,
  onCancelEditingScheduleDateRange,
}) {
  const editingDay = scheduleDays.find((day) => day.id === editingDayId);
  const editingDayLabel = editingDay ? formatFriendlyDate(editingDay.date) : "";

  return (
    <section className="panel">
      {scheduleDays.length === 0 ? (
        <p className="item-meta">No days added to the Summary yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="schedule-days-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Summary</th>
                <th>End of day target</th>
              </tr>
            </thead>
            <tbody>
              {scheduleDays.map((day) => {
                const friendlyDate = formatFriendlyDate(day.date);

                return (
                  <tr key={day.id}>
                    <td className="date-cell" data-label="Date">{friendlyDate}</td>
                    <td className="summary-cell" data-label="Summary">
                      <span className="display-text">
                        {day.summary || ""}
                      </span>
                    </td>
                    <td className="target-summary-cell" data-label="">
                      <div className="target-cell">
                        <span className="display-text eod-text">
                          {day.endOfDayTarget || ""}
                        </span>

                        {!isOffline ? (
                        <div className="row-actions">
                          <button
                            className="compact-button"
                            type="button"
                            disabled={isOffline}
                            onClick={() => onStartEditingDay(day, "inline")}
                          >
                            <CapcomIcon name="edit" size={16} />
                            <span className="button-label">Edit</span>
                          </button>
                        </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isOffline ? (
          <button
            className="button secondary update-date-range-button"
            type="button"
            disabled={isOffline}
            onClick={onStartEditingScheduleDateRange}
          >
            Update date range
          </button>
          ) : null}
        </div>
      )}
      {isEditingScheduleDateRange ? (
        <Modal
          title="Update date range"
          labelledBy="scheduleDateRangeFormTitle"
          closeLabel="Close update date range form"
          onClose={onCancelEditingScheduleDateRange}
        >
          <form className="admin-inline-form" onSubmit={onSaveScheduleDateRange}>
            <div className="form-grid">
              <div className="form-row full">
                <label htmlFor="scheduleStartDate">Schedule start date</label>
                <input
                  id="scheduleStartDate"
                  type="date"
                  value={scheduleDateRangeDraft.scheduleStartDate}
                  disabled={isOffline || savingScheduleDateRange}
                  onChange={(event) =>
                    onUpdateScheduleDateRangeField("scheduleStartDate", event.target.value)
                  }
                />
              </div>
              <div className="form-row full">
                <label htmlFor="scheduleEndDate">Schedule end date</label>
                <input
                  id="scheduleEndDate"
                  type="date"
                  value={scheduleDateRangeDraft.scheduleEndDate}
                  disabled={isOffline || savingScheduleDateRange}
                  onChange={(event) =>
                    onUpdateScheduleDateRangeField("scheduleEndDate", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="actions">
              <button
                className="button"
                type="submit"
                disabled={isOffline || savingScheduleDateRange}
              >
                {savingScheduleDateRange ? "Saving..." : "Save date range"}
              </button>
              <button
                className="button secondary"
                type="button"
                disabled={savingScheduleDateRange}
                onClick={onCancelEditingScheduleDateRange}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      {editingDay && editingDayMode === "inline" ? (
        <Modal
          title="Edit day"
          subtitle={editingDayLabel}
          labelledBy="summaryDayFormTitle"
          closeLabel="Close edit day form"
          onClose={onCancelEditingDay}
        >
          <div className="form-grid">
            <div className="form-row full">
              <label htmlFor="summaryDaySummary">Summary</label>
              <input
                id="summaryDaySummary"
                value={editingDayDraft.summary}
                disabled={isOffline}
                onChange={(event) =>
                  onUpdateEditingDayField("summary", event.target.value)
                }
              />
            </div>
            <div className="form-row full">
              <label htmlFor="summaryDayTarget">End of day target</label>
              <input
                id="summaryDayTarget"
                value={editingDayDraft.endOfDayTarget}
                disabled={isOffline}
                onChange={(event) =>
                  onUpdateEditingDayField("endOfDayTarget", event.target.value)
                }
              />
            </div>
          </div>

          <div className="actions">
            <button
              className="button"
              type="button"
              disabled={savingDayId === editingDay.id || isOffline}
              onClick={() => onSaveDay(editingDay, editingDayDraft)}
            >
              {savingDayId === editingDay.id ? "Saving..." : "Save day"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={savingDayId === editingDay.id || isOffline}
              onClick={onCancelEditingDay}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
