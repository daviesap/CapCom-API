import DetailRow from "./DetailRow.jsx";
import DraftDetailRow from "./DraftDetailRow.jsx";

export default function DetailDayCard({
  day,
  dayDetails,
  allDayDetailCount,
  draftDetails,
  detailDisplay,
  dayActions,
  rowEditing,
  rowOrdering,
  rowAssignments,
  rowNotes,
  rowActions,
  draftActions,
}) {
  const { formatDetailDate, getNoRowsMessage } = detailDisplay;
  const { isOffline, addDraftDetail, startEditingDay } = dayActions;
  const hiddenDetailCount = allDayDetailCount - dayDetails.length;
  const emptyMessage =
    hiddenDetailCount > 0
      ? `${hiddenDetailCount} row${hiddenDetailCount === 1 ? "" : "s"} hidden by filters.`
      : getNoRowsMessage();

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
          <p className={hiddenDetailCount > 0 ? "filter-empty-message" : "item-meta"}>
            {emptyMessage}
          </p>
        ) : (
          <>
            <div className="detail-list">
              {dayDetails.map((detail, detailIndex) => (
                <DetailRow
                  key={detail.id}
                  day={day}
                  detail={detail}
                  detailIndex={detailIndex}
                  dayDetails={dayDetails}
                  isOffline={isOffline}
                  detailDisplay={detailDisplay}
                  rowEditing={rowEditing}
                  rowOrdering={rowOrdering}
                  rowAssignments={rowAssignments}
                  rowNotes={rowNotes}
                  rowActions={rowActions}
                />
              ))}
              {draftDetails.map((draft, draftIndex) => (
                <DraftDetailRow
                  key={`draft-${draftIndex}`}
                  dayId={day.id}
                  draft={draft}
                  draftIndex={draftIndex}
                  isOffline={isOffline}
                  detailDisplay={detailDisplay}
                  rowAssignments={rowAssignments}
                  draftActions={draftActions}
                />
              ))}
            </div>
            {hiddenDetailCount > 0 ? (
              <p className="filter-empty-message">{emptyMessage}</p>
            ) : null}
          </>
        )}
        {day.endOfDayTarget ? (
          <p className="end-target">End of day target: {day.endOfDayTarget}</p>
        ) : null}
      </div>
    </article>
  );
}
