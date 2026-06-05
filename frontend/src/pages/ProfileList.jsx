import React, { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  getDocsFromCache,
  getDoc,
  doc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../services/firestore';
import { nanoid } from 'nanoid';
import { createStyleProfile } from '../services/styleProfileService';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import LogsTable from '../components/LogsTable';

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [userStats, setUserStats] = useState([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [userStatsLoading, setUserStatsLoading] = useState(true);
  const [recentLogsLoading, setRecentLogsLoading] = useState(true);
  const [profilesError, setProfilesError] = useState("");
  const [userStatsError, setUserStatsError] = useState("");
  const [recentLogsError, setRecentLogsError] = useState("");
  const [newName, setNewName] = useState("");

  const navigate = useNavigate();

  const mapProfileSnapshot = useCallback((querySnapshot) => {
    return querySnapshot.docs.map((docSnap) => {
      const profileId = docSnap.id;
      const docData = docSnap.data() || {};
      const profileName = docData.name || "(Unnamed Profile)";

      return {
        profileId,
        profileName,
        lastUsed: toDate(docData.lastUsed),
      };
    });
  }, []);

  const applyProfilesSnapshot = useCallback((querySnapshot) => {
    setProfiles(mapProfileSnapshot(querySnapshot));
  }, [mapProfileSnapshot]);

  const backfillProfileSummaries = useCallback(async (profileRows) => {
    if (profileRows.length === 0) return;

    const batch = writeBatch(db);
    profileRows.forEach((profile) => {
      batch.set(doc(db, "profileSummaries", profile.profileId), {
        name: profile.profileName,
        lastUsed: profile.lastUsed || null,
      });
    });
    await batch.commit();
  }, []);

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true);
    setProfilesError("");
    const summariesRef = collection(db, 'profileSummaries');
    const summariesQuery = query(summariesRef, orderBy('name'));

    try {
      const cachedSnapshot = await getDocsFromCache(summariesQuery);
      if (!cachedSnapshot.empty) {
        applyProfilesSnapshot(cachedSnapshot);
      }
    } catch {
      // Cache is optional; the server read below is the source of truth.
    }

    try {
      const summariesSnapshot = await getDocs(summariesQuery);
      if (!summariesSnapshot.empty) {
        applyProfilesSnapshot(summariesSnapshot);
        return;
      }

      const profilesSnapshot = await getDocs(collection(db, 'profiles'));
      const fullProfileRows = mapProfileSnapshot(profilesSnapshot);
      setProfiles(fullProfileRows);
      backfillProfileSummaries(fullProfileRows).catch((error) => {
        console.error('Error backfilling profile summaries:', error);
      });
    } catch (error) {
      console.error('Error fetching profiles:', error);
      setProfilesError("Could not load profiles.");
    } finally {
      setProfilesLoading(false);
    }
  }, [applyProfilesSnapshot, backfillProfileSummaries, mapProfileSnapshot]);

  const fetchUserStats = useCallback(async () => {
    setUserStatsLoading(true);
    setUserStatsError("");
    const userStatsQuery = query(collection(db, 'logs'), orderBy('createdAt', 'desc'), limit(500));
    const querySnapshot = await getDocs(userStatsQuery);
    const users = {};

    querySnapshot.docs.forEach((docSnap) => {
      const log = docSnap.data() || {};
      const userKey = log.userEmail || log.userId || 'Unknown user';
      const timestamp = toDate(log.createdAt || log.responseTimestamp);

      if (!users[userKey]) {
        users[userKey] = { userName: userKey, lastSeen: null, totalRuns: 0 };
      }

      users[userKey].totalRuns += 1;
      if (timestamp && (!users[userKey].lastSeen || timestamp > users[userKey].lastSeen)) {
        users[userKey].lastSeen = timestamp;
      }
    });

    const stats = Object.values(users).sort((a, b) => {
      const aTime = a.lastSeen?.getTime?.() || 0;
      const bTime = b.lastSeen?.getTime?.() || 0;
      return bTime - aTime;
    });

    setUserStats(stats);
    setUserStatsLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchRecentLogs = async () => {
      setRecentLogsLoading(true);
      setRecentLogsError("");
      const logsQuery = query(collection(db, 'logs'), orderBy('createdAt', 'desc'), limit(5));
      try {
        const cachedSnapshot = await getDocsFromCache(logsQuery);
        if (!cachedSnapshot.empty) {
          setRecentLogs(cachedSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        }
      } catch {
        // Cache is optional; the server read below is the source of truth.
      }
      const snapshot = await getDocs(logsQuery);
      setRecentLogs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      setRecentLogsLoading(false);
    };

    const loadDashboard = async () => {
      await fetchProfiles();
      if (cancelled) return;

      fetchUserStats().catch((error) => {
        console.error('Error fetching user stats:', error);
        setUserStatsError("Could not load user activity.");
        setUserStatsLoading(false);
      });

      fetchRecentLogs().catch((error) => {
        console.error('Error fetching recent logs:', error);
        setRecentLogsError("Could not load recent logs.");
        setRecentLogsLoading(false);
      });
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [fetchProfiles, fetchUserStats]);

  const addProfile = async () => {
    if (!newName.trim()) return;

    const newId = nanoid(10);
    await createStyleProfile(db, newId, newName);
    setNewName("");
    fetchProfiles();
  };

  const deleteProfile = async (id, name) => {
    const confirmed = window.confirm(`Are you sure you want to delete profile "${name}"?`);
    if (!confirmed) return;

    await Promise.all([
      deleteDoc(doc(db, "profiles", id)),
      deleteDoc(doc(db, "profileSummaries", id)),
    ]);
    fetchProfiles();
  };

  const duplicateProfile = async (originalId, originalName) => {
    const newName = prompt(`Enter a name for the duplicate of "${originalName}":`);
    if (!newName || !newName.trim()) return;

    try {
      const originalDocRef = doc(db, "profiles", originalId);
      const originalSnap = await getDoc(originalDocRef);
      const originalData = originalSnap.data();

      if (!originalData) {
        alert("Original profile not found.");
        return;
      }

      const newId = nanoid(10);
      const clonedData = { ...originalData };
      delete clonedData.name;

      await createStyleProfile(db, newId, newName.trim(), clonedData);
      fetchProfiles();
    } catch (error) {
      console.error("Error duplicating profile:", error);
      alert("Something went wrong duplicating the profile.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-4">Profiles</h2>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New profile name"
          className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={addProfile}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Add Profile
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-left">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Name</th>
              <th className="border border-gray-300 px-4 py-2">Profile ID</th>
              <th className="border border-gray-300 px-4 py-2">Last Used</th>
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profilesLoading && profiles.length === 0 ? (
              <tr>
                <td colSpan="4" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  Loading profiles...
                </td>
              </tr>
            ) : profilesError ? (
              <tr>
                <td colSpan="4" className="border border-gray-300 px-4 py-8 text-center text-red-600">
                  {profilesError}
                </td>
              </tr>
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan="4" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                  No profiles found.
                </td>
              </tr>
            ) : profiles.map(profile => (
              <tr key={profile.profileId} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">{profile.profileName}</td>
                <td className="border border-gray-300 px-4 py-2">{profile.profileId}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {profile.lastUsed
                    ? formatDistanceToNow(profile.lastUsed, { addSuffix: true })
                    : "Never used"}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/viewprofile?profileId=${profile.profileId}`)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => duplicateProfile(profile.profileId, profile.profileName)}
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => deleteProfile(profile.profileId, profile.profileName)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold">Users</h3>
        </div>

        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse border border-gray-300 text-left text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2">User name</th>
                <th className="border border-gray-300 px-4 py-2">Last seen</th>
                <th className="border border-gray-300 px-4 py-2">Total runs</th>
              </tr>
            </thead>
            <tbody>
              {userStatsLoading && userStats.length === 0 ? (
                <tr>
                  <td colSpan="3" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    Loading user activity...
                  </td>
                </tr>
              ) : userStatsError ? (
                <tr>
                  <td colSpan="3" className="border border-gray-300 px-4 py-8 text-center text-red-600">
                    {userStatsError}
                  </td>
                </tr>
              ) : userStats.length === 0 ? (
                <tr>
                  <td colSpan="3" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                    No user activity found.
                  </td>
                </tr>
              ) : (
                userStats.map((user) => (
                  <tr key={user.userName} className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-2 font-medium">{user.userName}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {user.lastSeen
                        ? formatDistanceToNow(user.lastSeen, { addSuffix: true })
                        : "Never seen"}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">{user.totalRuns}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-semibold">Recent Log Entries</h3>
          <button
            onClick={() => navigate('/logs')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            View All Logs
          </button>
        </div>

        <LogsTable
          logs={recentLogs}
          loading={recentLogsLoading}
          error={recentLogsError}
        />
      </div>
    </div>
  );
}
