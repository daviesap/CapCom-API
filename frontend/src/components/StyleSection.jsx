import React, { useState } from "react";

export default function StyleSection({ sectionKey, sectionData, onSave }) {
  const [localData, setLocalData] = useState(sectionData);

  const handleChange = (field, value, subKey = null) => {
    if (subKey) {
      setLocalData(prev => ({
        ...prev,
        [subKey]: {
          ...prev[subKey],
          [field]: value
        }
      }));
    } else {
      setLocalData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const isRowSection = sectionKey === 'row';

  const renderFields = (data, subKey = null) => (
    <div className="space-y-2">
      {Object.entries(data).map(([field, value]) => (
        <div key={field} className="flex items-center gap-4">
          <label className="w-40">{field}</label>
          {typeof value === 'number' ? (
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(field, parseInt(e.target.value), subKey)}
              className="border rounded px-2 py-1 w-24"
            />
          ) : field.toLowerCase().includes("colour") ? (
            <input
              type="color"
              value={value}
              onChange={(e) => handleChange(field, e.target.value, subKey)}
              className="w-16 h-10"
            />
          ) : (
            <select
              value={value}
              onChange={(e) => handleChange(field, e.target.value, subKey)}
              className="border rounded px-2 py-1"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="bolditalic">BoldItalic</option>
            </select>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="mt-4 space-y-4">
      {isRowSection ? (
        Object.entries(localData).map(([subKey, subData]) => (
          <div key={subKey} className="border rounded p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">{subKey}</h4>
            {renderFields(subData, subKey)}
          </div>
        ))
      ) : (
        renderFields(localData)
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={() => onSave(localData)}
          className="px-4 py-2 rounded bg-blue-500 text-white shadow"
        >
          Save
        </button>
      </div>
    </div>
  );
}