import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

export default function StyleBox({ styleKey, styleData, pathArray, editingStyle, onEdit, onSave }) {
  const isEditing = Array.isArray(editingStyle) && Array.isArray(pathArray)
    ? JSON.stringify(editingStyle) === JSON.stringify(pathArray)
    : false;

  const [draft, setDraft] = useState(styleData);

  const wasEditingRef = useRef(isEditing);
  useEffect(() => {
    // Only reset draft when we transition into editing
    if (!wasEditingRef.current && isEditing) {
      setDraft(styleData);
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, styleData]);

  const previewSource = isEditing ? draft : styleData;

  const sampleStyle = {
    backgroundColor: previewSource.backgroundColour || "#fff",
    color: previewSource.fontColour || previewSource.colour || "#000",
    fontSize: `${previewSource.fontSize || 12}px`,
    ...(previewSource.fontStyle?.toLowerCase().includes("italic")
      ? { fontStyle: "italic" }
      : { fontStyle: "normal" }),
    ...(previewSource.fontStyle?.toLowerCase().includes("bold")
      ? { fontWeight: "bold" }
      : { fontWeight: "normal" }),
  };

  const isColorKey = (key) => /color|colour|background/i.test(key);
  const isFontStyleKey = (key) => key === "fontStyle";

  return (
    <div
      key={pathArray.join(".")}
      className="border border-gray-300 rounded p-4 mb-4 shadow-sm bg-gray-50"
    >
      <div className="mb-2">
        <strong className="block text-lg mb-1">{styleKey}</strong>
        <pre className="whitespace-pre-wrap break-words text-sm text-gray-700 p-2 rounded">
          {Object.entries(isEditing ? draft : styleData)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
        </pre>
      </div>

      <div
        className="inline-block px-4 py-2 rounded mb-4 border border-gray-300"
        style={sampleStyle}
      >
        Sample
      </div>

      <div className="space-y-3">
        {isEditing ? (
          <>
            {Object.entries(draft).map(([key, value]) => {
              const isColor = isColorKey(key);
              const isFontStyle = isFontStyleKey(key);
              const isNumeric = typeof value === "number";

              let colorValue = "#000000";
              if (
                typeof value === "string" &&
                value.startsWith("#") &&
                (value.length === 7 || value.length === 4)
              ) {
                colorValue = value;
              }

              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700">
                    {key}:
                    {isFontStyle ? (
                      <select
                        value={draft.fontStyle || "normal"}
                        onChange={(e) =>
                          setDraft({ ...draft, fontStyle: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="normal">normal</option>
                        <option value="bold">bold</option>
                        <option value="italic">italic</option>
                        <option value="bold-italic">bold-italic</option>
                      </select>
                    ) : isColor ? (
                      <input
                        type="color"
                        value={colorValue}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                        className="mt-1 h-8 w-12 border rounded"
                      />
                    ) : isNumeric ? (
                      <input
                        type="number"
                        value={value}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          setDraft({ ...draft, [key]: Number.isFinite(n) ? n : draft[key] });
                        }}
                        className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                        className="mt-1 block w-full border border-gray-300 rounded px-2 py-1"
                      />
                    )}
                  </label>
                </div>
              );
            })}

            <div className="flex gap-4 mt-4">
              <button
                onClick={() => {
                  try {
                    // Provide both args: parents that only accept one will ignore the extra.
                    onSave(pathArray, draft);
                    toast.success("Style saved!");
                    onEdit(null);
                  } catch (e) {
                    // Fallback for parents that expect a single argument
                    try {
                      onSave(draft);
                      toast.success("Style saved!");
                      onEdit(null);
                    } catch (err2) {
                      toast.error("Save failed. Check console.");
                      console.error("Save handler threw on primary:", e, "and fallback also failed:", err2);
                    }
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                Save JSON
              </button>
              <button
                onClick={() => onEdit(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => onEdit(pathArray)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}