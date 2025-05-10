import { AuthProvider, useAuth } from "./AuthProvider";
import { BrowserRouter as Router, Routes, Route, useSearchParams } from "react-router-dom";
import ViewProfile from "./components/ViewProfile";
import ProfileList from "./components/ProfileList";
import './App.css';
import pdfCreationLog from './components/pdfCreationLog';
import React, { useState } from "react";

<Route path="/pdf-log" element={<pdfCreationLog />} />


function AppContent() {
  const { user, authLoading, loginWithEmail, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (authLoading) return <p>Loading...</p>;

  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="login-box">
          <img src="/logo.png" alt="Flair logo" className="logo" />
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            onClick={async () => {
              setError('');
              try {
                await loginWithEmail(email, password);
              } catch (err) {
                console.error("Login error:", err.message);
                setError('Invalid email or password');
              }
            }}
          >
            Login
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <p>Welcome, {user.email}</p>
      <button onClick={logout}>Logout</button>
      <ProfileList />
    </>
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