import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase/auth";
import { getClient, getClients } from "../services/clientService.js";
import { getUserProfile } from "../services/userService.js";
import {
  isAdmin,
  isUser,
  isViewer,
  isSuperAdmin,
} from "./roles.js";

const AuthContext = createContext(null);
const ACTIVE_CLIENT_STORAGE_KEY = "capcom.activeClientId";

function readStoredActiveClientId() {
  try {
    return window.localStorage.getItem(ACTIVE_CLIENT_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function storeActiveClientId(clientId) {
  try {
    if (clientId) {
      window.localStorage.setItem(ACTIVE_CLIENT_STORAGE_KEY, clientId);
    } else {
      window.localStorage.removeItem(ACTIVE_CLIENT_STORAGE_KEY);
    }
  } catch {
    // Local storage is a convenience only; the selected client can still live in state.
  }
}

function chooseDefaultClientId(clients) {
  const storedClientId = readStoredActiveClientId();
  if (storedClientId && clients.some((client) => client.id === storedClientId)) {
    return storedClientId;
  }

  const flairClient = clients.find((client) =>
    (client.clientName || "").trim().toLowerCase() === "flair ltd"
  );
  if (flairClient) return flairClient.id;

  return clients.find((client) => client.isActive !== false)?.id || clients[0]?.id || "";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [clients, setClients] = useState([]);
  const [activeClientId, setActiveClientIdState] = useState("");
  const [activeClient, setActiveClient] = useState(null);
  const [activeClientLoading, setActiveClientLoading] = useState(false);

  const refreshUserProfile = async (targetUser) => {
    const uid = typeof targetUser === "string"
      ? targetUser
      : targetUser?.uid || user?.uid;

    if (!uid) return;

    setProfileLoading(true);
    setProfileError("");
    try {
      const profile = await getUserProfile(uid);
      setUserProfile(profile);
    } catch (error) {
      console.error("Could not load user profile.", error);
      setUserProfile(null);
      setProfileError("Could not load user profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (!firebaseUser) {
        setUserProfile(null);
        setProfileLoading(false);
        setProfileError("");
        setClients([]);
        setActiveClientIdState("");
        setActiveClient(null);
        setActiveClientLoading(false);
        return;
      }

      try {
        await refreshUserProfile(firebaseUser);
        if (!cancelled) {
          setProfileLoading(false);
        }
      } catch (error) {
        console.error("Could not load user profile.", error);
        if (!cancelled) {
          setUserProfile(null);
          setProfileError("Could not load user profile.");
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (profileLoading) return undefined;

    let cancelled = false;

    const loadActiveClient = async () => {
      if (!userProfile) {
        setClients([]);
        setActiveClientIdState("");
        setActiveClient(null);
        setActiveClientLoading(false);
        return;
      }

      setActiveClientLoading(true);

      try {
        if (isSuperAdmin(userProfile)) {
          const clientRecords = await getClients();
          if (cancelled) return;

          const nextClientId = chooseDefaultClientId(clientRecords);
          setClients(clientRecords);
          setActiveClientIdState(nextClientId);
          setActiveClient(clientRecords.find((client) => client.id === nextClientId) || null);
          storeActiveClientId(nextClientId);
          return;
        }

        if (userProfile.clientId) {
          const client = await getClient(userProfile.clientId);
          if (cancelled) return;

          setClients(client ? [client] : []);
          setActiveClientIdState(userProfile.clientId);
          setActiveClient(client || null);
          return;
        }

        setClients([]);
        setActiveClientIdState("");
        setActiveClient(null);
      } catch (error) {
        console.error("Could not load active client.", error);
        if (!cancelled) {
          setClients([]);
          setActiveClientIdState("");
          setActiveClient(null);
        }
      } finally {
        if (!cancelled) setActiveClientLoading(false);
      }
    };

    loadActiveClient();

    return () => {
      cancelled = true;
    };
  }, [profileLoading, userProfile]);

  const setActiveClientId = useCallback((clientId) => {
    const nextClientId = clientId || "";
    setActiveClientIdState(nextClientId);
    setActiveClient(clients.find((client) => client.id === nextClientId) || null);
    if (isSuperAdmin(userProfile)) storeActiveClientId(nextClientId);
  }, [clients, userProfile]);

  const value = useMemo(() => {
    return {
      user,
      userProfile,
      authLoading,
      profileLoading,
      profileError,
      clients,
      activeClientId,
      activeClient,
      activeClientLoading,
      setActiveClientId,
      isSuperAdmin: isSuperAdmin(userProfile),
      isAdmin: isAdmin(userProfile),
      isUser: isUser(userProfile),
      isViewer: isViewer(userProfile),
      refreshUserProfile,
      login: (email, password) => signInWithEmailAndPassword(auth, email, password),
      logout: () => signOut(auth),
    };
  }, [
    user,
    userProfile,
    authLoading,
    profileLoading,
    profileError,
    clients,
    activeClientId,
    activeClient,
    activeClientLoading,
    setActiveClientId,
    refreshUserProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
