import React, { useMemo, useState, useEffect } from "react";
import StyleBoxList from "./StyleBoxList";
import RowStyleEditor from "./RowStyleEditor";

// ----- helpers (migration & colour) -----------------------------------------
const NAMED_TO_HEX = {
  red: "#FF0000",
  green: "#008000",
  blue: "#0000FF",
  black: "#000000",
  white: "#FFFFFF",
  gray: "#808080",
  grey: "#808080",
  orange: "#CC6A00",
  purple: "#6A0DAD",
  yellow: "#FFD400",
};

function toHexColour(v, fallback = "#000000") {
  if (!v || typeof v !== "string") return fallback;
  const t = v.trim();
  if (t.startsWith("#")) {
    if (t.length === 4) return `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}`;
    return t.length === 7 ? t : fallback;
  }
  return NAMED_TO_HEX[t.toLowerCase()] || fallback;
}

function ensureUnderline(obj, fontHex) {
  const u = obj.underline || {};
  const colour = toHexColour(u.colour || u.color || fontHex, fontHex);
  return {
    enabled: u.enabled !== false,
    width: typeof u.width === "number" && u.width > 0 ? u.width : 50,
    thickness: typeof u.thickness === "number" && u.thickness > 0 ? u.thickness : 0.75,
    colour,
  };
}

function migrateRowVariant(src = {}, defaults) {
  const fontColour = toHexColour(src.fontColour || defaults.fontColour || "#000000");
  const backgroundColour = toHexColour(src.backgroundColour || defaults.backgroundColour || "#FFFFFF", "#FFFFFF");
  const gutterColour = toHexColour(src.gutterColour || fontColour, fontColour);
  return {
    ...defaults,
    ...src,
    fontColour,
    backgroundColour,
    gutterColour,
    underline: ensureUnderline(src, fontColour),
  };
}

function migrateStylesSchema(stylesIn) {
  const s = stylesIn || {};
  const row = s.row || {};

  const baseDefault = migrateRowVariant(row.default || {}, {
    fontSize: 10,
    fontStyle: "normal",
    fontColour: "#000000",
    backgroundColour: "#FFFFFF",
    gutterColour: "#999999",
  });

  const important = migrateRowVariant(row.important || {}, {
    ...baseDefault,
    fontStyle: "bold",
  });

  const newV = migrateRowVariant(row.new || row.highlight || {}, {
    ...baseDefault,
    fontStyle: "normal",
  });

  const past = migrateRowVariant(row.past || {}, {
    ...baseDefault,
    fontStyle: "italic",
  });

  const lineSpacing = typeof row.lineSpacing === "number" ? row.lineSpacing : 2;

  return {
    ...s,
    row: {
      ...row,
      default: baseDefault,
      important,
      new: newV,
      past,
      lineSpacing,
    },
  };
}

const DEFAULT_DOCUMENT = {
  pageSize: { width: 842, height: 595 },
  leftMargin: 50,
  rightMargin: 50,
  topMargin: 30,
  bottomMargin: 20,
  groupPaddingBottom: 10,
  bottomPageThreshold: 40,
  header: {
    logo: { url: "", width: 36, height: 36 },
    text: [],
  },
  footer: "",
};

