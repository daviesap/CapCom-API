import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function StyleBox({ styleKey, styleData, pathArray, editingStyle, onEdit, onSave }) {
  const isEditing =
    editingStyle &&
    JSON.stringify(styleData) === JSON.stringify(editingStyle);

  const [draft, setDraft] = useState(styleData);

  useEffect(() => {
    if (isEditing) setDraft(styleData);
  }, [isEditing, styleData]);

  // Preview style for the sample box
  const sampleStyle = {
    backgroundColor: styleData.backgroundColour || "#fff",
    color: styleData.fontColour || styleData.colour || "#000",
    fontSize: `${styleData.fontSize || 12}px`,
    ...(styleData.fontStyle?.toLowerCase().includes("italic")
      ? { fontStyle: "italic" }
      : { fontStyle: "normal" }),
    ...(styleData.fontStyle?.toLowerCase().includes("bold")
      ? { fontWeight: "bold" }
      : { fontWeight: "normal" }),
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #ccc",
    minWidth: "80px",
    textAlign: "center",
  };

  // Helpers to detect input types
  const isColorKey = (key) => /color|colour|background/i.test(key);
  const isFontStyleKey = (key) => key === "fontStyle";

  return (
    <div
      key={pathArray.join(".")}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "start",
        gap: "1rem",
        marginBottom: "1rem",
      }}
    >
      <div>
        <strong>{styleKey}</strong>
        <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {Object.entries(styleData)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
        </pre>
      </div>

      <div style={sampleStyle}>Sample</div>

      <div>
        {isEditing ? (
          <>
            {Object.entries(draft).map(([key, value]) => {
              // determine valid color value
              let colorValue = "#000000";
              if (
                typeof value === "string" &&
                value.startsWith("#") &&
                (value.length === 7 || value.length === 4)
              ) {
                colorValue = value;
              }
              const isColor = isColorKey(key);
              const isFontStyle = isFontStyleKey(key);
              const isNumeric = typeof value === "number";

              return (
                <div key={key} style={{ marginBottom: "0.5rem" }}>
                  <label style={{ display: "flex", flexDirection: "column" }}>
                    {key}:
                    {isFontStyle ? (
                      <select
                        value={draft.fontStyle || "normal"}
                        onChange={(e) =>
                          setDraft({ ...draft, fontStyle: e.target.value })
                        }
                        style={{ marginTop: "0.25rem" }}
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
                        style={{
                          marginTop: "0.25rem",
                          width: "3rem",
                          height: "2rem",
                          padding: 0,
                          border: `1px solid ${
                            colorValue.toLowerCase() === "#ffffff" ||
                            colorValue.toLowerCase() === "#fff"
                              ? "#000"
                              : "#ccc"
                          }`,
                          borderRadius: "4px",
                        }}
                      />
                    ) : isNumeric ? (
                      <input
                        type="number"
                        step={1}
                        value={value}
                        onChange={(e) => {
                          const num = parseInt(e.target.value, 10);
                          setDraft({ ...draft, [key]: isNaN(num) ? 0 : num });
                        }}
                        style={{ marginTop: "0.25rem", width: "4rem" }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.value })
                        }
                        style={{ marginTop: "0.25rem" }}
                      />
                    )}
                  </label>
                </div>
              );
            })}
            <button
              onClick={() => onSave(draft)}
              style={{ marginRight: "0.5rem" }}
            >
              Save
            </button>
            <button onClick={() => onEdit(null)}>Cancel</button>
          </>
        ) : (
          <button onClick={() => onEdit(pathArray)}>Edit</button>
        )}
      </div>
    </div>
  );
}

export default function ProfileStylesViewer({ styles, editingStyle, onEdit, onSave }) {
  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      {Object.entries(styles).map(([styleKey, styleData]) => {
        if (styleKey === "row" && typeof styleData === "object") {
          return Object.entries(styleData).map(([subKey, subData]) => (
            <StyleBox
              key={`${styleKey}.${subKey}`}
              styleKey={`${styleKey}.${subKey}`}
              styleData={subData}
              pathArray={[styleKey, subKey]}
              editingStyle={editingStyle}
              onEdit={onEdit}
              onSave={onSave}
            />
          ));
        }
        return (
          <StyleBox
            key={styleKey}
            styleKey={styleKey}
            styleData={styleData}
            pathArray={[styleKey]}
            editingStyle={editingStyle}
            onEdit={onEdit}
            onSave={onSave}
          />
        );
      })}
    </div>
  );
}
