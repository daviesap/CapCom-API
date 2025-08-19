import React from "react";

const FONT_STYLE_OPTIONS = [
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Italic", value: "italic" },
];

export default function RowStyleEditor({ title, value = {}, onChange }) {
  // Ensure the object exists in the exact shape we edit
  const v = {
    fontSize: value.fontSize ?? 10,
    fontStyle: value.fontStyle || "normal",
    fontColour: value.fontColour || "#000000",
    gutterColour: value.gutterColour || value.fontColour || "#000000",
    underline: {
      enabled: value.underline?.enabled !== false,
      width: typeof value.underline?.width === "number" ? value.underline.width : 50,
      thickness: typeof value.underline?.thickness === "number" ? value.underline.thickness : 0.75,
      colour: value.underline?.colour || value.fontColour || "#000000",
    },
    badge: {
      enabled: value.badge?.enabled === true,
      text: value.badge?.text || "",
    },
  };

  const set = (path, newVal) => {
    // Start from the latest incoming value to avoid stale writes,
    // and layer in our defaults so all keys exist.
    const seed = {
      fontSize: value?.fontSize ?? 10,
      fontStyle: value?.fontStyle || "normal",
      fontColour: value?.fontColour || "#000000",
      gutterColour: value?.gutterColour || value?.fontColour || "#000000",
      underline: {
        enabled: value?.underline?.enabled !== false,
        width: typeof value?.underline?.width === "number" ? value.underline.width : 50,
        thickness: typeof value?.underline?.thickness === "number" ? value.underline.thickness : 0.75,
        colour: value?.underline?.colour || value?.fontColour || "#000000",
      },
      badge: {
        enabled: value?.badge?.enabled === true,
        text: value?.badge?.text || "",
      },
    };
    const next = JSON.parse(JSON.stringify(seed));
    const parts = path.split(".");
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      cur[k] = cur[k] ? { ...cur[k] } : {};
      cur = cur[k];
    }
    cur[parts[parts.length - 1]] = newVal;
    onChange?.(next);
  };

  const num = (val, fb = 0) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : fb;
  };

  return (
    <div className="p-4 border rounded space-y-4">
      <h3 className="font-medium">{title}</h3>

      {/* 1) Font */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block text-sm">Font size
          <input
            type="number"
            min={6}
            className="mt-1 w-full border rounded p-2"
            value={v.fontSize}
            onChange={(e) => set("fontSize", num(e.target.value, 10))}
          />
        </label>

        <label className="block text-sm">Font style
          <select
            className="mt-1 w-full border rounded p-2"
            value={v.fontStyle}
            onChange={(e) => set("fontStyle", e.target.value)}
          >
            {FONT_STYLE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* 2) Colours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block text-sm">Font colour
          <input
            type="text"
            placeholder="#000000"
            spellCheck={false}
            className="mt-1 w-full border rounded p-2"
            value={v.fontColour}
            onChange={(e) => set("fontColour", e.target.value)}
          />
        </label>

        <label className="block text-sm">Gutter colour
          <input
            type="text"
            placeholder="#000000"
            spellCheck={false}
            className="mt-1 w-full border rounded p-2"
            value={v.gutterColour}
            onChange={(e) => set("gutterColour", e.target.value)}
          />
        </label>
      </div>

      {/* 3) Underline */}
      <fieldset className="border rounded p-3 space-y-3">
        <legend className="text-sm font-medium">Underline</legend>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.underline.enabled}
            onChange={(e) => set("underline.enabled", e.target.checked)}
          />
          Enabled
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <label className="block text-sm">Width
            <input
              type="number"
              min={0}
              className="mt-1 w-full border rounded p-2"
              value={v.underline.width}
              onChange={(e) => set("underline.width", num(e.target.value, 50))}
            />
          </label>

          <label className="block text-sm">Thickness
            <input
              type="number"
              step="0.25"
              min={0}
              className="mt-1 w-full border rounded p-2"
              value={v.underline.thickness}
              onChange={(e) => set("underline.thickness", num(e.target.value, 0.75))}
            />
          </label>

          <label className="block text-sm">Colour
            <input
              type="text"
              placeholder="#000000"
              spellCheck={false}
              className="mt-1 w-full border rounded p-2"
              value={v.underline.colour}
              onChange={(e) => set("underline.colour", e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {/* 4) Badge */}
      <fieldset className="border rounded p-3 space-y-3">
        <legend className="text-sm font-medium">Badge (suffix)</legend>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={v.badge.enabled}
            onChange={(e) => set("badge.enabled", e.target.checked)}
          />
          Enabled
        </label>

        <label className="block text-sm">Text
          <input
            type="text"
            className="mt-1 w-full border rounded p-2"
            value={v.badge.text}
            onChange={(e) => set("badge.text", e.target.value)}
          />
        </label>
      </fieldset>
    </div>
  );
}