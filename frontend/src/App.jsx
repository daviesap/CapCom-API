import { AuthProvider, useAuth } from "./AuthProvider";
import "./App.css";
import { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import TitleStyleEditor from "./TitleStyleEditor"; // 👈 Import your JSON editor component


const allowedEmails = [
  "andrew@flair.london"
];

function AppContent() {
  const { user, authLoading, loginWithGoogle, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleEmailLogin = async () => {
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading) return <p>Loading...</p>;

  if (!user) {
    return (
      <div className="login-wrapper">
        <img
          src="/logo.png"
          alt="Flair Logo"
          style={{
            maxWidth: "200px",
            marginBottom: "1.5rem"
          }}
        />
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "normal",
            marginBottom: "2rem"
          }}
        >
          Flair PDF Generator – Admin
        </h1>
        <button onClick={loginWithGoogle}>Login with Google</button>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    );
  }

  if (!allowedEmails.includes(user.email)) {
    return <p>Access denied for {user.email}</p>;
  }

  return (
    <div className="App">
      <p>Welcome, {user.displayName || user.email}</p>
      <button onClick={logout}>Logout</button>

      {/* 👇 JSON editor component now shown here after login */}
    
      <TitleStyleEditor />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}