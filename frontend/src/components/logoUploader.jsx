// src/components/LogoUploader.jsx

import React, { useState } from "react";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../services/firebase";

export default function LogoUploader({ logoData, onChange, onSave }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [width, setWidth] = useState(logoData?.width || "");
  const [height, setHeight] = useState(logoData?.height || "");

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);

    try {
      const fileRef = ref(storage, `logos/${Date.now()}_${file.name}`);
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
          try {
            const url = await getDownloadURL(fileRef);
            console.log("✅ Download URL generated:", url);
            setUploading(false);
            onChange({ url, width, height });

            if (onSave) {
              onSave({ url, width, height });
            }
          } catch (urlError) {
            console.error("🔥 Error getting download URL:", urlError);
            setUploading(false);
          }
        }
      );
    } catch (outerError) {
      console.error("🔥 Outer error during upload setup:", outerError);
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block mb-1 font-medium">Upload Logo</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      </div>

      <div className="flex gap-4">
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

      <button
        onClick={handleUpload}
        disabled={uploading || !file}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {uploading ? `Uploading... ${progress}%` : "Upload & Save"}
      </button>

      {logoData?.url && (
        <div className="mt-4">
          <p className="text-sm text-gray-700">Preview:</p>
          <img src={logoData.url} alt="Logo" style={{ width: `${width}px`, height: `${height}px` }} />
        </div>
      )}
    </div>
  );
}