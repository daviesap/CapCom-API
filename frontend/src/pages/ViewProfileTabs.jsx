// src/pages/ViewProfileTabs.jsx
import React, { useEffect, useState } from "react";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

import Tabs from "../components/Tabs";
import ProfileStylesViewer from "../components/ProfileStylesViewer";
import DocumentEditor from "../components/DocumentEditor";
import ColumnsEditor from "../components/ColumnsEditor";

export default function ViewProfileTabs({ profileId }) {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

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
      onEdit={(pathArray) => {
        console.log("Edit clicked for path:", pathArray);
        // Optional: open a modal or enable inline editing here
      }}
      onSave={async (updatedStyles) => {
        const updatedProfile = { ...profile, styles: updatedStyles };
        setProfile(updatedProfile);

        const docRef = doc(db, "styleProfiles", profileId);
        await updateDoc(docRef, { styles: updatedStyles });
        console.log("Styles saved to Firestore.");
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
        <button onClick={() => navigate("/")} style={{ padding: "0.75rem 1.5rem" }}>
          ← Back to Profile List
        </button>
      </div>
    </div>
  );
}