export default function StylesEditor({ styles, editingStyle, onEdit, onSave }) {
  // supports either full profile shape ({styles, document}) or raw styles object
  const isWhole = styles && (styles.styles || styles.document);
  // initial doc for first render only
  const initialDoc = isWhole ? (styles.document || {}) : (styles?.document || {});

  const migrated = useMemo(() => {
    const incomingStyles = isWhole ? (styles.styles || {}) : (styles || {});
    return migrateStylesSchema(incomingStyles);
  }, [isWhole, styles]);
  const [rowDraft, setRowDraft] = useState(migrated.row);

  useEffect(() => setRowDraft(migrated.row), [migrated]);

  const [docDraft, setDocDraft] = useState({ ...DEFAULT_DOCUMENT, ...initialDoc });
  useEffect(() => {
    const incomingDoc = isWhole ? (styles.document || {}) : (styles?.document || {});
    setDocDraft({ ...DEFAULT_DOCUMENT, ...incomingDoc });
  }, [isWhole, styles]);

  const applyRowChange = (key, updated) => {
    setRowDraft((prev) => ({ ...prev, [key]: updated }));
  };

  const saveAll = () => {
    const normalized = migrateStylesSchema({ ...migrated, row: rowDraft });
    if (isWhole) {
      onSave?.({ ...styles, styles: normalized, document: docDraft });
    } else {
      const payload = { ...normalized };
      if (styles && styles.document) payload.document = docDraft;
      onSave?.(payload);
    }
  };

  // --- document editing helpers ---
  const setDocField = (path, value) => {
    setDocDraft((prev) => {
      const next = { ...prev };
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        cur[k] = cur[k] ? { ...cur[k] } : {};
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const number = (v, fb = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fb;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
      {/* Document Settings (keep existing behavior) */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Document Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Page Size</h3>
            <label className="block text-sm">Width
              <input
                className="mt-1 w-full border rounded p-2"
                type="number"
                value={docDraft.pageSize?.width ?? 0}
                onChange={(e) => setDocField("pageSize.width", number(e.target.value, 842))}
              />
            </label>
            <label className="block text-sm mt-2">Height
              <input
                className="mt-1 w-full border rounded p-2"
                type="number"
                value={docDraft.pageSize?.height ?? 0}
                onChange={(e) => setDocField("pageSize.height", number(e.target.value, 595))}
              />
            </label>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Margins</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">Left
                <input
                  className="mt-1 w-full border rounded p-2"
                  type="number"
                  value={docDraft.leftMargin ?? 0}
                  onChange={(e) => setDocField("leftMargin", number(e.target.value, 50))}
                />
              </label>
              <label className="block text-sm">Right
                <input
                  className="mt-1 w-full border rounded p-2"
                  type="number"
                  value={docDraft.rightMargin ?? 0}
                  onChange={(e) => setDocField("rightMargin", number(e.target.value, 50))}
                />
              </label>
              <label className="block text-sm">Top
                <input
                  className="mt-1 w-full border rounded p-2"
                  type="number"
                  value={docDraft.topMargin ?? 0}
                  onChange={(e) => setDocField("topMargin", number(e.target.value, 30))}
                />
              </label>
              <label className="block text-sm">Bottom
                <input
                  className="mt-1 w-full border rounded p-2"
                  type="number"
                  value={docDraft.bottomMargin ?? 0}
                  onChange={(e) => setDocField("bottomMargin", number(e.target.value, 20))}
                />
              </label>
            </div>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Layout</h3>
            <label className="block text-sm">Group padding bottom
              <input
                className="mt-1 w-full border rounded p-2"
                type="number"
                value={docDraft.groupPaddingBottom ?? 0}
                onChange={(e) => setDocField("groupPaddingBottom", number(e.target.value, 10))}
              />
            </label>
            <label className="block text-sm mt-2">Bottom page threshold
              <input
                className="mt-1 w-full border rounded p-2"
                type="number"
                value={docDraft.bottomPageThreshold ?? 0}
                onChange={(e) => setDocField("bottomPageThreshold", number(e.target.value, 40))}
              />
            </label>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Header Logo</h3>
            <label className="block text-sm">Logo URL
              <input
                className="mt-1 w-full border rounded p-2"
                type="text"
                value={docDraft.header?.logo?.url || ""}
                onChange={(e) => setDocField("header.logo.url", e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <label className="block text-sm">Width
                <input
                  className="mt-1 w-full border rounded p-2"
                  type="number"
                  value={docDraft.header?.logo?.width ?? 0}
                  onChange={(e) => setDocField("header.logo.width", number(e.target.value, 36))}
                />
              </label>
              <label className="block text-sm">Height
                <input
                  className="mt-1 w-full border rounded p-2"
                  type="number"
                  value={docDraft.header?.logo?.height ?? 0}
                  onChange={(e) => setDocField("header.logo.height", number(e.target.value, 36))}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={saveAll} className="px-4 py-2 bg-blue-600 text-white rounded">
            Save document & styles
          </button>
        </div>
      </section>

      {/* Row Styles in fixed order */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Row Styles</h2>
        <div className="mb-4 p-3 border rounded inline-flex items-center gap-3">
          <label className="text-sm">Line spacing
            <input
              type="number"
              step="1"
              className="ml-2 border rounded p-2 w-24"
              value={rowDraft.lineSpacing ?? 2}
              onChange={(e) => setRowDraft(r => ({ ...r, lineSpacing: number(e.target.value, 2) }))}
            />
          </label>
        </div>

        <div className="space-y-4">
          <RowStyleEditor title="Default"   value={rowDraft.default}   onChange={(nv) => applyRowChange("default", nv)} />
          <RowStyleEditor title="Important" value={rowDraft.important} onChange={(nv) => applyRowChange("important", nv)} />
          <RowStyleEditor title="New"       value={rowDraft.new}       onChange={(nv) => applyRowChange("new", nv)} />
          <RowStyleEditor title="Past"      value={rowDraft.past}      onChange={(nv) => applyRowChange("past", nv)} />
        </div>

        <div className="mt-4 flex gap-3">
          <button onClick={saveAll} className="px-4 py-2 bg-green-600 text-white rounded">
            Save row styles
          </button>
        </div>
      </section>

      {/* Keep existing typography / other groups via StyleBoxList */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Other Styles</h2>
        <StyleBoxList
          styles={migrated}
          editingStyle={editingStyle}
          onEdit={onEdit}
          onSave={(updated) => {
            const merged = migrateStylesSchema(updated);
            setRowDraft(merged.row);
            saveAll();
          }}
        />
      </section>
    </div>
  );
}