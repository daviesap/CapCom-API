import { AuthProvider, useAuth } from "./AuthProvider";
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import ViewProfile from "./components/ViewProfile";
import ProfileList from "./components/ProfileList";

function AppContent() {
  const { user, authLoading, loginWithGoogle, logout } = useAuth();

  if (authLoading) return <p>Loading...</p>;
  if (!user) return <button onClick={loginWithGoogle}>Login with Google</button>;

  return (
    <div className="App" style={{ padding: "1rem" }}>
      <p>Welcome, {user.displayName || user.email}</p>
      <button onClick={logout}>Logout</button>
      <ProfileList />
    </div>
  );
}

function ViewWrapper() {
  const [params] = useSearchParams();
  const profileId = params.get("profileId");
  return <ViewProfile profileId={profileId} />;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/view" element={<ViewWrapper />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}