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
      <div className="max-w-sm mx-auto mt-20 p-6 bg-white shadow rounded text-center">
        <h1 className="text-3xl font-semibold text-gray-800 tracking-tight mb-2">PDF Admin</h1>
        <h2 className="text-lg font-medium text-gray-500 mb-6">Login</h2>
        <div>
          <img src="/logo.png" alt="Flair logo" />
          <input
            className="block w-full border mb-2 p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="block w-full border mb-2 p-2 rounded"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="mt-2 w-full bg-blue-600 text-white font-semibold p-2 rounded hover:bg-blue-700"
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

      <ProfileList />
      <button
        onClick={logout}
        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-700 transition"
      >
        Logout
      </button>
    </>
  );
}
