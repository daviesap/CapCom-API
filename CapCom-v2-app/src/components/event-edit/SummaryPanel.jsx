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
                const isEditing = editingDayId === day.id && editingDayMode === "inline";

                return (
                  <tr key={day.id}>
                    <td className="date-cell" data-label="Date">{friendlyDate}</td>
                    <td data-label="Summary">
                      {isEditing ? (
                        <input
                          aria-label={`Summary for ${friendlyDate}`}
                          value={editingDayDraft.summary}
                          disabled={isOffline}
                          onChange={(event) =>
                            onUpdateEditingDayField("summary", event.target.value)
                          }
                        />
                      ) : (
                        <span className="display-text">
                          {day.summary || ""}
                        </span>
                      )}
                    </td>
                    <td data-label="End of day target">
                      <div className="target-cell">
                        {isEditing ? (
                          <input
                            aria-label={`End of day target for ${friendlyDate}`}
                            value={editingDayDraft.endOfDayTarget}
                            disabled={isOffline}
                            onChange={(event) =>
                              onUpdateEditingDayField("endOfDayTarget", event.target.value)
                            }
                          />
                        ) : (
                          <span className="display-text">
                            {day.endOfDayTarget || ""}
                          </span>
                        )}

                        <div className="row-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="compact-button primary"
                                type="button"
                                disabled={savingDayId === day.id || isOffline}
                                onClick={() => onSaveDay(day, editingDayDraft)}
                              >
                                {savingDayId === day.id ? "Saving..." : "Save"}
                              </button>
                              <button
                                className="compact-button"
                                type="button"
                                disabled={savingDayId === day.id || isOffline}
                                onClick={onCancelEditingDay}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              className="compact-button"
                              type="button"
                              disabled={isOffline}
                              onClick={() => onStartEditingDay(day, "inline")}
                            >
                              Edit
                            </button>
                          )}
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
    </section>
  );
}
