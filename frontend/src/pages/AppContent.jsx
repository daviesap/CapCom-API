import React, { useState } from "react";
import { useAuth } from "../AuthProvider";
import ProfileList from "./ProfileList"; // already inside `pages/`

export default function AppContent() {
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