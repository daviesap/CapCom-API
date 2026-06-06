import { useAuth } from "../auth/AuthProvider.jsx";
import { CapcomIcon } from "../icons/capcomIcons.jsx";

export default function ProfilePage() {
  const { user, userProfile, profileLoading, profileError, logout } = useAuth();

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
            <dt>Access role</dt>
            <dd>
              {profileLoading ? "Loading..." : userProfile?.role || "No Firestore profile"}
            </dd>
          </div>
          <div>
            <dt>Client ID</dt>
            <dd>{profileLoading ? "Loading..." : userProfile?.clientId || "None"}</dd>
          </div>
          <div>
            <dt>Account active</dt>
            <dd>
              {profileLoading
                ? "Loading..."
                : userProfile
                  ? userProfile.isActive ? "Yes" : "No"
                  : "Unknown"}
            </dd>
          </div>
        </dl>

        {profileError ? <p className="error">{profileError}</p> : null}

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
