import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";
import { updateCurrentUserDebugMode } from "../services/userService.js";

export default function ProfilePage() {
  const {
    user,
    userProfile,
    profileLoading,
    profileError,
    logout,
    isSuperAdmin,
    refreshUserProfile,
    clients,
    activeClientId,
    activeClient,
    activeClientLoading,
    setActiveClientId,
  } = useAuth();

  const [debugMode, setDebugMode] = useState(false);
  const [debugSaving, setDebugSaving] = useState(false);
  const [debugError, setDebugError] = useState("");

  useEffect(() => {
    if (!userProfile) return;

    setDebugMode(Boolean(userProfile.debugMode));
  }, [userProfile]);

  async function handleDebugModeChange(event) {
    const nextDebugMode = event.target.checked;
    const previousDebugMode = debugMode;
    setDebugMode(nextDebugMode);
    setDebugError("");
    setDebugSaving(true);

    try {
      await updateCurrentUserDebugMode(user?.uid, nextDebugMode, userProfile);
      await refreshUserProfile();
    } catch (error) {
      console.error("Could not update debug setting.", error);
      setDebugMode(previousDebugMode);
      setDebugError(error instanceof Error ? error.message : "Could not save debug setting.");
    } finally {
      setDebugSaving(false);
    }
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
        </div>
      </div>

      <div className="panel profile-panel">
        <div className="profile-summary">
          <span className="profile-avatar" aria-hidden="true">
            <CapcomIcon name="profile" size={28} weight="duotone" />
          </span>
          <div>
            <h2>{user?.displayName || "User profile"}</h2>
            <p className="page-subtitle">{user?.email || "No email address available"}</p>
          </div>
        </div>

        <dl className="profile-details">
          <div>
            <dt>User name</dt>
            <dd>{user?.displayName || "Not set"}</dd>
          </div>
          <div>
            <dt>Email address</dt>
            <dd>{user?.email || "Unavailable"}</dd>
          </div>
          <div>
            <dt>Access role</dt>
            <dd>
              {userProfile?.role || "Unavailable"}
            </dd>
          </div>
          {isSuperAdmin ? (
            <div>
              <dt>Event client</dt>
              <dd>
                <label className="form-row full profile-client-select" htmlFor="profileActiveClientId">
                  <select
                    id="profileActiveClientId"
                    value={activeClientId}
                    disabled={activeClientLoading || clients.length === 0}
                    onChange={(event) => setActiveClientId(event.target.value)}
                  >
                    <option value="">
                      {activeClientLoading ? "Loading clients..." : "Choose a client"}
                    </option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.clientName}{client.isActive === false ? " (inactive)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                {activeClient ? (
                  <span className="item-meta">Viewing {activeClient.clientName}</span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {isSuperAdmin ? (
            <div>
              <dt>Debug mode</dt>
              <dd>
                <label className="checkbox-row form-row full" htmlFor="debugMode">
                  <input
                    id="debugMode"
                    type="checkbox"
                    checked={debugMode}
                    disabled={debugSaving || profileLoading || !user?.uid}
                    onChange={handleDebugModeChange}
                  />
                  <span>Enable debug mode</span>
                </label>
              </dd>
            </div>
          ) : null}
        </dl>

        {profileError ? <p className="error">{profileError}</p> : null}
        {debugError ? <p className="error">{debugError}</p> : null}

        <div className="actions profile-actions">
          <button className="button secondary icon-text-button" type="button" onClick={logout}>
            <CapcomIcon name="signOut" size={18} weight="bold" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </section>
  );
}
