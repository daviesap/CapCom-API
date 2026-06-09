import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { USER_ROLES, canManageAssignments } from "../auth/roles.js";
import Modal from "../components/Modal.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import {
  CLIENT_DEFAULTS,
  createClient,
  getClient,
  getClients,
  updateClient,
} from "../services/clientService.js";
import { sendUserPasswordResetEmail } from "../services/authEmailService.js";
import {
  canManageUserProfile,
  getUserProfiles,
  updateUserProfile,
} from "../services/userService.js";
import { createAuthUserProfile } from "../services/functionService.js";
import { getEvents } from "../services/eventService.js";
import {
  getAssignmentsForUser,
  removeEventAssignment,
  setEventAssignment,
} from "../services/eventAssignmentService.js";

const emptyClientForm = {
  clientName: "",
  clientSlug: "",
  logoUrl: "",
  primaryColour: "",
  secondaryColour: "",
  isActive: true,
};

const emptyUserForm = {
  uid: "",
  email: "",
  displayName: "",
  role: USER_ROLES.USER,
  clientId: "",
  isActive: true,
};

function slugifyClientName(clientName) {
  return clientName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getClientName(clients, clientId) {
  if (!clientId) return "None";
  return clients.find((client) => client.id === clientId)?.clientName || clientId;
}

function getSaveErrorMessage(error, fallbackMessage) {
  return error?.message || fallbackMessage;
}

export default function AdminPage() {
  const {
    user,
    userProfile,
    isSuperAdmin,
    isAdmin,
    profileLoading,
  } = useAuth();
  const canManageUsers = isSuperAdmin || isAdmin;

  const [activeAdminSection, setActiveAdminSection] = useState("users");
  const [clients, setClients] = useState([]);
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editingClientId, setEditingClientId] = useState("");
  const [isClientFormOpen, setIsClientFormOpen] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);
  const [clientMessage, setClientMessage] = useState("");
  const [clientError, setClientError] = useState("");

  const [userProfiles, setUserProfiles] = useState([]);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editingUserId, setEditingUserId] = useState("");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [userError, setUserError] = useState("");
  const [events, setEvents] = useState([]);
  const [assignmentUser, setAssignmentUser] = useState(null);
  const [assignmentEventIds, setAssignmentEventIds] = useState(new Set());
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsSaving, setAssignmentsSaving] = useState(false);

  const selectableClients = useMemo(() => {
    if (isSuperAdmin) return clients;
    if (!userProfile?.clientId) return [];
    return clients.filter((client) => client.id === userProfile.clientId);
  }, [clients, isSuperAdmin, userProfile?.clientId]);

  const loadClients = async () => {
    setClientsLoading(true);
    setClientError("");
    try {
      if (isSuperAdmin) {
        setClients(await getClients());
        return;
      }

      if (userProfile?.clientId) {
        const client = await getClient(userProfile.clientId);
        setClients(client ? [client] : []);
        return;
      }

      setClients([]);
    } catch (loadError) {
      console.error(loadError);
      setClientError("Could not load clients.");
    } finally {
      setClientsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUserError("");
    try {
      setUserProfiles(await getUserProfiles(userProfile));
    } catch (loadError) {
      console.error(loadError);
      setUserError("Could not load users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadEventsForAssignments = async () => {
    if (!canManageAssignments(userProfile)) {
      setEvents([]);
      return;
    }
    try {
      setEvents(await getEvents(userProfile));
    } catch (loadError) {
      console.error(loadError);
      setUserError("Could not load events for assignments.");
    }
  };

  useEffect(() => {
    if (profileLoading || !canManageUsers) return;
    loadClients();
    loadUsers();
    loadEventsForAssignments();
  }, [profileLoading, canManageUsers, userProfile]);

  const updateClientField = (field, value) => {
    setClientForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "clientName" && !editingClientId
        ? { clientSlug: slugifyClientName(value) }
        : {}),
    }));
  };

  const resetClientForm = () => {
    setClientForm(emptyClientForm);
    setEditingClientId("");
  };

  const closeClientForm = () => {
    resetClientForm();
    setIsClientFormOpen(false);
  };

  const openNewClientForm = () => {
    resetClientForm();
    setClientMessage("");
    setClientError("");
    setIsClientFormOpen(true);
  };

  const startEditingClient = (client) => {
    setEditingClientId(client.id);
    setClientForm({
      ...CLIENT_DEFAULTS,
      ...client,
      isActive: client.isActive !== false,
    });
    setClientMessage("");
    setClientError("");
    setIsClientFormOpen(true);
  };

  const handleClientSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setClientSaving(true);
    setClientMessage("");
    setClientError("");

    try {
      const clientData = {
        clientName: clientForm.clientName.trim(),
        clientSlug: clientForm.clientSlug.trim(),
        logoUrl: clientForm.logoUrl.trim(),
        primaryColour: clientForm.primaryColour.trim(),
        secondaryColour: clientForm.secondaryColour.trim(),
        isActive: Boolean(clientForm.isActive),
      };

      if (editingClientId) {
        await updateClient(editingClientId, clientData);
        setClientMessage("Client updated.");
      } else {
        await createClient(clientData, user?.uid);
        setClientMessage("Client created.");
      }

      resetClientForm();
      setIsClientFormOpen(false);
      await loadClients();
    } catch (saveError) {
      console.error(saveError);
      setClientError("Could not save client.");
    } finally {
      setClientSaving(false);
    }
  };

  const toggleClientActive = async (client) => {
    const isCurrentlyActive = client.isActive !== false;
    setClientSaving(true);
    setClientMessage("");
    setClientError("");

    try {
      await updateClient(client.id, {
        isActive: !isCurrentlyActive,
      });
      setClientMessage(isCurrentlyActive ? "Client deactivated." : "Client reactivated.");
      await loadClients();
    } catch (saveError) {
      console.error(saveError);
      setClientError("Could not update client status.");
    } finally {
      setClientSaving(false);
    }
  };

  const updateUserField = (field, value) => {
    setUserForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "role" && isAdmin
        ? { clientId: userProfile.clientId }
        : {}),
    }));
  };

  const resetUserForm = () => {
    setUserForm({
      ...emptyUserForm,
      role: USER_ROLES.USER,
      clientId: isAdmin ? userProfile?.clientId || "" : "",
    });
    setEditingUserId("");
  };

  const closeUserForm = () => {
    resetUserForm();
    setIsUserFormOpen(false);
  };

  const openNewUserForm = () => {
    resetUserForm();
    setUserMessage("");
    setUserError("");
    setIsUserFormOpen(true);
  };

  const startEditingUser = (profile) => {
    setEditingUserId(profile.id);
    setUserForm({
      uid: profile.id,
      email: profile.email || "",
      displayName: profile.displayName || "",
      role: profile.role || USER_ROLES.USER,
      clientId: profile.clientId || "",
      isActive: profile.isActive !== false,
    });
    setUserMessage("");
    setUserError("");
    setIsUserFormOpen(true);
  };

  const getUserFormData = () => {
    const role = isAdmin && userForm.role === USER_ROLES.ADMIN ? USER_ROLES.USER : userForm.role;
    const clientId = isAdmin ? userProfile.clientId : userForm.clientId;

    return {
      email: userForm.email.trim(),
      displayName: userForm.displayName.trim(),
      role,
      clientId,
      isActive: Boolean(userForm.isActive),
    };
  };

  const handleUserSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    setUserSaving(true);
    setUserMessage("");
    setUserError("");

    try {
      const uid = editingUserId || userForm.uid.trim();
      const userData = getUserFormData();

      if (editingUserId && !uid) {
        setUserError("Firebase Auth UID is required.");
        return;
      }

      if (!userData.clientId) {
        setUserError("Choose a client for this user.");
        return;
      }

      if (editingUserId) {
        await updateUserProfile(editingUserId, userData, userProfile);
        setUserMessage("User profile updated.");
      } else {
        const createdUser = await createAuthUserProfile(userData);
        try {
          await sendUserPasswordResetEmail(createdUser.email);
          setUserMessage(`Auth user created and password reset email sent to ${createdUser.email}.`);
        } catch (emailError) {
          console.error(emailError);
          setUserMessage(`Auth user and profile created for ${createdUser.email}.`);
          setUserError(getSaveErrorMessage(emailError, "Could not send password reset email."));
        }
      }

      resetUserForm();
      setIsUserFormOpen(false);
      await loadUsers();
    } catch (saveError) {
      console.error(saveError);
      setUserError(getSaveErrorMessage(saveError, "Could not save user profile."));
    } finally {
      setUserSaving(false);
    }
  };

  const toggleUserActive = async (profile) => {
    const isCurrentlyActive = profile.isActive !== false;
    setUserSaving(true);
    setUserMessage("");
    setUserError("");

    try {
      await updateUserProfile(
        profile.id,
        {
          email: profile.email || "",
          displayName: profile.displayName || "",
          role: profile.role,
          clientId: profile.clientId,
          isActive: !isCurrentlyActive,
        },
        userProfile
      );
      setUserMessage(isCurrentlyActive ? "User profile deactivated." : "User profile reactivated.");
      await loadUsers();
    } catch (saveError) {
      console.error(saveError);
      setUserError("Could not update user profile status.");
    } finally {
      setUserSaving(false);
    }
  };

  const sendPasswordReset = async (profile) => {
    setUserSaving(true);
    setUserMessage("");
    setUserError("");

    try {
      await sendUserPasswordResetEmail(profile.email);
      setUserMessage(`Password reset email sent to ${profile.email}.`);
    } catch (emailError) {
      console.error(emailError);
      setUserError(getSaveErrorMessage(emailError, "Could not send password reset email."));
    } finally {
      setUserSaving(false);
    }
  };

  const openAssignmentForm = async (profile) => {
    setAssignmentUser(profile);
    setAssignmentsLoading(true);
    setUserMessage("");
    setUserError("");
    try {
      const assignments = await getAssignmentsForUser(profile.id, userProfile);
      setAssignmentEventIds(new Set(assignments.map((assignment) => assignment.eventId)));
    } catch (assignmentError) {
      console.error(assignmentError);
      setUserError("Could not load event assignments.");
      setAssignmentUser(null);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const closeAssignmentForm = () => {
    if (assignmentsSaving) return;
    setAssignmentUser(null);
    setAssignmentEventIds(new Set());
  };

  const toggleAssignmentEvent = (eventId) => {
    setAssignmentEventIds((current) => {
      const next = new Set(current);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!assignmentUser) return;
    setAssignmentsSaving(true);
    setUserMessage("");
    setUserError("");
    try {
      const existingAssignments = await getAssignmentsForUser(assignmentUser.id, userProfile);
      const nextEventIds = assignmentEventIds;
      const targetEvents = events.filter((event) => nextEventIds.has(event.id));

      await Promise.all([
        ...targetEvents
          .map((event) => setEventAssignment({
            eventId: event.id,
            clientId: event.clientId,
            userId: assignmentUser.id,
            accessRole: assignmentUser.role,
            currentUserId: user?.uid,
          })),
        ...existingAssignments
          .filter((assignment) => !nextEventIds.has(assignment.eventId))
          .map((assignment) => removeEventAssignment(assignment.eventId, assignmentUser.id)),
      ]);

      setUserMessage("Event assignments updated.");
      closeAssignmentForm();
    } catch (assignmentError) {
      console.error(assignmentError);
      setUserError("Could not save event assignments.");
    } finally {
      setAssignmentsSaving(false);
    }
  };

  useEffect(() => {
    if (profileLoading || !canManageUsers) return;
    resetUserForm();
  }, [profileLoading, canManageUsers, isAdmin, userProfile?.clientId]);

  useEffect(() => {
    if (!isSuperAdmin && activeAdminSection === "clients") {
      setActiveAdminSection("users");
    }
  }, [activeAdminSection, isSuperAdmin]);

  const editingUserProfile = editingUserId
    ? userProfiles.find((profile) => profile.id === editingUserId)
    : null;
  const editingClient = editingClientId
    ? clients.find((client) => client.id === editingClientId)
    : null;

  return (
    <section className="page">
      {!profileLoading && !canManageUsers ? (
        <div className="panel placeholder-panel">
          <CapcomIcon name="admin" size={32} weight="duotone" />
          <div>
            <h2>Admin workflows</h2>
            <p className="page-subtitle">
              This area is reserved for users with an admin role.
            </p>
          </div>
        </div>
      ) : null}

      {!profileLoading && canManageUsers ? (
        <div className="admin-subnav tabs" aria-label="Admin sections">
          <button
            className={activeAdminSection === "users" ? "tab active" : "tab"}
            type="button"
            onClick={() => setActiveAdminSection("users")}
          >
            Users
          </button>
          {isSuperAdmin ? (
            <button
              className={activeAdminSection === "clients" ? "tab active" : "tab"}
              type="button"
              onClick={() => setActiveAdminSection("clients")}
            >
              Clients
            </button>
          ) : null}
        </div>
      ) : null}

      {!profileLoading && isSuperAdmin && activeAdminSection === "clients" ? (
        <div className="admin-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Clients</h2>
              </div>
              {!isClientFormOpen ? (
                <button
                  className="button admin-add-client-button"
                  type="button"
                  aria-label="Create new client"
                  disabled={clientSaving}
                  onClick={openNewClientForm}
                >
                  <CapcomIcon name="add" size={18} weight="bold" />
                  <span className="button-label">Create New Client</span>
                </button>
              ) : null}
            </div>

            {clientError ? <p className="error">{clientError}</p> : null}
            {clientMessage ? <p className="message success-message">{clientMessage}</p> : null}

            {isClientFormOpen ? (
              <Modal
                title={editingClientId ? "" : "Create New Client"}
                subtitle=""
                labelledBy="clientFormTitle"
                closeLabel="Close client form"
                onClose={closeClientForm}
              >
              <form className="admin-inline-form" onSubmit={handleClientSubmit}>
                <div className="form-grid">
                  <div className="form-row">
                    <label htmlFor="clientName">Client name</label>
                    <input
                      id="clientName"
                      value={clientForm.clientName}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("clientName", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="clientSlug">Client slug</label>
                    <input
                      id="clientSlug"
                      value={clientForm.clientSlug}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("clientSlug", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row full">
                    <label htmlFor="logoUrl">Logo URL</label>
                    <input
                      id="logoUrl"
                      value={clientForm.logoUrl}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("logoUrl", event.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="primaryColour">Primary colour</label>
                    <input
                      id="primaryColour"
                      value={clientForm.primaryColour}
                      disabled={clientSaving}
                      placeholder="#BE1717"
                      onChange={(event) => updateClientField("primaryColour", event.target.value)}
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="secondaryColour">Secondary colour</label>
                    <input
                      id="secondaryColour"
                      value={clientForm.secondaryColour}
                      disabled={clientSaving}
                      placeholder="#FFF4DF"
                      onChange={(event) => updateClientField("secondaryColour", event.target.value)}
                    />
                  </div>
                </div>

                {editingClient ? (
                  <div className="actions admin-modal-secondary-actions">
                    <button
                      className={editingClient.isActive !== false ? "button secondary" : "button"}
                      type="button"
                      disabled={clientSaving}
                      onClick={async () => {
                        await toggleClientActive(editingClient);
                        updateClientField("isActive", editingClient.isActive === false);
                      }}
                    >
                      {editingClient.isActive !== false ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                ) : null}

                <div className="actions">
                  <button className="button" type="submit" disabled={clientSaving}>
                    {clientSaving ? "Saving..." : editingClientId ? "Save Client" : "Create Client"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={clientSaving}
                    onClick={closeClientForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              </Modal>
            ) : null}

            {!clientsLoading && clients.length === 0 ? (
              <p className="message">No clients yet.</p>
            ) : null}

            <div className="client-list">
              {clients.map((client) => (
                <article className="client-list-row" key={client.id}>
                  <div className="client-card-main">
                    <div>
                      <div className="client-title-line">
                        <h3>{client.clientName}</h3>
                        <span className={client.isActive !== false ? "status-pill active" : "status-pill inactive"}>
                          {client.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="item-meta">
                        {client.clientSlug || "No slug"}
                      </p>
                    </div>
                    <button
                      className="button secondary client-edit-button"
                      type="button"
                      aria-label={`Edit ${client.clientName}`}
                      disabled={clientSaving}
                      onClick={() => startEditingClient(client)}
                    >
                      <CapcomIcon name="edit" size={18} weight="bold" />
                      <span className="button-label">Edit</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {!profileLoading && canManageUsers && activeAdminSection === "users" ? (
        <div className="admin-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Users</h2>
              </div>
              {!isUserFormOpen ? (
                <button
                  className="button admin-add-user-button"
                  type="button"
                  aria-label="Add new user"
                  disabled={userSaving}
                  onClick={openNewUserForm}
                >
                  <CapcomIcon name="add" size={18} weight="bold" />
                  <span className="button-label">Add New User</span>
                </button>
              ) : null}
            </div>

            {userError ? <p className="error">{userError}</p> : null}
            {userMessage ? <p className="message success-message">{userMessage}</p> : null}

            {isUserFormOpen ? (
              <Modal
                title={editingUserId ? "" : "Add New User"}
                subtitle=""
                labelledBy="userFormTitle"
                closeLabel="Close user form"
                onClose={closeUserForm}
              >
              <form className="admin-inline-form" onSubmit={handleUserSubmit}>
                <div className="form-grid">
                  <div className="form-row">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={userForm.email}
                      disabled={userSaving}
                      onChange={(event) => updateUserField("email", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="displayName">Display name</label>
                    <input
                      id="displayName"
                      value={userForm.displayName}
                      disabled={userSaving}
                      onChange={(event) => updateUserField("displayName", event.target.value)}
                      required
                    />
                  </div>
                  <div className="form-row">
                    <label htmlFor="role">Role</label>
                    {isSuperAdmin ? (
                      <select
                        id="role"
                        value={userForm.role}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("role", event.target.value)}
                        required
                      >
                        <option value={USER_ROLES.ADMIN}>Admin</option>
                        <option value={USER_ROLES.USER}>User</option>
                        <option value={USER_ROLES.VIEWER}>Viewer</option>
                      </select>
                    ) : (
                      <select
                        id="role"
                        value={userForm.role}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("role", event.target.value)}
                        required
                      >
                        <option value={USER_ROLES.USER}>User</option>
                        <option value={USER_ROLES.VIEWER}>Viewer</option>
                      </select>
                    )}
                  </div>
                  <div className="form-row">
                    <label htmlFor="clientId">Client</label>
                    {isSuperAdmin ? (
                      <select
                        id="clientId"
                        value={userForm.clientId}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("clientId", event.target.value)}
                        required
                      >
                        <option value="">Choose a client</option>
                        {selectableClients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.clientName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id="clientId"
                        value={getClientName(clients, userProfile?.clientId)}
                        disabled
                      />
                    )}
                  </div>
                </div>

                {editingUserProfile ? (
                  <div className="actions admin-modal-secondary-actions">
                    <button
                      className="button secondary"
                      type="button"
                      disabled={userSaving || !editingUserProfile.email}
                      onClick={() => sendPasswordReset(editingUserProfile)}
                    >
                      Send Password Reset
                    </button>
                    <button
                      className={editingUserProfile.isActive !== false ? "button secondary" : "button"}
                      type="button"
                      disabled={userSaving}
                      onClick={async () => {
                        await toggleUserActive(editingUserProfile);
                        updateUserField("isActive", editingUserProfile.isActive === false);
                      }}
                    >
                      {editingUserProfile.isActive !== false ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                ) : null}

                <div className="actions">
                  <button className="button" type="submit" disabled={userSaving}>
                    {!userSaving ? (
                      <CapcomIcon name="add" size={18} weight="bold" />
                    ) : null}
                    {userSaving ? "Saving..." : editingUserId ? "Save User" : "Create"}
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    disabled={userSaving}
                    onClick={closeUserForm}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              </Modal>
            ) : null}

            {!usersLoading && userProfiles.length === 0 ? (
              <p className="message">No user profiles yet.</p>
            ) : null}

            <div className="client-list">
              {userProfiles.map((profile) => {
                const canEditProfile = canManageUserProfile(userProfile, profile);
                return (
                  <article className="client-list-row" key={profile.id}>
                    <div className="client-card-main">
                      <div>
                        <div className="client-title-line">
                          <h3>{profile.displayName || profile.email}</h3>
                          <span className={profile.isActive !== false ? "status-pill active" : "status-pill inactive"}>
                            {profile.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="item-meta">
                          {profile.email} | {profile.role}
                        </p>
                      </div>
                      <button
                        className="button secondary client-edit-button"
                        type="button"
                        aria-label={`Edit ${profile.displayName || profile.email}`}
                        disabled={userSaving || !canEditProfile}
                        onClick={() => startEditingUser(profile)}
                      >
                        <CapcomIcon name="edit" size={18} weight="bold" />
                        <span className="button-label">Edit</span>
                      </button>
                      {[USER_ROLES.USER, USER_ROLES.VIEWER].includes(profile.role) ? (
                        <button
                          className="button secondary client-edit-button"
                          type="button"
                          aria-label={`Assign events for ${profile.displayName || profile.email}`}
                          disabled={userSaving || !canEditProfile}
                          onClick={() => openAssignmentForm(profile)}
                        >
                          <CapcomIcon name="event" size={18} weight="bold" />
                          <span className="button-label">Events</span>
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {assignmentUser ? (
        <Modal
          title="Event Access"
          subtitle={assignmentUser.displayName || assignmentUser.email || ""}
          labelledBy="eventAssignmentTitle"
          closeLabel="Close event access"
          onClose={closeAssignmentForm}
        >
          {assignmentsLoading ? <p className="message">Loading event access...</p> : null}
          {!assignmentsLoading && events.length === 0 ? (
            <p className="message">No events available for this client.</p>
          ) : null}
          {!assignmentsLoading && events.length > 0 ? (
            <div className="client-list">
              {events
                .filter((event) => isSuperAdmin || event.clientId === assignmentUser.clientId)
                .map((event) => (
                  <label className="client-list-row" key={event.id}>
                    <div className="client-card-main">
                      <div>
                        <div className="client-title-line">
                          <h3>{event.name}</h3>
                        </div>
                        <p className="item-meta">
                          {event.clientName || getClientName(clients, event.clientId)}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={assignmentEventIds.has(event.id)}
                        disabled={assignmentsSaving}
                        onChange={() => toggleAssignmentEvent(event.id)}
                      />
                    </div>
                  </label>
                ))}
            </div>
          ) : null}
          <div className="actions">
            <button className="button" type="button" disabled={assignmentsSaving} onClick={saveAssignments}>
              {assignmentsSaving ? "Saving..." : "Save Access"}
            </button>
            <button
              className="button secondary"
              type="button"
              disabled={assignmentsSaving}
              onClick={closeAssignmentForm}
            >
              Cancel
            </button>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}
