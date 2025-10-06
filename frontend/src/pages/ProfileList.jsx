import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { nanoid } from 'nanoid';
import { createStyleProfile } from '../services/styleProfileService';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [newName, setNewName] = useState("");

  const navigate = useNavigate();

  const fetchProfiles = async () => {
    const querySnapshot = await getDocs(collection(db, 'styleProfiles'));

    const data = querySnapshot.docs.map((docSnap) => {
      const profileId = docSnap.id;
      const docData = docSnap.data() || {};
      const profileName = docData.name || "(Unnamed Profile)";

      let lastUsed = null;
      const rawLastUsed = docData.lastUsed;
      if (rawLastUsed) {
        if (typeof rawLastUsed.toDate === 'function') {
          lastUsed = rawLastUsed.toDate();
        } else if (rawLastUsed instanceof Date) {
          lastUsed = rawLastUsed;
        } else {
          const parsed = new Date(rawLastUsed);
          if (!Number.isNaN(parsed.getTime())) {
            lastUsed = parsed;
          }
        }
      }

      return {
        profileId,
        profileName,
        lastUsed,
      };
    });

    setProfiles(data);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

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

    await deleteDoc(doc(db, "styleProfiles", id));
    fetchProfiles();
  };

  const duplicateProfile = async (originalId, originalName) => {
    const newName = prompt(`Enter a name for the duplicate of "${originalName}":`);
    if (!newName || !newName.trim()) return;

    try {
      const originalDocRef = doc(db, "styleProfiles", originalId);
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
            {profiles.map(profile => (
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
    </div>
  );
}
