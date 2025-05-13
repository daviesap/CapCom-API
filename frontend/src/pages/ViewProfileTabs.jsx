// src/pages/ViewProfileTabs.jsx
import React, { useEffect, useState } from "react";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import isEqual from "lodash.isequal"; // for comparing JSON objects

import Tabs from "../components/Tabs";
import StylesEditor from "../components/StylesEditor"; // Renamed import
import DocumentEditor from "../components/DocumentEditor";
import ColumnsEditor from "../components/ColumnsEditor";

export default function ViewProfileTabs({ profileId }) {
  const [profile, setProfile] = useState(null); // editable version
  const [originalProfile, setOriginalProfile] = useState(null); // original copy
  const [editingStylePath, setEditingStylePath] = useState(null);
  const navigate = useNavigate();

  // Load profile from Firestore
  useEffect(() => {
    const loadProfile = async () => {
      const docRef = doc(db, "styleProfiles", profileId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setOriginalProfile(data);
      }
    };
    loadProfile();
  }, [profileId]);

  // Warn before navigating back if there are unsaved changes
  const handleBackClick = () => {
    if (!isEqual(profile, originalProfile)) {
      toast.info(
        ({ closeToast }) => (
          <div className="toast-warning-buttons">
            <button
              className="continue-btn"
              onClick={() => {
                closeToast();
                navigate("/");
              }}
            >
              Continue
            </button>
            <button
              className="cancel-btn"
              onClick={closeToast}
            >
              Cancel
            </button>
          </div>
        ),
        {
          autoClose: false,
          closeOnClick: false,
          draggable: false
        }
      );
    } else {
      navigate("/");
    }
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="tabs-wrapper">
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
        <h3>Editing:</h3><p>{profile.name}</p>
        <h3>Profile ID:</h3><p>{profileId}</p>
      </div>

      <Tabs
        tabs={[
          {
            label: "Styles",
            content: (
              <StylesEditor
                styles={profile.styles}
                editingStyle={
                  editingStylePath
                    ? editingStylePath.length === 2
                      ? profile.styles?.[editingStylePath[0]]?.[editingStylePath[1]]
                      : profile.styles?.[editingStylePath[0]]
                    : null
                }
                onEdit={(pathArray) => setEditingStylePath(pathArray)}
                onSave={async (updatedBlock) => {
                  if (!editingStylePath) return;

                  const [section, subKey] = editingStylePath;
                  const newStyles = { ...profile.styles };

                  if (subKey) {
                    newStyles[section] = {
                      ...newStyles[section],
                      [subKey]: updatedBlock
                    };
                  } else {
                    newStyles[section] = updatedBlock;
                  }

                  const updatedProfile = { ...profile, styles: newStyles };
                  setProfile(updatedProfile);
                  setEditingStylePath(null);

                  const docRef = doc(db, "styleProfiles", profileId);
                  await updateDoc(docRef, { styles: newStyles });

                  setOriginalProfile(updatedProfile);
                  console.log("✅ Style block saved to Firestore");
                }}
              />
            )
          },
          {
            label: "Document Styles",
            content: (
              <DocumentEditor
                documentData={profile.document}
                onChange={(updatedDoc) => {
                  const updatedProfile = { ...profile, document: updatedDoc };
                  setProfile(updatedProfile); // 👈 updates profile live
                }}
                onSave={async (updatedDocument) => {
                  const updatedProfile = { ...profile, document: updatedDocument };
                  setProfile(updatedProfile);

                  const docRef = doc(db, "styleProfiles", profileId);
                  await updateDoc(docRef, { document: updatedDocument });

                  setOriginalProfile(updatedProfile);
                  console.log("✅ Document saved");
                }}
              />
            )
          },
          {
            label: "Columns",
            content: (
              <ColumnsEditor
                columnsData={profile.columns}
                onChange={(updated) => {
                  setProfile((prev) => ({ ...prev, columns: updated }));
                }}
                onSave={async (updatedColumns) => {
                  const updatedProfile = { ...profile, columns: updatedColumns };
                  setProfile(updatedProfile);

                  const docRef = doc(db, "styleProfiles", profileId);
                  await updateDoc(docRef, { columns: updatedColumns });

                  setOriginalProfile(updatedProfile); // Update original reference for comparison
                  console.log("✅ Columns saved");
                }}
              />
            )
          }
        ]}
      />

      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button onClick={handleBackClick} className="back-button">
          ← Back to Profile List
        </button>

      </div>
    </div>
  );
}