//ViewProfile.jsx
import React, { useEffect, useState } from "react";
import { getDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import isEqual from "lodash.isequal";
import LogoUploader from "../components/LogoUploader";

import Tabs from "../components/Tabs";
import StylesEditor from "../components/StylesEditor";
import GroupPresetsEditor from "../components/GroupPresetsEditor";
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

  const savePdf = async (updatedPdf) => {
    const updatedProfile = {
      ...profile,
      PDF: updatedPdf,
    };
    setProfile(updatedProfile);
    const docRef = doc(db, "profiles", profileId);
    await updateDoc(docRef, {
      PDF: updatedPdf,
      lastUsed: serverTimestamp(),
    });
    setOriginalProfile(updatedProfile);
    console.log("✅ PDF saved to Firestore");
  };

  const handleSaveGroupPresets = async (updatedGroupPresets) => {
    const updatedProfile = {
      ...profile,
      groupPresets: updatedGroupPresets,
    };
    setProfile(updatedProfile);
    const docRef = doc(db, "profiles", profileId);
    await updateDoc(docRef, {
      groupPresets: updatedGroupPresets,
      lastUsed: serverTimestamp(),
    });
    setOriginalProfile(updatedProfile);
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
            label: "PDF",
            content: (
              <StylesEditor
                styles={pdf}
                onSave={savePdf}
              />
            ),
          },
          {
            label: "groupPresets",
            content: (
              <GroupPresetsEditor
                groupPresets={profile.groupPresets || []}
                onSave={handleSaveGroupPresets}
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
