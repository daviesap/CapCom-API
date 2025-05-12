// src/pages/ViewProfileTabs.jsx
import React, { useEffect, useState } from "react";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import Tabs from "../components/Tabs";
import ProfileStylesViewer from "../components/ProfileStylesViewer";
import DocumentEditor from "../components/DocumentEditor";
import ColumnsEditor from "../components/ColumnsEditor";




export default function ViewProfileTabs({ profileId }) {
  const [profile, setProfile] = useState(null);
  const [editingStylePath, setEditingStylePath] = useState(null);
  const navigate = useNavigate();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); //NOT FULLY USED YET - NEED TO ADD.

  const handleBackClick = () => {
  toast.info(
    ({ closeToast }) => (
      <div>
        <p><strong>Make sure you have saved your changes first.</strong></p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <button
            onClick={() => {
              closeToast();
              navigate("/");
            }}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Continue
          </button>
          <button
            onClick={closeToast}
            style={{
              backgroundColor: "#ccc",
              color: "#333",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: "none",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    ),
    {
      autoClose: false,
      closeOnClick: false,
      draggable: false
    }
  );
};

  useEffect(() => {
    const loadProfile = async () => {
      const docRef = doc(db, "styleProfiles", profileId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    };

    loadProfile();
  }, [profileId]);

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="tabs-wrapper">
      {/* Top section */}
      <h2>Editing: {profile.profileName}</h2>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Profile ID: <code>{profileId}</code>
      </p>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            label: "Styles",
            content: (
              <ProfileStylesViewer
                styles={profile.styles}
                editingStyle={
                  editingStylePath
                    ? editingStylePath.length === 2
                      ? profile.styles?.[editingStylePath[0]]?.[editingStylePath[1]]
                      : profile.styles?.[editingStylePath[0]]
                    : null
                }
                onEdit={(pathArray) => {
                  console.log("Edit clicked:", pathArray);
                  setEditingStylePath(pathArray);
                }}
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

                  setProfile((prev) => ({ ...prev, styles: newStyles }));
                  setEditingStylePath(null);

                  const docRef = doc(db, "styleProfiles", profileId);
                  await updateDoc(docRef, { styles: newStyles });
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
                onSave={async (updatedDocument) => {
                  const updatedProfile = { ...profile, document: updatedDocument };
                  setProfile(updatedProfile);
                  setHasUnsavedChanges(false);

                  const docRef = doc(db, "styleProfiles", profileId);
                  await updateDoc(docRef, { document: updatedDocument });
                  console.log("Document styles saved to Firestore.");
                }}
              />
            )
          },
          {
            label: "Columns",
            content: (
              <ColumnsEditor
                columnsData={profile.columns}
                onSave={async (updatedColumns) => {
                  const updatedProfile = { ...profile, columns: updatedColumns };
                  setProfile(updatedProfile);

                  // ✅ Save to Firestore
                  const docRef = doc(db, "styleProfiles", profileId);
                  await updateDoc(docRef, { columns: updatedColumns });
                  console.log("Columns saved to Firestore.");
                }}
              />
            )
          }
        ]}
      />

      {/* Bottom section */}
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <button onClick={handleBackClick} style={{ padding: "0.75rem 1.5rem" }}>
          ← Back to Profile List
        </button>
      </div>
    </div>
  );
}