import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { USER_ROLES } from "../auth/roles.js";
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
  role: USER_ROLES.CLIENT_USER,
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
    isClientAdmin,
    profileLoading,
  } = useAuth();
  const canManageUsers = isSuperAdmin || isClientAdmin;

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

  useEffect(() => {
    if (profileLoading || !canManageUsers) return;
    loadClients();
    loadUsers();
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
      ...(field === "role" && value === USER_ROLES.CLIENT_USER && isClientAdmin
        ? { clientId: userProfile.clientId }
        : {}),
    }));
  };

  const resetUserForm = () => {
    setUserForm({
      ...emptyUserForm,
      role: USER_ROLES.CLIENT_USER,
      clientId: isClientAdmin ? userProfile?.clientId || "" : "",
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
      role: profile.role || USER_ROLES.CLIENT_USER,
      clientId: profile.clientId || "",
      isActive: profile.isActive !== false,
    });
    setUserMessage("");
    setUserError("");
    setIsUserFormOpen(true);
  };

  const getUserFormData = () => {
    const role = isClientAdmin ? USER_ROLES.CLIENT_USER : userForm.role;
    const clientId = isClientAdmin ? userProfile.clientId : userForm.clientId;

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

  useEffect(() => {
    if (profileLoading || !canManageUsers) return;
    resetUserForm();
  }, [profileLoading, canManageUsers, isClientAdmin, userProfile?.clientId]);

  useEffect(() => {
    if (!isSuperAdmin && activeAdminSection === "clients") {
      setActiveAdminSection("users");
    }
  }, [activeAdminSection, isSuperAdmin]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-subtitle">Access-controlled administration tools.</p>
        </div>
      </div>

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
                <p className="page-subtitle">Available when creating SuperAdmin events.</p>
              </div>
              {!isClientFormOpen ? (
                <button
                  className="button"
                  type="button"
                  disabled={clientSaving}
                  onClick={openNewClientForm}
                >
                  <CapcomIcon name="add" size={18} weight="bold" />
                  Create New Client
                </button>
              ) : null}
            </div>

            {clientError ? <p className="error">{clientError}</p> : null}
            {clientMessage ? <p className="message success-message">{clientMessage}</p> : null}

            {isClientFormOpen ? (
              <Modal
                title={editingClientId ? "Edit Client" : "Create New Client"}
                subtitle="Clients can be deactivated, not deleted."
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
                  <label className="checkbox-row form-row full" htmlFor="isActive">
                    <input
                      id="isActive"
                      type="checkbox"
                      checked={clientForm.isActive}
                      disabled={clientSaving}
                      onChange={(event) => updateClientField("isActive", event.target.checked)}
                    />
                    <span>Client is active</span>
                  </label>
                </div>

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
                  <div>
                    <div className="client-title-line">
                      <h3>{client.clientName}</h3>
                      <span className={client.isActive !== false ? "status-pill active" : "status-pill inactive"}>
                        {client.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="item-meta">
                      {client.clientSlug || "No slug"} | {client.id}
                    </p>
                  </div>
                  <div className="client-actions">
                    <button
                      className="button secondary"
                      type="button"
                      disabled={clientSaving}
                      onClick={() => startEditingClient(client)}
                    >
                      <CapcomIcon name="edit" size={16} />
                      Edit
                    </button>
                    <button
                      className={client.isActive !== false ? "button secondary" : "button"}
                      type="button"
                      disabled={clientSaving}
                      onClick={() => toggleClientActive(client)}
                    >
                      {client.isActive !== false ? "Deactivate" : "Reactivate"}
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
                <p className="page-subtitle">
                  New users are created in Firebase Auth and Firestore together.
                </p>
              </div>
              {!isUserFormOpen ? (
                <button
                  className="button"
                  type="button"
                  disabled={userSaving}
                  onClick={openNewUserForm}
                >
                  <CapcomIcon name="add" size={18} weight="bold" />
                  Add New User
                </button>
              ) : null}
            </div>

            {userError ? <p className="error">{userError}</p> : null}
            {userMessage ? <p className="message success-message">{userMessage}</p> : null}

            {isUserFormOpen ? (
              <Modal
                title={editingUserId ? "Edit User Profile" : "Add New User"}
                subtitle={
                  editingUserId
                    ? "Edit the Firestore profile for this Firebase Auth user."
                    : "Create a Firebase Auth user and matching Firestore profile."
                }
                labelledBy="userFormTitle"
                closeLabel="Close user form"
                onClose={closeUserForm}
              >
              <form className="admin-inline-form" onSubmit={handleUserSubmit}>
                <div className="form-grid">
                  {editingUserId ? (
                    <div className="form-row full">
                      <label htmlFor="uid">Firebase Auth UID</label>
                      <input
                        id="uid"
                        value={userForm.uid}
                        disabled
                        required
                      />
                    </div>
                  ) : null}
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
                        <option value={USER_ROLES.CLIENT_ADMIN}>ClientAdmin</option>
                        <option value={USER_ROLES.CLIENT_USER}>ClientUser</option>
                      </select>
                    ) : (
                      <input id="role" value={USER_ROLES.CLIENT_USER} disabled />
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
                  {editingUserId ? (
                    <label className="checkbox-row form-row full" htmlFor="userIsActive">
                      <input
                        id="userIsActive"
                        type="checkbox"
                        checked={userForm.isActive}
                        disabled={userSaving}
                        onChange={(event) => updateUserField("isActive", event.target.checked)}
                      />
                      <span>User profile is active</span>
                    </label>
                  ) : null}
                </div>

                <div className="actions">
                  <button className="button" type="submit" disabled={userSaving}>
                    {userSaving ? "Saving..." : editingUserId ? "Save User" : "Create Auth User"}
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
                    <div>
                      <div className="client-title-line">
                        <h3>{profile.displayName || profile.email}</h3>
                        <span className={profile.isActive !== false ? "status-pill active" : "status-pill inactive"}>
                          {profile.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="item-meta">
                        {profile.email} | {profile.role} | {getClientName(clients, profile.clientId)}
                      </p>
                      <p className="item-meta">{profile.id}</p>
                    </div>
                    <div className="client-actions">
                      <button
                        className="button secondary"
                        type="button"
                        disabled={userSaving || !canEditProfile}
                        onClick={() => startEditingUser(profile)}
                      >
                        Edit
                      </button>
                      <button
                        className="button secondary"
                        type="button"
                        disabled={userSaving || !canEditProfile || !profile.email}
                        onClick={() => sendPasswordReset(profile)}
                      >
                        Send Reset
                      </button>
                      <button
                        className={profile.isActive !== false ? "button secondary" : "button"}
                        type="button"
                        disabled={userSaving || !canEditProfile}
                        onClick={() => toggleUserActive(profile)}
                      >
                        {profile.isActive !== false ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
