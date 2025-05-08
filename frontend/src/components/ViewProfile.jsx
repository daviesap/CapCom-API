import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProfileStylesViewer from './ProfileStylesViewer';
import { useNavigate } from 'react-router-dom';

export default function ViewProfile({ profileId }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [editingStyleKey, setEditingStyleKey] = useState(null);
  const [styleDraft, setStyleDraft] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "styleProfiles", profileId));
      if (snap.exists()) {
        setProfileData(snap.data());
        setStyleDraft(snap.data().styles || {});
      }
    };
    fetchProfile();
  }, [profileId]);

  const handleEdit = (key, value) => {
    setEditingStyleKey(key);
    setStyleDraft((prev) => {
      const updated = { ...prev };
      if (key.includes('.')) {
        const [mainKey, subKey] = key.split('.');
        updated[mainKey][subKey] = value;
      } else {
        updated[key] = value;
      }
      return updated;
    });
  };

  const handleSave = async (key) => {
    setEditingStyleKey(null);
    await updateDoc(doc(db, "styleProfiles", profileId), { styles: styleDraft });
  };

  if (!profileData) return <p>Loading profile data...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Profile Viewer</h2>
      <p><strong>Profile ID:</strong> {profileId}</p>
      <p><strong>Profile Name:</strong> {profileData.name || "(unnamed)"}</p>

      <ProfileStylesViewer
        styles={styleDraft}
        editingStyle={editingStyleKey}
        onEdit={handleEdit}
        onSave={handleSave}
      />

      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: "2rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }}
      >
        ← Back to Home
      </button>
    </div>
  );
}