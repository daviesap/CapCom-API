import { useEffect, useRef } from "react";

export default function DraftDetailRow({
  dayId,
  draft,
  draftIndex,
  shouldFocusDescription,
  isOffline,
  detailDisplay,
  rowAssignments,
  draftActions,
}) {
  const descriptionInputRef = useRef(null);
  const {
    getDetailRowStyle,
    showTagColumn,
    getTagStyle,
    getTagById,
    normaliseHexColour,
    tags,
    showLocationColumn,
    getLocationById,
    locationOptions,
    showCompanyColumn,
    getCompanyLabel,
    companies,
  } = detailDisplay;
  const { toggleCompanyIds } = rowAssignments;
  const {
    updateDraftDetail,
    removeDraftDetail,
    savingDraftDayId,
    saveDraftDetail,
  } = draftActions;

  useEffect(() => {
    if (!shouldFocusDescription || isOffline) return;
    descriptionInputRef.current?.focus({ preventScroll: true });
  }, [isOffline, shouldFocusDescription]);

  return (
    <div
      className="detail-row draft-row"
      key={`draft-${draftIndex}`}
      style={getDetailRowStyle()}
    >
      <input
        aria-label="New detail time"
        type="time"
        value={draft.time}
        disabled={isOffline}
        onChange={(event) => updateDraftDetail(dayId, draftIndex, "time", event.target.value)}
      />
      <input
        ref={descriptionInputRef}
        aria-label="New detail description"
        value={draft.description}
        disabled={isOffline}
        onChange={(event) =>
          updateDraftDetail(dayId, draftIndex, "description", event.target.value)
        }
        placeholder="Description"
        required
      />
      {showTagColumn ? (
        <div
          className="tag-select-wrap"
          style={getTagStyle(getTagById(draft.tagId))}
        >
          <span
            className="tag-dot"
            style={{
              backgroundColor:
                normaliseHexColour(getTagById(draft.tagId)?.colour) || "transparent",
            }}
          />
          <select
            aria-label="New detail tag"
            value={getTagById(draft.tagId) ? draft.tagId : ""}
            disabled={isOffline}
            onChange={(event) => updateDraftDetail(dayId, draftIndex, "tagId", event.target.value)}
          >
            <option value="">No tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showLocationColumn ? (
        <div className="location-select-wrap">
          <select
            aria-label="New detail location"
            value={getLocationById(draft.locationId) ? draft.locationId : ""}
            disabled={isOffline}
            onChange={(event) =>
              updateDraftDetail(dayId, draftIndex, "locationId", event.target.value)
            }
          >
            <option value="">No location</option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {location.displayName}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {showCompanyColumn ? (
        <details className="company-dropdown">
          <summary
            aria-label="New detail company"
            className="company-dropdown-trigger"
          >
            {getCompanyLabel(draft.companyIds || [])}
          </summary>
          <div className="company-dropdown-menu">
            {companies.map((company) => (
              <label className="company-dropdown-option" key={company.id}>
                <input
                  type="checkbox"
                  checked={(draft.companyIds || []).includes(company.id)}
                  disabled={isOffline}
                  onChange={() =>
                    updateDraftDetail(
                      dayId,
                      draftIndex,
                      "companyIds",
                      toggleCompanyIds(draft.companyIds || [], company.id)
                    )
                  }
                />
                <span>{company.companyName}</span>
              </label>
            ))}
          </div>
        </details>
      ) : null}
      <div className="draft-actions">
        <button
          className="button secondary"
          type="button"
          disabled={isOffline}
          onClick={() => removeDraftDetail(dayId, draftIndex)}
        >
          Cancel
        </button>
        <button
          className="button"
          type="button"
          disabled={savingDraftDayId === dayId || !draft.description.trim() || isOffline}
          onClick={() => saveDraftDetail(dayId, draftIndex, draft)}
        >
          {savingDraftDayId === dayId ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );
}
