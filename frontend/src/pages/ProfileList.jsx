import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { nanoid } from 'nanoid';
import { createStyleProfile } from '../services/styleProfileService';
import { useNavigate } from 'react-router-dom';
import PdfCreationLog from '../components/PpdfCreationLog';

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
    <div>
      <h2>Profiles</h2>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New profile name"
        />
        <button onClick={addProfile} style={{ marginLeft: "0.5rem" }}>
          Add Profile
        </button>
      </div>

      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Profile ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map(profile => (
            <tr key={profile.profileId}>
              <td><strong>{profile.profileName}</strong></td>
              <td>{profile.profileId}</td>
              <td>
                <div className="action-buttons">
                  <button onClick={() => navigate(`/view?profileId=${profile.profileId}`)}>
                    View
                  </button>
                  <button
                    className="delete"
                    onClick={() => deleteProfile(profile.profileId, profile.profileName)}
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    <div>
      <PdfCreationLog />
    </div>
    </div>
    );
}