import React, { useEffect, useState } from "react";
import { getDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import isEqual from "lodash.isequal";
import LogoUploader from "../components/LogoUploader";

import Tabs from "../components/Tabs";
import StylesEditor from "../components/StylesEditor";
import StyleBoxList from "../components/StyleBoxList";
import DocumentEditor from "../components/DocumentEditor";
import ColumnsEditor from "../components/ColumnsEditor";
import JSONdisplay from "../components/JSONDisplay";

export default function ViewProfile({ profileId }) {
  const [profile, setProfile] = useState(null);
  const [originalProfile, setOriginalProfile] = useState(null);
  const [editingStylePath, setEditingStylePath] = useState(null);
  const navigate = useNavigate();

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

  const handleBackClick = () => {
    if (!isEqual(profile, originalProfile)) {
      toast.info(
        ({ closeToast }) => (
          <div className="flex flex-col gap-2">
            <p className="font-medium">You have unsaved changes.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  closeToast();
                  navigate("/");
                }}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
              >
                Continue
              </button>
              <button
                onClick={closeToast}
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ),
        {
          autoClose: false,
          closeOnClick: false,
          draggable: false,
        }
      );
    } else {
      navigate("/");
    }
  };

  const handleSaveSection = async (sectionKey, updatedData) => {
    const newStyles = {
      ...profile.styles,
      [sectionKey]: updatedData
    };

    const updatedProfile = {
      ...profile,
      styles: newStyles
    };

    setProfile(updatedProfile);

    const docRef = doc(db, "styleProfiles", profileId);
    await updateDoc(docRef, { styles: newStyles });

    setOriginalProfile(updatedProfile);
    console.log("✅ Style section saved to Firestore");
  };

  if (!profile) return <p className="text-center mt-8 text-gray-500">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex flex-wrap gap-4 items-center mb-6">
        <h3 className="text-lg font-semibold">Editing:</h3>
        <p className="text-base">{profile.name}</p>
        <h3 className="text-lg font-semibold">Profile ID:</h3>
        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{profileId}</code>
      </div>

      <Tabs
        tabs={[
          {
            label: "Styles",
            content: (
              <StyleBoxList
                styles={profile.styles}
                onSaveSection={handleSaveSection}
              />
            ),
          },
          {
            label: "Document Styles",
            content: (
              <DocumentEditor
                documentData={profile.document}
                onChange={(updatedDoc) => {
                  const updatedProfile = { ...profile, document: updatedDoc };
                  setProfile(updatedProfile);
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
            ),
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

                  setOriginalProfile(updatedProfile);
                  console.log("✅ Columns saved");
                }}
              />
            ),
          },
          {
            label: "Logo",
            content: (
              <LogoUploader
                profile={profile}
                setProfile={setProfile}
                setOriginalProfile={setOriginalProfile}
                profileId={profileId}
              />
            )
          },
          {
            label: "JSON",
            content: (
              <JSONdisplay jsonData={profile} />
            ),
          },
        ]}
      />

      <div className="text-center mt-10">
        <button
          onClick={handleBackClick}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          ← Back to Profile List
        </button>
      </div>
    </div>
  );
}