import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProfileStylesViewer from './ProfileStylesViewer';
import { useNavigate } from 'react-router-dom';

export default function ViewProfile({ profileId }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [editingStyle, setEditingStyle] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "styleProfiles", profileId));
      if (snap.exists()) {
        setProfileData(snap.data());
      }
    };
    fetchProfile();
  }, [profileId]);

  const handleStyleSave = async (styleKey, newData) => {
    const docRef = doc(db, "styleProfiles", profileId);
    const updatedStyles = { ...profileData.styles };

    if (styleKey.startsWith("row.")) {
      const rowKey = styleKey.split(".")[1];
      updatedStyles.row = {
        ...updatedStyles.row,
        [rowKey]: newData
      };
    } else {
      updatedStyles[styleKey] = newData;
    }

    await setDoc(docRef, { styles: updatedStyles }, { merge: true });
    setProfileData(prev => ({ ...prev, styles: updatedStyles }));
    setEditingStyle(null);
  };

  if (!profileData) return <p>Loading profile data...</p>;

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h2>Profile Viewer</h2>
      <p><strong>Profile ID:</strong> {profileId}</p>
      <p><strong>Profile Name:</strong> {profileData.name || "(unnamed)"}</p>

      <h3>Styles</h3>
      <ProfileStylesViewer
        styles={profileData.styles}
        onEdit={setEditingStyle}
        editingStyle={editingStyle}
        onSave={handleStyleSave}
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