import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/auth";
import { getUserProfile } from "../services/userService.js";
import {
  isClientAdmin,
  isClientUser,
  isSuperAdmin,
} from "./roles.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (!firebaseUser) {
        setUserProfile(null);
        setProfileLoading(false);
        setProfileError("");
        return;
      }

      setProfileLoading(true);
      setProfileError("");

      try {
        const profile = await getUserProfile(firebaseUser.uid);
        if (!cancelled) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error("Could not load user profile.", error);
        if (!cancelled) {
          setUserProfile(null);
          setProfileError("Could not load user profile.");
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    return {
      user,
      userProfile,
      authLoading,
      profileLoading,
      profileError,
      isSuperAdmin: isSuperAdmin(userProfile),
      isClientAdmin: isClientAdmin(userProfile),
      isClientUser: isClientUser(userProfile),
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      logout: () => signOut(auth),
    };
  }, [user, userProfile, authLoading, profileLoading, profileError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
