import { useState } from "react";
import Modal from "../Modal.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function InfoPanel({
  activeInfoTab,
  setActiveInfoTab,
  keyInfoItems,
  keyInfoLoading,
  keyInfoForm,
  keyInfoFormMode,
  editingKeyInfoId,
  savingKeyInfo,
  deletingKeyInfoId,
  reorderingKeyInfoId,
  draggedKeyInfoIdRef,
  contactCompanies,
  companyContactsByCompanyId,
  editingCompanyContactCompanyId,
  openContactCompanyIds,
  canManageCompanyContacts,
  isOffline,
  savingCompanyContact,
  companyContactForm,
  editingCompanyContactId,
  toggleContactCompanyOpen,
  startAddingCompanyContact,
  startEditingCompanyContact,
  updateCompanyContactFormField,
  saveCompanyContact,
  toggleEventContactHidden,
  savingEventContact,
  resetCompanyContactForm,
  startAddingKeyInfo,
  startEditingKeyInfo,
  updateKeyInfoFormField,
  saveKeyInfo,
  removeKeyInfo,
  reorderKeyInfo,
  resetKeyInfoForm,
}) {
  const [openHiddenContactSections, setOpenHiddenContactSections] = useState({});
  const [keyInfoDropTargetId, setKeyInfoDropTargetId] = useState("");

  const isHiddenSectionOpen = (companyId) => Boolean(openHiddenContactSections[companyId]);

  const setHiddenSectionOpen = (companyId, open) => {
    setOpenHiddenContactSections((current) => {
      if (Boolean(current[companyId]) === open) return current;
      return {
        ...current,
        [companyId]: open,
      };
    });
  };

  return (
    <section className="panel">
      <nav className="tabs nested-tabs" aria-label="Info sections">
        <button
          className={activeInfoTab === "contacts" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveInfoTab("contacts")}
        >
          <CapcomIcon name="contacts" size={18} weight="duotone" />
          <span>Contacts</span>
        </button>
        <button
          className={activeInfoTab === "keyInfo" ? "tab active" : "tab"}
          type="button"
          onClick={() => setActiveInfoTab("keyInfo")}
        >
          <CapcomIcon name="keyInfo" size={18} weight="duotone" />
          <span>Key Info</span>
        </button>
      </nav>

      {activeInfoTab === "contacts" ? (
        <div className="settings-section">
          {contactCompanies.length === 0 ? (
            <p className="item-meta">No companies tagged in the schedule.</p>
          ) : (
            <div className="company-list">
              {contactCompanies.map((company) => {
                const companyContacts = companyContactsByCompanyId[company.id] || [];
                const visibleContacts = companyContacts.filter((contact) => !contact.isHidden);
                const hiddenContacts = companyContacts.filter((contact) => contact.isHidden);
                const isEditingThisCompanyContact =
                  editingCompanyContactCompanyId === company.id;
                const isCompanyOpen = openContactCompanyIds.includes(company.id);

                return (
                  <div
                    className="company-list-row"
                    key={company.id}
                  >
                    <div>
                      <div className="company-accordion-heading">
                        <button
                          className="company-accordion-trigger"
                          type="button"
                          aria-expanded={isCompanyOpen}
                          onClick={() => toggleContactCompanyOpen(company.id)}
                        >
                          <span className="accordion-indicator" aria-hidden="true">
                            <CapcomIcon
                              name={isCompanyOpen ? "caretDoubleDown" : "caretDoubleRight"}
                              size={14}
                              weight="bold"
                            />
                          </span>
                          <span>
                            <span className="company-accordion-title">
                              {company.companyName || "Unnamed company"}
                            </span>
                            <span className="item-meta company-accordion-meta">
                              {visibleContacts.length} contact
                              {visibleContacts.length === 1 ? "" : "s"}
                            </span>
                            {hiddenContacts.length > 0 ? (
                              <span className="item-meta company-accordion-meta">
                                {hiddenContacts.length} hidden
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {canManageCompanyContacts && !isOffline ? (
                          <button
                            className="compact-button company-contact-add-button"
                            type="button"
                            aria-label={`Add contact to ${company.companyName || "company"}`}
                            disabled={isOffline || savingCompanyContact}
                            onClick={() => startAddingCompanyContact(company.id)}
                          >
                            <CapcomIcon name="add" size={16} weight="bold" />
                            <span className="button-label">Add contact</span>
                          </button>
                        ) : null}
                      </div>

                      {isCompanyOpen ? (
                        <div className="company-accordion-body">
                          {companyContacts.length === 0 ? (
                            <p className="item-meta">No contacts yet.</p>
                          ) : (
                            <>
                              <div className="company-contact-list">
                                {visibleContacts.length === 0 ? (
                                  <p className="item-meta">No visible contacts.</p>
                                ) : (
                                  visibleContacts.map((contact) => (
                                    <div
                                      className="company-contact-row"
                                      key={contact.id}
                                    >
                                      <div>
                                        <p className="item-title">{contact.name}</p>
                                        {contact.role ? (
                                          <p className="item-meta">{contact.role}</p>
                                        ) : null}
                                        <div className="company-contact-methods">
                                          {contact.email ? (
                                            <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                          ) : null}
                                          {contact.phone ? (
                                            <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                                          ) : null}
                                        </div>
                                      </div>
                                      {canManageCompanyContacts && !isOffline ? (
                                        <div className="company-list-actions">
                                          <button
                                            className="compact-button"
                                            type="button"
                                            disabled={savingEventContact || isOffline}
                                            onClick={() => toggleEventContactHidden(contact.id)}
                                          >
                                            Hide
                                          </button>
                                          <button
                                            className="compact-button"
                                            type="button"
                                            disabled={
                                              !contact.companyContactId ||
                                              isOffline ||
                                              savingCompanyContact
                                            }
                                            onClick={() => startEditingCompanyContact(company.id, contact)}
                                          >
                                            <CapcomIcon name="edit" size={16} />
                                            Edit
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  ))
                                )}
                              </div>
                              {hiddenContacts.length > 0 ? (
                                <details
                                  className="hidden-contacts-accordion"
                                  open={isHiddenSectionOpen(company.id)}
                                  onToggle={(event) => {
                                    setHiddenSectionOpen(company.id, event.currentTarget.open);
                                  }}
                                >
                                  <summary className="hidden-contacts-summary">
                                    <span className="hidden-contacts-summary-left">
                                      <span className="hidden-contacts-summary-icon" aria-hidden="true">
                                        <CapcomIcon
                                          name={isHiddenSectionOpen(company.id)
                                            ? "caretDoubleDown"
                                            : "caretDoubleRight"}
                                          size={14}
                                        />
                                      </span>
                                      <span className="hidden-contacts-title">
                                        <span className="hidden-contacts-summary-label">Hidden</span>
                                        <span className="item-meta">
                                          {hiddenContacts.length} contact{hiddenContacts.length === 1 ? "" : "s"}
                                        </span>
                                      </span>
                                    </span>
                                  </summary>
                                  <div className="company-contact-list hidden-contact-list">
                                    {hiddenContacts.map((contact) => (
                                      <div
                                        className="company-contact-row is-hidden"
                                        key={contact.id}
                                      >
                                        <div>
                                          <p className="item-title">{contact.name}</p>
                                          {contact.role ? (
                                            <p className="item-meta">{contact.role}</p>
                                          ) : null}
                                          <div className="company-contact-methods">
                                            {contact.email ? (
                                              <a href={`mailto:${contact.email}`}>{contact.email}</a>
                                            ) : null}
                                            {contact.phone ? (
                                              <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                                            ) : null}
                                          </div>
                                        </div>
                                        {canManageCompanyContacts && !isOffline ? (
                                          <div className="company-list-actions">
                                            <button
                                              className="compact-button"
                                              type="button"
                                              disabled={savingEventContact || isOffline}
                                              onClick={() => toggleEventContactHidden(contact.id)}
                                            >
                                              Unhide
                                            </button>
                                            <button
                                              className="compact-button"
                                              type="button"
                                              disabled={
                                                !contact.companyContactId ||
                                                isOffline ||
                                                savingCompanyContact
                                              }
                                              onClick={() => startEditingCompanyContact(company.id, contact)}
                                            >
                                              <CapcomIcon name="edit" size={16} />
                                              Edit
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              ) : null}
                            </>
                          )}

                          {canManageCompanyContacts && isEditingThisCompanyContact ? (
                            <Modal
                              title={editingCompanyContactId ? "Edit contact" : "Add contact"}
                              subtitle={company.companyName || "Company contact"}
                              labelledBy={`companyContactFormTitle-${company.id}`}
                              closeLabel="Close contact form"
                              onClose={resetCompanyContactForm}
                            >
                            <form className="company-contact-form" onSubmit={saveCompanyContact}>
                              <div className="form-grid">
                                <div className="form-row">
                                  <label htmlFor={`companyContactName-${company.id}`}>Name</label>
                                  <input
                                    id={`companyContactName-${company.id}`}
                                    value={companyContactForm.name}
                                    disabled={savingCompanyContact || isOffline}
                                    onChange={(event) =>
                                      updateCompanyContactFormField("name", event.target.value)
                                    }
                                    required
                                  />
                                </div>
                                <div className="form-row">
                                  <label htmlFor={`companyContactRole-${company.id}`}>Role</label>
                                  <input
                                    id={`companyContactRole-${company.id}`}
                                    value={companyContactForm.role}
                                    disabled={savingCompanyContact || isOffline}
                                    onChange={(event) =>
                                      updateCompanyContactFormField("role", event.target.value)
                                    }
                                  />
                                </div>
                                <div className="form-row">
                                  <label htmlFor={`companyContactEmail-${company.id}`}>Email</label>
                                  <input
                                    id={`companyContactEmail-${company.id}`}
                                    type="email"
                                    value={companyContactForm.email}
                                    disabled={savingCompanyContact || isOffline}
                                    onChange={(event) =>
                                      updateCompanyContactFormField("email", event.target.value)
                                    }
                                  />
                                </div>
                                <div className="form-row">
                                  <label htmlFor={`companyContactPhone-${company.id}`}>Phone</label>
                                  <input
                                    id={`companyContactPhone-${company.id}`}
                                    type="tel"
                                    value={companyContactForm.phone}
                                    disabled={savingCompanyContact || isOffline}
                                    onChange={(event) =>
                                      updateCompanyContactFormField("phone", event.target.value)
                                    }
                                  />
                                </div>
                              </div>
                              <div className="actions">
                                <button
                                  className="button"
                                  type="submit"
                                  disabled={savingCompanyContact || isOffline}
                                >
                                  {savingCompanyContact
                                    ? "Saving..."
                                    : editingCompanyContactId
                                      ? "Save contact"
                                      : "Create contact"}
                                </button>
                                <button
                                  className="button secondary"
                                  type="button"
                                  disabled={savingCompanyContact || isOffline}
                                  onClick={resetCompanyContactForm}
                                >
                                  Cancel
                                </button>
                              </div>
                            </form>
                            </Modal>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {activeInfoTab === "keyInfo" ? (
        <div className="settings-section">
          <div className="panel-heading">
            <span aria-hidden="true" />
            {!isOffline ? (
            <button
              className="button key-info-add-button"
              type="button"
              aria-label="Add key info"
              disabled={savingKeyInfo || isOffline}
              onClick={startAddingKeyInfo}
            >
              <CapcomIcon name="add" size={18} weight="bold" />
              <span className="button-label">Add key info</span>
            </button>
            ) : null}
          </div>

          {keyInfoLoading ? (
            <p className="item-meta">Loading key info...</p>
          ) : null}

          {!keyInfoLoading && keyInfoItems.length === 0 ? (
            <p className="item-meta">No key info yet.</p>
          ) : null}

          {keyInfoItems.length > 0 ? (
            <div className="key-info-list">
              {keyInfoItems.map((item) => (
                <article
                  className={[
                    "key-info-row",
                    !isOffline ? "draggable-key-info-row" : "",
                    keyInfoDropTargetId === item.id ? "drop-target" : "",
                  ].filter(Boolean).join(" ")}
                  key={item.id}
                  draggable={!isOffline && !reorderingKeyInfoId}
                  onDragStart={(event) => {
                    if (isOffline) return;
                    draggedKeyInfoIdRef.current = item.id;
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(event) => {
                    if (
                      isOffline ||
                      reorderingKeyInfoId ||
                      !draggedKeyInfoIdRef.current ||
                      draggedKeyInfoIdRef.current === item.id
                    ) {
                      return;
                    }
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setKeyInfoDropTargetId(item.id);
                  }}
                  onDragLeave={() => {
                    setKeyInfoDropTargetId((current) => current === item.id ? "" : current);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const draggedKeyInfoId = draggedKeyInfoIdRef.current;
                    draggedKeyInfoIdRef.current = "";
                    setKeyInfoDropTargetId("");
                    reorderKeyInfo(draggedKeyInfoId, item.id);
                  }}
                  onDragEnd={() => {
                    draggedKeyInfoIdRef.current = "";
                    setKeyInfoDropTargetId("");
                  }}
                >
                  <div>
                    <h3>{item.title}</h3>
                    {item.description ? (
                      <p className="item-meta key-info-description">{item.description}</p>
                    ) : null}
                  </div>
                  {!isOffline ? (
                  <div className="company-list-actions">
                    <button
                      className="compact-button key-info-icon-button"
                      type="button"
                      aria-label={`Edit ${item.title}`}
                      disabled={savingKeyInfo || isOffline}
                      onClick={() => startEditingKeyInfo(item)}
                    >
                      <CapcomIcon name="edit" size={16} />
                      <span className="button-label">Edit</span>
                    </button>
                    <button
                      className="compact-button key-info-icon-button"
                      type="button"
                      aria-label={`Delete ${item.title}`}
                      disabled={deletingKeyInfoId === item.id || isOffline}
                      onClick={() => removeKeyInfo(item.id)}
                    >
                      <CapcomIcon name="delete" size={16} />
                      <span className="button-label">
                        {deletingKeyInfoId === item.id ? "Deleting..." : "Delete"}
                      </span>
                    </button>
                  </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}

          {keyInfoFormMode ? (
            <Modal
              title={editingKeyInfoId ? "" : "Add key info"}
              subtitle=""
              labelledBy="keyInfoFormTitle"
              closeLabel="Close key info form"
              onClose={resetKeyInfoForm}
            >
              <form className="company-contact-form" onSubmit={saveKeyInfo}>
                <div className="form-grid">
                  <div className="form-row full">
                    <label htmlFor="keyInfoTitle">Title</label>
                    <input
                      id="keyInfoTitle"
                      value={keyInfoForm.title}
                      disabled={savingKeyInfo || isOffline}
                      onChange={(event) => updateKeyInfoFormField("title", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row full">
                    <label htmlFor="keyInfoDescription">Description</label>
                    <textarea
                      id="keyInfoDescription"
                      value={keyInfoForm.description}
                      disabled={savingKeyInfo || isOffline}
                      onChange={(event) => updateKeyInfoFormField("description", event.target.value)}
                    />
                  </div>
                </div>
                <div className="actions">
                  <button
                    className="button"
                    type="submit"
                    disabled={savingKeyInfo || isOffline}
                  >
                    {savingKeyInfo ? "Saving..." : editingKeyInfoId ? "Save key info" : "Create"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={savingKeyInfo || isOffline}
                    onClick={resetKeyInfoForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Modal>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
