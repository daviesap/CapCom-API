import Modal from "../Modal.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function SettingsPanel({
  activeSettingsTab,
  setActiveSettingsTab,
  isOffline,
  tagFormMode,
  tagForm,
  tags,
  editingTagId,
  savingTag,
  deletingTagId,
  defaultTagColour,
  locations,
  locationTree,
  locationFormMode,
  locationForm,
  editingLocationId,
  savingLocation,
  deletingLocationId,
  movingLocationId,
  locationDropTargetId,
  truckSizes,
  truckSizeFormMode,
  truckSizeForm,
  editingTruckSizeId,
  savingTruckSize,
  deletingTruckSizeId,
  draggedLocationIdRef,
  normaliseHexColour,
  getTagStyle,
  startAddingTag,
  startEditingTag,
  updateTagFormField,
  saveTag,
  resetTagForm,
  removeTag,
  startAddingLocation,
  startAddingSubLocation,
  startEditingLocation,
  updateLocationFormField,
  saveLocation,
  resetLocationForm,
  removeLocation,
  moveLocation,
  setLocationDropTargetId,
  startAddingTruckSize,
  startEditingTruckSize,
  updateTruckSizeFormField,
  saveTruckSize,
  resetTruckSizeForm,
  removeTruckSize,
}) {
  const renderLocationNode = (location) => (
    <div className="location-tree-item" key={location.id}>
      <div
        className={[
          "location-list-row",
          locationDropTargetId === location.id ? "drop-target" : "",
          movingLocationId === location.id ? "is-moving" : "",
        ].filter(Boolean).join(" ")}
        draggable={!isOffline && movingLocationId !== location.id}
        onDragStart={(event) => {
          draggedLocationIdRef.current = location.id;
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => {
          const draggedLocationId = draggedLocationIdRef.current;
          if (location.parentLocationId) {
            event.stopPropagation();
            return;
          }
          if (!draggedLocationId || draggedLocationId === location.id) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "move";
          setLocationDropTargetId(location.id);
        }}
        onDragLeave={() => {
          setLocationDropTargetId((current) => (current === location.id ? "" : current));
        }}
        onDrop={(event) => {
          if (location.parentLocationId) {
            event.stopPropagation();
            draggedLocationIdRef.current = "";
            setLocationDropTargetId("");
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          const draggedLocationId = draggedLocationIdRef.current;
          draggedLocationIdRef.current = "";
          setLocationDropTargetId("");
          if (draggedLocationId) moveLocation(draggedLocationId, location.id);
        }}
        onDragEnd={() => {
          draggedLocationIdRef.current = "";
          setLocationDropTargetId("");
        }}
      >
        {!isOffline ? (
        <button
          className="location-name-button"
          type="button"
          disabled={isOffline || Boolean(location.parentLocationId)}
          onClick={() => startAddingSubLocation(location)}
          title={
            location.parentLocationId
              ? undefined
              : `Add sub-location under ${location.name || "location"}`
          }
        >
          <span className="item-title">{location.name}</span>
          <span className="item-meta">
            {location.parentLocationId ? "Sub-location" : "Main location"}
          </span>
        </button>
        ) : (
          <div>
            <span className="item-title">{location.name}</span>
            <span className="item-meta">
              {location.parentLocationId ? "Sub-location" : "Main location"}
            </span>
          </div>
        )}
        {!isOffline ? (
        <div className="location-list-actions">
          <button
            className="compact-button"
            type="button"
            disabled={isOffline}
            onClick={() => startEditingLocation(location)}
          >
            <CapcomIcon name="edit" size={16} />
            Edit
          </button>
          <button
            className="compact-button"
            type="button"
            disabled={deletingLocationId === location.id || isOffline}
            onClick={() => removeLocation(location.id)}
          >
            <CapcomIcon name="delete" size={16} />
            {deletingLocationId === location.id ? "Deleting..." : "Delete"}
          </button>
        </div>
        ) : null}
      </div>
      {location.children.length > 0 ? (
        <div className="location-tree-children">
          {location.children.map((childLocation) =>
            renderLocationNode({ ...childLocation, children: [] })
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="panel">
      <nav className="tabs nested-tabs" aria-label="Settings sections">
        <button
          className={activeSettingsTab === "tags" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveSettingsTab("tags")}
        >
          <CapcomIcon name="tag" size={18} weight="duotone" />
          <span>Tags</span>
        </button>
        <button
          className={activeSettingsTab === "locations" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveSettingsTab("locations")}
        >
          <CapcomIcon name="location" size={18} weight="duotone" />
          <span>Locations</span>
        </button>
        <button
          className={activeSettingsTab === "truckSizes" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveSettingsTab("truckSizes")}
        >
          <CapcomIcon name="truckSize" size={18} weight="duotone" />
          <span>Truck Sizes</span>
        </button>
      </nav>

      {activeSettingsTab === "tags" ? (
        <div className="settings-section">
          {!tagFormMode && !isOffline ? (
            <div className="settings-section-toolbar">
              <button
                className="button"
                type="button"
                disabled={isOffline}
                onClick={startAddingTag}
              >
                <CapcomIcon name="add" size={18} weight="bold" />
                New tag
              </button>
            </div>
          ) : null}

          {tagFormMode ? (
            <Modal
              title={editingTagId ? "Edit tag" : "New tag"}
              labelledBy="tagFormTitle"
              closeLabel="Close tag form"
              onClose={resetTagForm}
            >
            <form className="tag-form" onSubmit={saveTag}>
              <div className="form-grid">
                <div className="form-row">
                  <label htmlFor="tagName">Tag name</label>
                  <input
                    id="tagName"
                    value={tagForm.name}
                    disabled={isOffline}
                    onChange={(event) => updateTagFormField("name", event.target.value)}
                    placeholder="Confirmed"
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="tagColour">Colour</label>
                  <div className="tag-colour-field">
                    <input
                      id="tagColourPicker"
                      className="colour-picker"
                      aria-label="Tag colour picker"
                      type="color"
                      value={normaliseHexColour(tagForm.colour) || defaultTagColour}
                      disabled={isOffline}
                      onChange={(event) => updateTagFormField("colour", event.target.value)}
                    />
                    <input
                      id="tagColour"
                      value={tagForm.colour}
                      disabled={isOffline}
                      onChange={(event) => updateTagFormField("colour", event.target.value)}
                      placeholder="#DCEEFF"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="actions">
                <button className="button" type="submit" disabled={savingTag || isOffline}>
                  {savingTag ? "Saving..." : editingTagId ? "Save tag" : "Create tag"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={savingTag || isOffline}
                  onClick={resetTagForm}
                >
                  Cancel
                </button>
              </div>
            </form>
            </Modal>
          ) : null}

          {tags.length === 0 ? (
            <p className="item-meta">No tags yet.</p>
          ) : (
            <div className="tag-list">
              {tags.map((tag) => (
                <div className="tag-list-row" key={tag.id}>
                  <span className="tag-chip" style={getTagStyle(tag)}>
                    <span
                      className="tag-dot"
                      style={{ backgroundColor: normaliseHexColour(tag.colour) }}
                    />
                    {tag.name}
                  </span>
                  <span className="item-meta">{normaliseHexColour(tag.colour)}</span>
                  {!isOffline ? (
                  <div className="tag-list-actions">
                    <button
                      className="compact-button"
                      type="button"
                      disabled={isOffline}
                      onClick={() => startEditingTag(tag)}
                    >
                      <CapcomIcon name="edit" size={16} />
                      Edit
                    </button>
                    <button
                      className="compact-button"
                      type="button"
                      disabled={deletingTagId === tag.id || isOffline}
                      onClick={() => removeTag(tag.id)}
                    >
                      <CapcomIcon name="delete" size={16} />
                      {deletingTagId === tag.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {activeSettingsTab === "locations" ? (
        <div className="settings-section">
          {!locationFormMode && !isOffline ? (
            <div className="settings-section-toolbar">
              <button
                className="button"
                type="button"
                disabled={isOffline}
                onClick={startAddingLocation}
              >
                <CapcomIcon name="add" size={18} weight="bold" />
                New location
              </button>
            </div>
          ) : null}

          {locationFormMode ? (
            <Modal
              title={
                editingLocationId
                  ? "Edit location"
                  : locationForm.parentLocationId
                    ? "New sub-location"
                    : "New location"
              }
              subtitle={
                locationForm.parentLocationId
                  ? `Under ${
                      locations.find((location) => location.id === locationForm.parentLocationId)
                        ?.name || "selected location"
                    }`
                  : ""
              }
              labelledBy="locationFormTitle"
              closeLabel="Close location form"
              onClose={resetLocationForm}
            >
            <form className="location-form" onSubmit={saveLocation}>
              <div className="form-row">
                <label htmlFor="locationName">
                  {editingLocationId
                    ? "Location name"
                    : locationForm.parentLocationId
                      ? "Sub-location name"
                      : "Main location"}
                </label>
                <input
                  id="locationName"
                  value={locationForm.name}
                  disabled={isOffline}
                  onChange={(event) => updateLocationFormField("name", event.target.value)}
                  placeholder={locationForm.parentLocationId ? "Backstage" : "Main Hall"}
                  required
                />
                {locationForm.parentLocationId ? (
                  <span className="item-meta">
                    Under{" "}
                    {locations.find((location) => location.id === locationForm.parentLocationId)
                      ?.name || "selected location"}
                  </span>
                ) : null}
              </div>
              <div className="actions">
                <button className="button" type="submit" disabled={savingLocation || isOffline}>
                  {savingLocation
                    ? "Saving..."
                    : editingLocationId
                      ? "Save location"
                      : "Create location"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={savingLocation || isOffline}
                  onClick={resetLocationForm}
                >
                  Cancel
                </button>
              </div>
            </form>
            </Modal>
          ) : null}

          {locations.length === 0 ? (
            <p className="item-meta">No locations yet.</p>
          ) : (
            <div
              className={[
                "location-list",
                locationDropTargetId === "main" ? "drop-target" : "",
              ].filter(Boolean).join(" ")}
              onDragOver={(event) => {
                if (!draggedLocationIdRef.current) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setLocationDropTargetId("main");
              }}
              onDragLeave={() => {
                setLocationDropTargetId((current) => (current === "main" ? "" : current));
              }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedLocationId = draggedLocationIdRef.current;
                draggedLocationIdRef.current = "";
                setLocationDropTargetId("");
                if (draggedLocationId) moveLocation(draggedLocationId, "");
              }}
            >
              {locationTree.map((location) => renderLocationNode(location))}
            </div>
          )}
        </div>
      ) : null}

      {activeSettingsTab === "truckSizes" ? (
        <div className="settings-section">
          {!truckSizeFormMode && !isOffline ? (
            <div className="settings-section-toolbar">
              <button
                className="button"
                type="button"
                disabled={isOffline}
                onClick={startAddingTruckSize}
              >
                <CapcomIcon name="add" size={18} weight="bold" />
                New truck size
              </button>
            </div>
          ) : null}

          {truckSizeFormMode ? (
            <Modal
              title={editingTruckSizeId ? "Edit truck size" : "New truck size"}
              labelledBy="truckSizeFormTitle"
              closeLabel="Close truck size form"
              onClose={resetTruckSizeForm}
            >
            <form className="truck-size-form" onSubmit={saveTruckSize}>
              <div className="form-row">
                <label htmlFor="truckSize">Truck size</label>
                <input
                  id="truckSize"
                  value={truckSizeForm.size}
                  disabled={isOffline}
                  onChange={(event) => updateTruckSizeFormField("size", event.target.value)}
                  placeholder="18m"
                  required
                />
              </div>
              <div className="actions">
                <button className="button" type="submit" disabled={savingTruckSize || isOffline}>
                  {savingTruckSize ? "Saving..." : editingTruckSizeId ? "Save size" : "Create size"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  disabled={savingTruckSize || isOffline}
                  onClick={resetTruckSizeForm}
                >
                  Cancel
                </button>
              </div>
            </form>
            </Modal>
          ) : null}

          {truckSizes.length === 0 ? (
            <p className="item-meta">No truck sizes yet.</p>
          ) : (
            <div className="tag-list">
              {truckSizes.map((truckSize) => (
                <div className="tag-list-row" key={truckSize.id}>
                  <span>{truckSize.size}</span>
                  {!isOffline ? (
                  <div className="tag-list-actions">
                    <button
                      className="compact-button"
                      type="button"
                      disabled={isOffline}
                      onClick={() => startEditingTruckSize(truckSize)}
                    >
                      <CapcomIcon name="edit" size={16} />
                      Edit
                    </button>
                    <button
                      className="compact-button"
                      type="button"
                      disabled={deletingTruckSizeId === truckSize.id || isOffline}
                      onClick={() => removeTruckSize(truckSize.id)}
                    >
                      <CapcomIcon name="delete" size={16} />
                      {deletingTruckSizeId === truckSize.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
