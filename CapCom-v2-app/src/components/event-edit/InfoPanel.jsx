import Modal from "../Modal.jsx";
import { CapcomIcon } from "../../icons/capcomIcons.jsx";

export default function InfoPanel({
  activeInfoTab,
  setActiveInfoTab,
  detailsLoading,
  companiesLoading,
  contactCompanies,
  companyContactsByCompanyId,
  editingCompanyContactCompanyId,
  openContactCompanyIds,
  canManageContactCompanyOrder,
  canManageCompanyContacts,
  isOffline,
  savingContactCompanyOrder,
  contactCompanyDropTargetId,
  draggedContactCompanyIdRef,
  companyContactsLoading,
  companyContactDropTargetId,
  reorderingCompanyContactId,
  draggedCompanyContactIdRef,
  savingCompanyContact,
  deletingCompanyContactId,
  companyContactForm,
  editingCompanyContactId,
  reorderContactCompany,
  reorderCompanyContact,
  setContactCompanyDropTargetId,
  setCompanyContactDropTargetId,
  toggleContactCompanyOpen,
  startAddingCompanyContact,
  startEditingCompanyContact,
  removeCompanyContact,
  updateCompanyContactFormField,
  saveCompanyContact,
  eventContactForm,
  startEditingEventContactRole,
  updateEventContactRoleFormField,
  saveEventContactRole,
  resetEventContactRoleForm,
  editingEventContactCompanyId,
  toggleEventContactHidden,
  savingEventContact,
  resetCompanyContactForm,
}) {
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
          {detailsLoading || companiesLoading ? (
            <p className="item-meta">Loading contacts...</p>
          ) : contactCompanies.length === 0 ? (
            <p className="item-meta">No companies are tagged in this event schedule yet.</p>
          ) : (
            <div className="company-list">
              {contactCompanies.map((company) => {
                const companyContacts = companyContactsByCompanyId[company.id] || [];
                const visibleContacts = companyContacts.filter((contact) => !contact.isHidden);
                const hiddenContacts = companyContacts.filter((contact) => contact.isHidden);
                const isEditingThisCompanyContact =
                  editingCompanyContactCompanyId === company.id;
                const isEditingThisCompanyEventContactRole =
                  editingEventContactCompanyId === company.id;
                const isCompanyOpen = openContactCompanyIds.includes(company.id);

                return (
                  <div
                    className={[
                      "company-list-row",
                      canManageContactCompanyOrder && !isOffline ? "draggable-company-row" : "",
                      contactCompanyDropTargetId === company.id ? "drop-target" : "",
                    ].filter(Boolean).join(" ")}
                    key={company.id}
                    draggable={canManageContactCompanyOrder && !isOffline && !savingContactCompanyOrder}
                    onDragStart={(event) => {
                      if (event.target.closest(".company-contact-row")) return;
                      if (!canManageContactCompanyOrder || isOffline) return;
                      draggedContactCompanyIdRef.current = company.id;
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      if (
                        !canManageContactCompanyOrder ||
                        isOffline ||
                        savingContactCompanyOrder ||
                        !draggedContactCompanyIdRef.current ||
                        draggedContactCompanyIdRef.current === company.id
                      ) {
                        return;
                      }
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setContactCompanyDropTargetId(company.id);
                    }}
                    onDragLeave={() => {
                      setContactCompanyDropTargetId((current) =>
                        current === company.id ? "" : current
                      );
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      const draggedCompanyId = draggedContactCompanyIdRef.current;
                      draggedContactCompanyIdRef.current = "";
                      reorderContactCompany(draggedCompanyId, company.id);
                    }}
                    onDragEnd={() => {
                      draggedContactCompanyIdRef.current = "";
                      setContactCompanyDropTargetId("");
                    }}
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
                              {visibleContacts.length}/{companyContacts.length} contact
                              {companyContacts.length === 1 ? "" : "s"}
                            </span>
                            {hiddenContacts.length > 0 ? (
                              <span className="item-meta company-accordion-meta">
                                {hiddenContacts.length} hidden
                              </span>
                            ) : null}
                          </span>
                        </button>
                        {canManageCompanyContacts ? (
                          <button
                            className="compact-button"
                            type="button"
                            disabled={isOffline || savingCompanyContact}
                            onClick={() => startAddingCompanyContact(company.id)}
                          >
                            <CapcomIcon name="add" size={16} weight="bold" />
                            Add contact
                          </button>
                        ) : null}
                      </div>

                      {isCompanyOpen ? (
                        <div className="company-accordion-body">
                          {company.address ? (
                            <p className="item-meta company-address">{company.address}</p>
                          ) : null}

                          {companyContactsLoading ? (
                            <p className="item-meta">Loading contacts...</p>
                          ) : companyContacts.length === 0 ? (
                            <p className="item-meta">No contacts yet.</p>
                          ) : (
                                <div className="company-contact-list">
                                  {companyContacts.map((contact) => (
                                    <div
                                      className={[
                                        "company-contact-row",
                                        contact.isHidden ? "is-hidden" : "",
                                        canManageCompanyContacts && !isOffline
                                          ? "draggable-contact-row"
                                          : "",
                                        companyContactDropTargetId === contact.id
                                          ? "drop-target"
                                          : "",
                                  ].filter(Boolean).join(" ")}
                                  key={contact.id}
                                  draggable={
                                    canManageCompanyContacts &&
                                    !isOffline &&
                                    reorderingCompanyContactId !== company.id
                                  }
                                  onDragStart={(event) => {
                                    if (!canManageCompanyContacts || isOffline) return;
                                    event.stopPropagation();
                                    draggedCompanyContactIdRef.current = contact.id;
                                    event.dataTransfer.effectAllowed = "move";
                                  }}
                                  onDragOver={(event) => {
                                    if (
                                      !canManageCompanyContacts ||
                                      isOffline ||
                                      reorderingCompanyContactId ||
                                      !draggedCompanyContactIdRef.current ||
                                      draggedCompanyContactIdRef.current === contact.id
                                    ) {
                                      return;
                                    }
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.dataTransfer.dropEffect = "move";
                                    setCompanyContactDropTargetId(contact.id);
                                  }}
                                  onDragLeave={() => {
                                    setCompanyContactDropTargetId((current) =>
                                      current === contact.id ? "" : current
                                    );
                                  }}
                                  onDrop={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    const draggedContactId = draggedCompanyContactIdRef.current;
                                    draggedCompanyContactIdRef.current = "";
                                    reorderCompanyContact(company.id, draggedContactId, contact.id);
                                  }}
                                  onDragEnd={(event) => {
                                    event.stopPropagation();
                                    draggedCompanyContactIdRef.current = "";
                                    setCompanyContactDropTargetId("");
                                  }}
                                >
                                  <div>
                                    <p className="item-title">{contact.name}</p>
                                    {contact.isHidden ? (
                                      <p className="item-meta company-contact-hidden-label">Hidden on event</p>
                                    ) : null}
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
                                  {canManageCompanyContacts ? (
                                    <div className="company-list-actions">
                                      <button
                                        className="compact-button"
                                        type="button"
                                        disabled={savingEventContact || isOffline}
                                        onClick={() => startEditingEventContactRole(company.id, contact)}
                                      >
                                        <CapcomIcon name="edit" size={16} />
                                        Event role
                                      </button>
                                      <button
                                        className="compact-button"
                                        type="button"
                                        disabled={savingEventContact || isOffline}
                                        onClick={() => toggleEventContactHidden(contact.id)}
                                      >
                                        {contact.isHidden ? "Unhide" : "Hide"}
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
                                      <button
                                        className="compact-button"
                                        type="button"
                                        disabled={
                                          !contact.companyContactId ||
                                          deletingCompanyContactId === contact.companyContactId ||
                                          isOffline ||
                                          savingCompanyContact
                                        }
                                        onClick={() => removeCompanyContact(contact.companyContactId || contact.id)}
                                        >
                                          <CapcomIcon name="delete" size={16} />
                                          {deletingCompanyContactId === contact.companyContactId
                                            ? "Deleting..."
                                            : "Delete"}
                                        </button>
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
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

                          {canManageCompanyContacts && isEditingThisCompanyEventContactRole ? (
                            <Modal
                              title="Edit event role"
                              subtitle={company.companyName || "Company contact role"}
                              labelledBy={`eventContactRoleFormTitle-${company.id}`}
                              closeLabel="Close event role form"
                              onClose={resetEventContactRoleForm}
                            >
                              <form className="company-contact-form" onSubmit={saveEventContactRole}>
                                <div className="form-row">
                                  <label htmlFor={`eventContactRole-${company.id}`}>Role for this event</label>
                                  <input
                                    id={`eventContactRole-${company.id}`}
                                    value={eventContactForm.role}
                                    disabled={savingEventContact || isOffline}
                                    onChange={(event) =>
                                      updateEventContactRoleFormField(
                                        "role",
                                        event.target.value
                                      )
                                    }
                                  />
                                </div>
                                <div className="actions">
                                  <button
                                    className="button"
                                    type="submit"
                                    disabled={savingEventContact || isOffline}
                                  >
                                    {savingEventContact ? "Saving..." : "Save event role"}
                                  </button>
                                  <button
                                    className="button secondary"
                                    type="button"
                                    disabled={savingEventContact || isOffline}
                                    onClick={resetEventContactRoleForm}
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
        <div className="placeholder-panel">
          <div>
            <h2>Key Info</h2>
            <p className="item-meta">Placeholder content.</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
