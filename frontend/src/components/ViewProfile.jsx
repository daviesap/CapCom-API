import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProfileStylesViewer from './ProfileStylesViewer';
import { useNavigate } from 'react-router-dom';

export default function ViewProfile({ profileId }) {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [editingPath, setEditingPath] = useState(null); // e.g. ['row', 'default']
  const [previewStyle, setPreviewStyle] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const snap = await getDoc(doc(db, "styleProfiles", profileId));
      if (snap.exists()) {
        setProfileData(snap.data());
      }
    };
    fetchProfile();
  }, [profileId]);

  const handleStyleSave = async (newValue) => {
    if (!editingPath) return;

    const updatedStyles = { ...profileData.styles };

    if (editingPath.length === 1) {
      updatedStyles[editingPath[0]] = newValue;
    } else if (editingPath.length === 2) {
      updatedStyles[editingPath[0]] = {
        ...updatedStyles[editingPath[0]],
        [editingPath[1]]: newValue,
      };
    }

    const updatedProfile = { ...profileData, styles: updatedStyles };
    await updateDoc(doc(db, "styleProfiles", profileId), { styles: updatedStyles });

    setProfileData(updatedProfile);
    setEditingPath(null);
    setPreviewStyle(null);
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
        editingStyle={
          editingPath
            ? editingPath.length === 1
              ? profileData.styles?.[editingPath[0]]
              : profileData.styles?.[editingPath[0]]?.[editingPath[1]]
            : null
        }
        onEdit={(pathArray) => {
          setEditingPath(pathArray);
          const [k1, k2] = pathArray;
          const style =
            pathArray.length === 1
              ? profileData.styles?.[k1]
              : profileData.styles?.[k1]?.[k2];
          setPreviewStyle(style);
        }}
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