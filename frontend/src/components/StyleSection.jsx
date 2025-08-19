import React, { useEffect, useState } from "react";

// This editor supports both simple style sections (header, footer, etc.)
// and the special `row` section with nested variants + structured fields.
// For `row` we enforce order: Default, Important, New, Past and expose:
// fontSize, fontStyle, fontColour, gutterColour, lineSpacing,
// underline { enabled, width, thickness, colour },
// badge { enabled, text }.

export default function StyleSection({ sectionKey, sectionData, onSave }) {
  const [localData, setLocalData] = useState(sectionData || {});

  // Keep local state in sync if parent replaces sectionData
  useEffect(() => {
    setLocalData(sectionData || {});
  }, [sectionData]);

  // --- generic nested setter -------------------------------------------------
  const setByPath = (obj, path, value) => {
    const parts = path.split(".");
    const next = Array.isArray(obj) ? [...obj] : { ...obj };
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      cur[k] = cur[k] && typeof cur[k] === "object" ? { ...cur[k] } : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = value;
    return next;
  };

  const handleChange = (path, value) => {
    setLocalData(prev => setByPath(prev, path, value));
  };

  const number = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  // --- non-row generic renderer (backward compatible) -----------------------
  const renderFlatFields = (data) => (
    <div className="space-y-2">
      {Object.entries(data).map(([field, value]) => (
        <div key={field} className="flex items-center gap-4">
          <label className="w-48 capitalize">{field}</label>
          {typeof value === "number" ? (
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(field, number(e.target.value, value))}
              className="border rounded px-2 py-1 w-28"
            />
          ) : typeof value === "boolean" ? (
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleChange(field, e.target.checked)}
            />
          ) : /colour/i.test(field) ? (
            <input
              type="color"
              value={value}
              onChange={(e) => handleChange(field, e.target.value)}
              className="w-16 h-10"
            />
          ) : (
            <input
              type="text"
              value={String(value)}
              onChange={(e) => handleChange(field, e.target.value)}
              className="border rounded px-2 py-1 w-64"
            />
          )}
        </div>
      ))}
    </div>
  );

  // --- row variant renderer --------------------------------------------------
  const VARIANT_ORDER = ["default", "important", "new", "past"];

  const renderRowVariantEditor = (variantKey, variantData = {}) => {
    // Normalise fields to the exact shape we edit
    const v = {
      fontSize: variantData.fontSize ?? 10,
      fontStyle: variantData.fontStyle || "normal",
      fontColour: variantData.fontColour || "#000000",
      gutterColour: variantData.gutterColour || variantData.fontColour || "#000000",
      underline: {
        enabled: variantData.underline?.enabled !== false,
        width: typeof variantData.underline?.width === "number" ? variantData.underline.width : 50,
        thickness: typeof variantData.underline?.thickness === "number" ? variantData.underline.thickness : 0.75,
        colour: variantData.underline?.colour || variantData.fontColour || "#000000",
      },
      badge: {
        enabled: variantData.badge?.enabled === true,
        text: variantData.badge?.text || "",
      },
    };

    const base = `${variantKey}`;

    return (
      <div key={variantKey} className="border rounded p-4 bg-gray-50 space-y-4">
        <h4 className="font-semibold mb-1 capitalize">{variantKey}</h4>

        {/* 1) Font */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block text-sm">Font size
            <input
              type="number"
              className="mt-1 w-full border rounded p-2"
              value={v.fontSize}
              onChange={(e) => handleChange(`${base}.fontSize`, number(e.target.value, 10))}
            />
          </label>

          <label className="block text-sm">Font style
            <select
              className="mt-1 w-full border rounded p-2"
              value={v.fontStyle}
              onChange={(e) => handleChange(`${base}.fontStyle`, e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
            </select>
          </label>
        </div>

        {/* 2) Colours */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block text-sm">Font colour
            <input
              type="color"
              className="mt-1 w-16 h-10"
              value={v.fontColour}
              onChange={(e) => handleChange(`${base}.fontColour`, e.target.value)}
            />
          </label>

          <label className="block text-sm">Gutter colour
            <input
              type="color"
              className="mt-1 w-16 h-10"
              value={v.gutterColour}
              onChange={(e) => handleChange(`${base}.gutterColour`, e.target.value)}
            />
          </label>
        </div>

        {/* 3) Underline */}
        <fieldset className="border rounded p-3">
          <legend className="text-sm font-medium">Underline</legend>
          <div className="flex items-center gap-3 mb-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.underline.enabled}
                onChange={(e) => handleChange(`${base}.underline.enabled`, e.target.checked)}
              />
              Enabled
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <label className="block text-sm">Width
              <input
                type="number"
                className="mt-1 w-full border rounded p-2"
                value={v.underline.width}
                onChange={(e) => handleChange(`${base}.underline.width`, number(e.target.value, 50))}
              />
            </label>
            <label className="block text-sm">Thickness
              <input
                type="number"
                step="0.25"
                className="mt-1 w-full border rounded p-2"
                value={v.underline.thickness}
                onChange={(e) => handleChange(`${base}.underline.thickness`, number(e.target.value, 0.75))}
              />
            </label>
            <label className="block text-sm">Colour
              <input
                type="color"
                className="mt-1 w-16 h-10"
                value={v.underline.colour}
                onChange={(e) => handleChange(`${base}.underline.colour`, e.target.value)}
              />
            </label>
          </div>
        </fieldset>

        {/* 4) Badge */}
        <fieldset className="border rounded p-3">
          <legend className="text-sm font-medium">Badge (suffix)</legend>
          <div className="flex items-center gap-3 mb-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={v.badge.enabled}
                onChange={(e) => handleChange(`${base}.badge.enabled`, e.target.checked)}
              />
              Enabled
            </label>
          </div>
          <label className="block text-sm">Text
            <input
              type="text"
              className="mt-1 w-full border rounded p-2"
              value={v.badge.text}
              onChange={(e) => handleChange(`${base}.badge.text`, e.target.value)}
            />
          </label>
        </fieldset>
      </div>
    );
  };

  // --- render ---------------------------------------------------------------
  const isRowSection = sectionKey === "row";

  return (
    <div className="mt-4 space-y-4">
      {isRowSection ? (
        <>
          {/* Line spacing at row-level */}
          <div className="border rounded p-4">
            <h4 className="font-semibold mb-2">Line spacing</h4>
            <input
              type="number"
              className="border rounded px-2 py-1 w-28"
              value={localData.lineSpacing ?? 2}
              onChange={(e) => handleChange("lineSpacing", number(e.target.value, 2))}
            />
          </div>

          {/* Variants in fixed order */}
          {VARIANT_ORDER.map((variant) =>
            renderRowVariantEditor(variant, localData?.[variant])
          )}
        </>
      ) : (
        renderFlatFields(localData)
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