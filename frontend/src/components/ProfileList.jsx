import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';

export default function ProfileList() {
  const [profiles, setProfiles] = useState([]);
  const [newName, setNewName] = useState("");

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

    await setDoc(doc(db, "styleProfiles", newId), {
      name: newName,
      styles: {
        title: {
          fontSize: 12,
          fontStyle: "bold",
          backgroundColour: "#FFFFFF",
          paddingBottom: 0,
          fontColour: "#000000"
        },
        metadata: {
          fontSize: 11,
          fontStyle: "normal",
          backgroundColour: "#FFFFFF",
          paddingBottom: 12,
          fontColour: "#000000"
        },
        labelRow: {
          fontSize: 11,
          fontStyle: "bold",
          backgroundColour: "#FFFFFF",
          fontColour: "#000000"
        },
        row: {
          default: {
            fontSize: 10,
            fontStyle: "italic",
            backgroundColour: "#FFFFFF",
            fontColour: "#000000"
          },
          highlight: {
            fontSize: 10,
            fontStyle: "italic",
            backgroundColour: "#FFFF00",
            fontColour: "#000000"
          },
          lowlight: {
            fontSize: 10,
            fontStyle: "normal",
            backgroundColour: "#FFFFFF",
            fontColour: "#000000"
          }
        }
      }
    });

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
                <button
                  onClick={() => window.open(`/view?profileId=${profile.profileId}`, '_blank')}
                  style={{ marginRight: "0.5rem" }}
                >
                  View
                </button>
                <button
                  onClick={() => deleteProfile(profile.profileId, profile.profileName)}
                  style={{ color: "red" }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}