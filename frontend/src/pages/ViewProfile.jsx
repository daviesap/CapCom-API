//ViewProfile.jsx
import React, { useEffect, useState } from "react";
import { getDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import isEqual from "lodash.isequal";
import LogoUploader from "../components/LogoUploader";

import Tabs from "../components/Tabs";
import StyleBoxList from "../components/StyleBoxList";
import DocumentEditor from "../components/DocumentEditor";
import ColumnsEditor from "../components/ColumnsEditor";
import JSONdisplay from "../components/JSONDisplay";

function getPdfConfig(profile = {}) {
  const pdf = (profile?.PDF && typeof profile.PDF === "object") ? profile.PDF : {};
  return {
    styles: pdf.styles || profile.styles || {},
    document: pdf.document || profile.document || {},
    columns: pdf.columns || profile.columns || [],
  };
}

export default function ViewProfile({ profileId }) {
  const [profile, setProfile] = useState(null);
  const [originalProfile, setOriginalProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProfile = async () => {
      const docRef = doc(db, "profiles", profileId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setOriginalProfile(data);
        await updateDoc(docRef, { lastUsed: serverTimestamp() });
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

  // 🔧 Generalized save function for any section
  const saveSection = async (field, updatedValue) => {
    const updatedProfile = {
      ...profile,
      PDF: {
        ...(profile.PDF || {}),
        [field]: updatedValue,
      },
    };
    setProfile(updatedProfile);
    const docRef = doc(db, "profiles", profileId);
    await updateDoc(docRef, {
      [`PDF.${field}`]: updatedValue,
      lastUsed: serverTimestamp(),
    });
    setOriginalProfile(updatedProfile);
    console.log(`✅ ${field} saved to Firestore`);
  };

  // 🔧 Slightly simplified Style save (still fully safe)
  const handleSaveSection = async (sectionKey, updatedData) => {
    const { styles } = getPdfConfig(profile);
    const newStyles = { ...styles, [sectionKey]: updatedData };
    await saveSection("styles", newStyles);
  };

  const handleSaveJson = async (updatedProfile) => {
    setProfile(updatedProfile);
    const docRef = doc(db, "profiles", profileId);
    await updateDoc(docRef, {
      ...updatedProfile,
      lastUsed: serverTimestamp(),
    });
    setOriginalProfile(updatedProfile);
  };

  if (!profile) return <p className="text-center mt-8 text-gray-500">Loading...</p>;
  const pdf = getPdfConfig(profile);

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
                styles={pdf.styles}
                onSaveSection={handleSaveSection}
              />
            ),
          },
          {
            label: "Document Styles",
            content: (
              <DocumentEditor
                documentData={pdf.document}
                onChange={(updatedDoc) => {
                  const updatedProfile = {
                    ...profile,
                    PDF: {
                      ...(profile.PDF || {}),
                      document: updatedDoc,
                    },
                  };
                  setProfile(updatedProfile);
                }}
                onSave={(updatedDocument) => saveSection("document", updatedDocument)}
              />
            ),
          },
          // {
          //   label: "Columns",
          //   content: (
          //     <ColumnsEditor
          //       columnsData={pdf.columns}
          //       detectedFields={profile.detectedFields || []}
          //       fieldsLastUpdated={profile.fieldsLastUpdated || null}
          //       documentConfig={pdf.document}
          //       onChange={(updated) => {
          //         setProfile((prev) => ({
          //           ...prev,
          //           PDF: {
          //             ...(prev.PDF || {}),
          //             columns: updated,
          //           },
          //         }));
          //       }}
          //       onSave={(updatedColumns) => saveSection("columns", updatedColumns)}
          //     />
          //   )
          // },
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
              <JSONdisplay jsonData={profile} onSaveJson={handleSaveJson} />
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
