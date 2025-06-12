import React, { useState, useRef } from "react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage, db } from "../services/firebase";
import { doc, updateDoc } from "firebase/firestore";

export default function LogoUploader({ profile, setProfile, setOriginalProfile, profileId }) {
  const existingLogo = profile?.document?.header?.logo || {};
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [width, setWidth] = useState(existingLogo.width || "");
  const [height, setHeight] = useState(existingLogo.height || "");
  const fileInputRef = useRef();

  const handleUpload = () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    const filePath = `logos/${profileId}_${file.name}`;
    const fileRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setProgress(percent.toFixed(0));
      },
      (error) => {
        console.error("🔥 Upload error:", error);
        setUploading(false);
      },
      async () => {
        console.log("✅ Upload completed successfully");
        const url = await getDownloadURL(fileRef);
        setUploading(false);

        const updatedProfile = {
          ...profile,
          document: {
            ...profile.document,
            header: {
              ...(profile.document?.header || {}),
              logo: {
                url,
                width: Number(width),
                height: Number(height)
              }
            }
          }
        };

        setProfile(updatedProfile);
        setOriginalProfile(updatedProfile);

        const docRef = doc(db, "styleProfiles", profileId);
        await updateDoc(docRef, updatedProfile);
        console.log("✅ Logo saved to Firestore");
      }
    );
  };

  const handleRemove = async () => {
    const updatedProfile = {
      ...profile,
      document: {
        ...profile.document,
        header: {
          ...profile.document?.header,
          logo: null  // simply remove logo object
        }
      }
    };

    setProfile(updatedProfile);
    setOriginalProfile(updatedProfile);

    const docRef = doc(db, "styleProfiles", profileId);
    await updateDoc(docRef, updatedProfile);
    console.log("✅ Logo removed from Firestore");
  };

  return (
    <div className="space-y-6">

      <div>
        <label className="block mb-2 font-medium text-lg">Upload Logo</label>
        <div
          className="border border-dashed border-gray-400 rounded-md p-4 text-center cursor-pointer hover:bg-gray-50"
          onClick={() => fileInputRef.current.click()}
        >
          {file ? (
            <p>{file.name}</p>
          ) : (
            <p className="text-gray-500">{existingLogo?.url ? "Change Logo File" : "Click to select file"}</p>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <div className="flex gap-6">
        <div>
          <label className="block mb-1 font-medium">Width (px)</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Height (px)</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {uploading ? `Uploading... ${progress}%` : "Upload & Save"}
        </button>

        {existingLogo?.url && (
          <button
            onClick={handleRemove}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Remove Logo
          </button>
        )}
      </div>

      {existingLogo?.url && (
        <div className="mt-4">
          <p className="text-sm text-gray-700 mb-2">Preview:</p>
          <img src={existingLogo.url} alt="Logo" style={{ width: `${width}px`, height: `${height}px` }} />
        </div>
      )}
    </div>
  );
}