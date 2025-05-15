//DocumentEditor.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function DocumentStylesEditor({ documentData, onSave, onChange }) {
  const [draft, setDraft] = useState(documentData || {});

  useEffect(() => {
    setDraft(documentData || {});
  }, [documentData]);

  const updateValue = (key, subKey, value) => {
    const updated = { ...draft };

    if (subKey) {
      updated[key] = {
        ...(draft[key] || {}),
        [subKey]: value,
      };
    } else {
      updated[key] = value;
    }

    setDraft(updated);
    if (onChange) onChange(updated);
  };

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Document Styles</h3>
      <div className="overflow-x-auto">
        <table className="w-full max-w-2xl border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Field</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Value</th>
            </tr>
          </thead>
          <tbody>
            {/* Page Size */}
            <tr>
              <td rowSpan="2" className="border border-gray-300 px-4 py-2 align-top">Page Size</td>
              <td className="border border-gray-300 px-4 py-2">Width</td>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="number"
                  value={draft.pageSize?.width || 0}
                  onChange={(e) => updateValue("pageSize", "width", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Height</td>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="number"
                  value={draft.pageSize?.height || 0}
                  onChange={(e) => updateValue("pageSize", "height", parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </td>
            </tr>

            {/* Margins */}
            {["Top", "Left", "Bottom", "Right"].map((pos, idx) => (
              <tr key={pos}>
                {idx === 0 && (
                  <td rowSpan="4" className="border border-gray-300 px-4 py-2 align-top">Margins</td>
                )}
                <td className="border border-gray-300 px-4 py-2">{pos}</td>
                <td className="border border-gray-300 px-4 py-2">
                  <input
                    type="number"
                    value={draft[`${pos.toLowerCase()}Margin`] || 0}
                    onChange={(e) =>
                      updateValue(`${pos.toLowerCase()}Margin`, null, parseFloat(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1"
                  />
                </td>
              </tr>
            ))}

            {/* Others */}
            <tr>
              <td rowSpan="2" className="border border-gray-300 px-4 py-2 align-top">Other</td>
              <td className="border border-gray-300 px-4 py-2">Group Padding Bottom</td>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="number"
                  value={draft.groupPaddingBottom || 0}
                  onChange={(e) => updateValue("groupPaddingBottom", null, parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 px-4 py-2">Bottom Page Threshold</td>
              <td className="border border-gray-300 px-4 py-2">
                <input
                  type="number"
                  value={draft.bottomPageThreshold || 0}
                  onChange={(e) => updateValue("bottomPageThreshold", null, parseFloat(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded px-2 py-1"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={() => {
          onSave(draft);
          toast.success("Document JSON saved!");
        }}
        className="mt-6 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      >
        Save Document JSON
      </button>
    </div>
  );
}