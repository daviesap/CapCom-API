// ColumnsEditor.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { formatDistanceToNow } from 'date-fns';

export default function ColumnsEditor({ columnsData, detectedFields = [], fieldsLastUpdated = null, onSave, onChange, pageWidth = 842, leftMargin = 50, rightMargin = 50, documentConfig = null }) {
  const [draft, setDraft] = useState(columnsData || []);

  useEffect(() => {
    setDraft(columnsData || []);
  }, [columnsData]);

  // Prefer dimensions from the provided JSON document (profile.document), fall back to props/defaults
  const resolvedPageWidth = Number(
    (documentConfig && documentConfig.pageSize && documentConfig.pageSize.width) != null
      ? documentConfig.pageSize.width
      : pageWidth
  ) || 0;
  const resolvedLeftMargin = Number(
    (documentConfig && documentConfig.leftMargin) != null
      ? documentConfig.leftMargin
      : leftMargin
  ) || 0;
  const resolvedRightMargin = Number(
    (documentConfig && documentConfig.rightMargin) != null
      ? documentConfig.rightMargin
      : rightMargin
  ) || 0;
  const availableWidth = Math.max(0, resolvedPageWidth - resolvedLeftMargin - resolvedRightMargin);

  // Live totals for current draft columns
  const totalColumnWidth = (draft || []).reduce((sum, c) => {
    const w = Number(c?.width);
    return sum + (Number.isFinite(w) ? w : 0);
  }, 0);
  const widthOverBy = Math.max(0, totalColumnWidth - availableWidth);
  const widthRemaining = Math.max(0, availableWidth - totalColumnWidth);
  const isOver = totalColumnWidth > availableWidth;

  const handleChange = (index, key, value) => {
    const updated = [...draft];
    updated[index] = { ...updated[index], [key]: value };
    setDraft(updated);
    if (onChange) onChange(updated);
  };

  const handleAddColumn = () => {
    const updated = [
      ...draft,
      {
        field: `Column ${draft.length + 1}`,
        label: `Label ${draft.length + 1}`,
        width: 50,
        showLabel: true,
      },
    ];
    setDraft(updated);
    if (onChange) onChange(updated);
  };

  const handleRemoveColumn = (index) => {
    const updated = [...draft];
    updated.splice(index, 1);
    setDraft(updated);
    if (onChange) onChange(updated);
  };

  return (

    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-4">Columns</h3>


      {fieldsLastUpdated && (
        <div className="mb-4">
          <p className="text-m text-black mb-2">
            Available fields:{" "}
            {detectedFields
              .slice() // make shallow copy so we don’t mutate original
              .sort((a, b) => a.localeCompare(b)) // sort alphabetically
              .map(field => field.charAt(0).toUpperCase() + field.slice(1)) // capitalise first letter
              .join(", ")}
          </p>
          <p className="text-sm text-gray-500">
            Last PDF was generated and field names updated{" "}
            {formatDistanceToNow(new Date(fieldsLastUpdated), { addSuffix: true })}
          </p>
        </div>
      )}


      {draft.map((col, i) => (
        <div
          key={i}
          className="flex flex-wrap gap-4 items-center mb-4 p-4 border border-gray-200 rounded"
        >
          <label className="flex flex-col flex-1 min-w-[150px]">
            <span className="text-sm font-medium">Field</span>

            {/* Dropdown populated from detectedFields */}
            <select
              value={col.field}
              onChange={(e) => handleChange(i, "field", e.target.value)}
              className="mt-1 px-3 py-1 border border-gray-300 rounded"
            >
              {detectedFields.map((fieldName) => (
                <option key={fieldName} value={fieldName}>{fieldName}</option>
              ))}
              {/* Allow keeping existing value if manually entered */}
              {!detectedFields.includes(col.field) && col.field && (
                <option value={col.field}>{col.field}</option>
              )}
            </select>

          </label>

          <label className="flex flex-col flex-1 min-w-[150px]">
            <span className="text-sm font-medium">Label</span>
            <input
              type="text"
              value={col.label}
              onChange={(e) => handleChange(i, "label", e.target.value)}
              className="mt-1 px-3 py-1 border border-gray-300 rounded"
            />
          </label>

          <label className="flex flex-col w-24">
            <span className="text-sm font-medium">Width</span>
            <input
              type="number"
              min="0"
              value={col.width ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                handleChange(i, "width", val === "" ? "" : parseInt(val, 10));
              }}
              className="mt-1 px-3 py-1 border border-gray-300 rounded"
            />
          </label>

          <label className="flex flex-col w-32">
            <span className="text-sm font-medium">Show Label</span>
            <input
              type="checkbox"
              checked={col.showLabel}
              onChange={(e) => handleChange(i, "showLabel", e.target.checked)}
              className="mt-2 h-5 w-5"
            />
          </label>

          <button
            onClick={() => handleRemoveColumn(i)}
            className="h-10 px-4 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Remove
          </button>
        </div>
      ))}

      <div className="mt-4 text-sm text-gray-700">
        <span className="font-medium">Available width:</span> {availableWidth} pt
        <span className="ml-2 text-gray-500">
          (page {resolvedPageWidth}pt − left margin {resolvedLeftMargin}pt − right margin {resolvedRightMargin}pt)
        </span>
      </div>
      <div className="mt-1 text-sm">
        <span className="font-medium">Total columns:</span>{" "}
        <span className={isOver ? "text-red-600 font-semibold" : "text-gray-800"}>
          {totalColumnWidth} pt
        </span>
        {!isOver ? (
          <span className="ml-2 text-gray-600">({widthRemaining} pt remaining)</span>
        ) : (
          <span className="ml-2 text-red-600">({widthOverBy} pt over)</span>
        )}
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={handleAddColumn}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Add Column
        </button>
        <button
          onClick={() => {
            onSave(draft);
            toast.success("Columns JSON saved!");
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save Column JSON
        </button>
      </div>
    </div>
  );
}