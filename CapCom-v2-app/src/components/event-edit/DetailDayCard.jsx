import DetailRow from "./DetailRow.jsx";
import DraftDetailRow from "./DraftDetailRow.jsx";

function DetailFilterNotice({ hiddenDetailCount, isEmpty }) {
  if (hiddenDetailCount > 0) {
    return (
      <p className="filter-empty-message">
        {hiddenDetailCount} row{hiddenDetailCount === 1 ? "" : "s"} hidden by filters.
      </p>
    );
  }

  if (isEmpty) {
    return <p className="item-meta">No schedule details yet.</p>;
  }

  return null;
}

function DetailDayRowCount({ totalCount, visibleCount }) {
  if (totalCount === 0) {
    return <span className="day-row-count empty">No rows</span>;
  }

  if (visibleCount !== totalCount) {
    return (
      <span className="day-row-count filtered">
        {visibleCount}/{totalCount} rows
      </span>
    );
  }

  return (
    <span className="day-row-count">
      {totalCount} row{totalCount === 1 ? "" : "s"}
    </span>
  );
}

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
  const { formatDetailDate } = detailDisplay;
  const { isOffline, addDraftDetail, startEditingDay } = dayActions;
  const hiddenDetailCount = allDayDetailCount - dayDetails.length;
  const hasRowsOrDrafts = dayDetails.length > 0 || draftDetails.length > 0;

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
              <DetailDayRowCount
                totalCount={allDayDetailCount}
                visibleCount={dayDetails.length}
              />
            </p>
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
        </div>

        {!hasRowsOrDrafts ? (
          <DetailFilterNotice
            hiddenDetailCount={hiddenDetailCount}
            isEmpty={allDayDetailCount === 0}
          />
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
            <DetailFilterNotice hiddenDetailCount={hiddenDetailCount} isEmpty={false} />
          </>
        )}
        {day.endOfDayTarget ? (
          <p className="end-target">End of day target: {day.endOfDayTarget}</p>
        ) : null}
      </div>
    </article>
  );
}
