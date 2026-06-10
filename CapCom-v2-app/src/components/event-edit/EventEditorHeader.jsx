import Modal from "../Modal.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function EventEditorHeader({
  eventId,
  form,
  imageUrl,
  dateRangeLabel,
  isEditing,
  isOffline,
  canEditEvent,
  savingEvent,
  onStartEditing,
  onSubmit,
  onCancel,
  onUpdateField,
  onImageChange,
  onRemoveImage,
  showSummary = true,
}) {
  return (
    <section className={showSummary ? "event-edit-header" : "event-edit-header event-edit-header-modal-only"}>
      {showSummary ? (
        <div className="event-edit-header-summary">
          <div className="event-edit-header-main">
            {imageUrl ? (
              <img
                className="event-header-image"
                src={imageUrl}
                alt=""
              />
            ) : null}
            <div>
              <h1 className="event-edit-title">{form.name || eventId}</h1>
              {form.venue ? (
                <p className="event-edit-venue">{form.venue}</p>
              ) : null}
              <p className="event-edit-date-range">
                {dateRangeLabel || "No event dates"}
              </p>
            </div>
          </div>
          {!isEditing && canEditEvent ? (
            <button
              className="button secondary event-header-edit-button"
              type="button"
              aria-label="Edit event"
              disabled={isOffline}
              onClick={onStartEditing}
            >
              <CapcomIcon name="edit" size={18} weight="bold" />
              <span className="button-label">Edit</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {isEditing ? (
        <Modal
          title="Edit event"
          subtitle={dateRangeLabel || "No event dates"}
          labelledBy="eventEditFormTitle"
          closeLabel="Close event edit form"
          onClose={onCancel}
        >
        <form className="event-header-form" onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="form-row">
              <label htmlFor="editName">Name</label>
              <input
                id="editName"
                value={form.name}
                disabled={isOffline}
                onChange={(event) => onUpdateField("name", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editClientName">Client</label>
              <input
                id="editClientName"
                value={form.clientName}
                disabled
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editProfileId">Profile ID</label>
              <input
                id="editProfileId"
                value={form.profileId}
                disabled={isOffline}
                onChange={(event) => onUpdateField("profileId", event.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="editVenue">Venue</label>
              <input
                id="editVenue"
                value={form.venue}
                disabled={isOffline}
                onChange={(event) => onUpdateField("venue", event.target.value)}
              />
            </div>
            <div className="form-row">
              <label htmlFor="editStartDate">First live day</label>
              <input
                id="editStartDate"
                type="date"
                value={form.startDate}
                disabled={isOffline}
                onChange={(event) => onUpdateField("startDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editEndDate">Last live day</label>
              <input
                id="editEndDate"
                type="date"
                value={form.endDate}
                disabled={isOffline}
                onChange={(event) => onUpdateField("endDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editScheduleStartDate">Schedule start date</label>
              <input
                id="editScheduleStartDate"
                type="date"
                value={form.scheduleStartDate}
                disabled={isOffline}
                onChange={(event) => onUpdateField("scheduleStartDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="editScheduleEndDate">Schedule end date</label>
              <input
                id="editScheduleEndDate"
                type="date"
                value={form.scheduleEndDate}
                disabled={isOffline}
                onChange={(event) => onUpdateField("scheduleEndDate", event.target.value)}
                required
              />
            </div>
            <div className="form-row full">
              <label htmlFor="editEventImage">Event image</label>
              <input
                id="editEventImage"
                type="file"
                accept="image/*"
                disabled={savingEvent || isOffline}
                onChange={onImageChange}
              />
              {imageUrl ? (
                <div className="event-image-upload-preview">
                  <img src={imageUrl} alt="" />
                  <button
                    className="compact-button"
                    type="button"
                    disabled={savingEvent || isOffline}
                    onClick={onRemoveImage}
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <p className="item-meta">Upload a small image, up to 2 MB.</p>
              )}
            </div>
          </div>
          <div className="actions">
            <button className="button" type="submit" disabled={savingEvent || isOffline}>
              {savingEvent ? "Saving..." : "Save event"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={savingEvent || isOffline}
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </form>
        </Modal>
      ) : null}
    </section>
  );
}
