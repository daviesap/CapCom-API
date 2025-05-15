import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { nanoid } from 'nanoid';
import { createStyleProfile } from '../services/styleProfileService';
import { useNavigate } from 'react-router-dom';
import PdfCreationLog from '../components/pdfCreationLog';

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [newName, setNewName] = useState("");

  const navigate = useNavigate();

  const fetchProfiles = async () => {
    const querySnapshot = await getDocs(collection(db, 'styleProfiles'));
    const data = querySnapshot.docs.map(doc => ({
      profileId: doc.id,
      profileName: doc.data().name || "(Unnamed Profile)"
    }));
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
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
              <th className="border border-gray-300 px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map(profile => (
              <tr key={profile.profileId} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">{profile.profileName}</td>
                <td className="border border-gray-300 px-4 py-2">{profile.profileId}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/viewprofile?profileId=${profile.profileId}`)}
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition"
                    >
                      View
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

      <div className="mt-6">
        <PdfCreationLog />
      </div>
    </div>
  );
}