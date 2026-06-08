import Modal from "../Modal.jsx";

export default function SummaryPanel({
  scheduleDays,
  editingDayId,
  editingDayMode,
  editingDayDraft,
  isOffline,
  savingDayId,
  formatFriendlyDate,
  onUpdateEditingDayField,
  onSaveDay,
  onCancelEditingDay,
  onStartEditingDay,
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
                    <td data-label="Summary">
                      <span className="display-text">
                        {day.summary || ""}
                      </span>
                    </td>
                    <td data-label="End of day target">
                      <div className="target-cell">
                        <span className="display-text">
                          {day.endOfDayTarget || ""}
                        </span>

                        <div className="row-actions">
                          <button
                            className="compact-button"
                            type="button"
                            disabled={isOffline}
                            onClick={() => onStartEditingDay(day, "inline")}
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
