import React from "react";

export default function ProfileStylesViewer({ styles, onEdit }) {
  const renderStyleBox = (styleKey, styleData) => {
    const sampleStyle = {
      backgroundColor: styleData.backgroundColour || "#fff",
      color: styleData.fontColour || styleData.colour || "#000",
      fontSize: `${styleData.fontSize || 12}px`,
      fontStyle: styleData.fontStyle === "italic" ? "italic" : "normal",
      fontWeight: styleData.fontStyle?.includes("bold") ? "bold" : "normal",
      padding: "0.5rem",
      borderRadius: "4px",
      border: "1px solid #ccc",
      minWidth: "80px",
      textAlign: "center",
    };

    return (
      <div
        key={styleKey}
        style={{
          display: "grid",
          gridTemplateColumns: "150px 1fr 100px 100px",
          alignItems: "center",
          gap: "1rem",
          borderBottom: "1px solid #ccc",
          padding: "1rem 0",
          width: "100%",
          boxSizing: "border-box"
        }}
      >
        <strong>{styleKey}</strong>

        <pre
          style={{
            backgroundColor: "#f9f9f9",
            padding: "0.5rem",
            borderRadius: "4px",
            whiteSpace: "pre-wrap",
            margin: 0
          }}
        >
          {Object.entries(styleData)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
        </pre>

        <div style={sampleStyle}>Sample</div>

        <button
          onClick={() => onEdit(styleKey)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#eee",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Edit
        </button>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      {Object.entries(styles).map(([styleKey, styleData]) => {
        if (styleKey === "row" && typeof styleData === "object") {
          return Object.entries(styleData).map(([subKey, subData]) =>
            renderStyleBox(`${styleKey}.${subKey}`, subData)
          );
        }
        return renderStyleBox(styleKey, styleData);
      })}
    </div>
  );
}
