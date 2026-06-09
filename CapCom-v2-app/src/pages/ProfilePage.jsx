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
  } = useAuth();

  const [debugMode, setDebugMode] = useState(false);
  const [debugSaving, setDebugSaving] = useState(false);
  const [debugMessage, setDebugMessage] = useState("");
  const [debugError, setDebugError] = useState("");

  useEffect(() => {
    if (!userProfile) return;

    setDebugMode(Boolean(userProfile.debugMode));
  }, [userProfile]);

  async function handleDebugModeChange(event) {
    const nextDebugMode = event.target.checked;
    const previousDebugMode = debugMode;
    setDebugMode(nextDebugMode);
    setDebugMessage("");
    setDebugError("");
    setDebugSaving(true);

    try {
      await updateCurrentUserDebugMode(user?.uid, nextDebugMode, userProfile);
      await refreshUserProfile();
      setDebugMessage("Debug setting saved.");
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
          <p className="page-subtitle">Account and authentication details.</p>
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
            <dt>Authentication status</dt>
            <dd>{user ? "Signed in" : "Signed out"}</dd>
          </div>
          <div>
            <dt>Firebase Auth UID</dt>
            <dd className="copyable-value">{user?.uid || "Unavailable"}</dd>
          </div>
          <div>
            <dt>Access role</dt>
            <dd>
              {userProfile?.role || "Unavailable"}
            </dd>
          </div>
          <div>
            <dt>Client ID</dt>
            <dd>{userProfile?.clientId || "None"}</dd>
          </div>
          <div>
            <dt>Account active</dt>
            <dd>
              {userProfile ? (userProfile.isActive ? "Yes" : "No") : "Unknown"}
            </dd>
          </div>

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
        {debugMessage ? <p className="message success-message">{debugMessage}</p> : null}
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
