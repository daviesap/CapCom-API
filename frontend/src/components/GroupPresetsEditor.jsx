import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

const DEFAULT_PRESET = {
  id: "",
  label: "",
  dataset: "scheduleDetail",
  groupBy: "date",
  groupMetaData: "dates",
  filterGroupField: "",
  groupSort: ["date:asc"],
  entrySort: ["time:asc", "description:asc"],
  columns: [],
};

const DEFAULT_COLUMN = {
  label: "",
  showLabel: true,
  field: "",
  width: 100,
  filterable: false,
};

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function GroupPresetsEditor({ groupPresets = [], onSave }) {
  const [draft, setDraft] = useState(groupPresets);

  useEffect(() => {
    setDraft(Array.isArray(groupPresets) ? groupPresets : []);
  }, [groupPresets]);

  const updatePreset = (index, key, value) => {
    setDraft((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const updateColumn = (presetIndex, columnIndex, key, value) => {
    setDraft((prev) => {
      const next = [...prev];
      const preset = { ...(next[presetIndex] || DEFAULT_PRESET) };
      const columns = Array.isArray(preset.columns) ? [...preset.columns] : [];
      columns[columnIndex] = { ...columns[columnIndex], [key]: value };
      preset.columns = columns;
      next[presetIndex] = preset;
      return next;
    });
  };

  const addPreset = () => {
    setDraft((prev) => [
      ...prev,
      {
        ...DEFAULT_PRESET,
        id: `preset-${prev.length + 1}`,
        label: `Preset ${prev.length + 1}`,
      },
    ]);
  };

  const removePreset = (index) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const addColumn = (presetIndex) => {
    setDraft((prev) => {
      const next = [...prev];
      const preset = { ...(next[presetIndex] || DEFAULT_PRESET) };
      const columns = Array.isArray(preset.columns) ? [...preset.columns] : [];
      columns.push({
        ...DEFAULT_COLUMN,
        label: `Column ${columns.length + 1}`,
        field: `field${columns.length + 1}`,
      });
      preset.columns = columns;
      next[presetIndex] = preset;
      return next;
    });
  };

  const removeColumn = (presetIndex, columnIndex) => {
    setDraft((prev) => {
      const next = [...prev];
      const preset = { ...(next[presetIndex] || DEFAULT_PRESET) };
      preset.columns = (preset.columns || []).filter((_, i) => i !== columnIndex);
      next[presetIndex] = preset;
      return next;
    });
  };

  const handleSave = async () => {
    await onSave?.(draft);
    toast.success("Group presets saved!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">groupPresets</h3>
          <p className="text-sm text-gray-600">Manage preset metadata, sorting rules, and column definitions.</p>
        </div>
        <button
          type="button"
          onClick={addPreset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Add Preset
        </button>
      </div>

      {draft.length === 0 ? (
        <div className="rounded border border-dashed border-gray-300 px-4 py-8 text-center text-gray-500">
          No presets configured.
        </div>
      ) : null}

      {draft.map((preset, presetIndex) => (
        <section key={presetIndex} className="rounded border border-gray-300 bg-white p-4 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="text-lg font-semibold">{preset.label || `Preset ${presetIndex + 1}`}</h4>
              <p className="text-sm text-gray-500">{preset.id || "No preset id"}</p>
            </div>
            <button
              type="button"
              onClick={() => removePreset(presetIndex)}
              className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Remove Preset
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              Preset ID
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={preset.id || ""}
                onChange={(e) => updatePreset(presetIndex, "id", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Label
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={preset.label || ""}
                onChange={(e) => updatePreset(presetIndex, "label", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Dataset
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={preset.dataset || ""}
                onChange={(e) => updatePreset(presetIndex, "dataset", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Group By
              <select
                className="mt-1 w-full border rounded p-2"
                value={preset.groupBy || "date"}
                onChange={(e) => updatePreset(presetIndex, "groupBy", e.target.value)}
              >
                <option value="date">date</option>
                <option value="tagId">tagId</option>
                <option value="locationId">locationId</option>
                <option value="truckId">truckId</option>
              </select>
            </label>
            <label className="block text-sm">
              groupMetaData
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={preset.groupMetaData || ""}
                onChange={(e) => updatePreset(presetIndex, "groupMetaData", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              filterGroupField
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={preset.filterGroupField || ""}
                onChange={(e) => updatePreset(presetIndex, "filterGroupField", e.target.value)}
              />
            </label>
            <label className="block text-sm">
              groupSort
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={Array.isArray(preset.groupSort) ? preset.groupSort.join(", ") : ""}
                onChange={(e) => updatePreset(presetIndex, "groupSort", parseList(e.target.value))}
                placeholder="date:asc, tagName:asc"
              />
            </label>
            <label className="block text-sm md:col-span-2">
              entrySort
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={Array.isArray(preset.entrySort) ? preset.entrySort.join(", ") : ""}
                onChange={(e) => updatePreset(presetIndex, "entrySort", parseList(e.target.value))}
                placeholder="time:asc, description:asc"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-base font-semibold">Columns</h5>
              <button
                type="button"
                onClick={() => addColumn(presetIndex)}
                className="px-3 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 transition"
              >
                Add Column
              </button>
            </div>

            {(preset.columns || []).map((column, columnIndex) => (
              <div key={columnIndex} className="grid gap-3 rounded border border-gray-200 p-3 md:grid-cols-6">
                <label className="block text-sm md:col-span-1">
                  Label
                  <input
                    className="mt-1 w-full border rounded p-2"
                    type="text"
                    value={column.label || ""}
                    onChange={(e) => updateColumn(presetIndex, columnIndex, "label", e.target.value)}
                  />
                </label>
                <label className="block text-sm md:col-span-1">
                  Field
                  <input
                    className="mt-1 w-full border rounded p-2"
                    type="text"
                    value={column.field || ""}
                    onChange={(e) => updateColumn(presetIndex, columnIndex, "field", e.target.value)}
                  />
                </label>
                <label className="block text-sm md:col-span-1">
                  Width
                  <input
                    className="mt-1 w-full border rounded p-2"
                    type="number"
                    value={column.width ?? ""}
                    onChange={(e) => updateColumn(presetIndex, columnIndex, "width", Number(e.target.value))}
                  />
                </label>
                <label className="flex items-center gap-2 text-sm md:col-span-1 md:mt-7">
                  <input
                    type="checkbox"
                    checked={column.showLabel !== false}
                    onChange={(e) => updateColumn(presetIndex, columnIndex, "showLabel", e.target.checked)}
                  />
                  Show Label
                </label>
                <label className="flex items-center gap-2 text-sm md:col-span-1 md:mt-7">
                  <input
                    type="checkbox"
                    checked={column.filterable === true}
                    onChange={(e) => updateColumn(presetIndex, columnIndex, "filterable", e.target.checked)}
                  />
                  Filterable
                </label>
                <div className="md:col-span-1 md:mt-6">
                  <button
                    type="button"
                    onClick={() => removeColumn(presetIndex, columnIndex)}
                    className="w-full px-3 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {(preset.columns || []).length === 0 ? (
              <div className="rounded border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
                No columns defined for this preset.
              </div>
            ) : null}
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Save groupPresets
        </button>
      </div>
    </div>
  );
}
