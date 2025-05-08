import React from 'react';

const fontStyleOptions = ['normal', 'bold', 'italic', 'bold-italic'];

export default function ProfileStylesViewer({ styles, onEdit, editingStyle, onSave }) {
  const renderStyleRow = (key, value) => {
    const isEditing = editingStyle === key;

    const handleChange = (field, fieldValue) => {
      if (onEdit) {
        onEdit(key, { ...value, [field]: fieldValue });
      }
    };

    const sampleStyle = {
      backgroundColor: value.backgroundColour,
      color: value.fontColour,
      fontStyle: value.fontStyle?.includes("italic") ? "italic" : "normal",
      fontWeight: value.fontStyle?.includes("bold") ? "bold" : "normal",
      fontSize: value.fontSize,
      padding: "0.25rem",
    };

    return (
      <tr key={key}>
        <td style={{ fontWeight: "bold" }}>{key}</td>
        <td>
          {isEditing ? (
            <>
              <div>
                Font size:{" "}
                <input
                  type="number"
                  value={value.fontSize}
                  onChange={(e) => handleChange("fontSize", parseInt(e.target.value))}
                />
              </div>
              <div>
                Font style:{" "}
                <select
                  value={value.fontStyle}
                  onChange={(e) => handleChange("fontStyle", e.target.value)}
                >
                  {fontStyleOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                Background:{" "}
                <input
                  type="color"
                  value={value.backgroundColour}
                  onChange={(e) => handleChange("backgroundColour", e.target.value)}
                />
              </div>
              <div>
                Font colour:{" "}
                <input
                  type="color"
                  value={value.fontColour}
                  onChange={(e) => handleChange("fontColour", e.target.value)}
                />
              </div>
              <button onClick={() => onSave(key)}>Save</button>
            </>
          ) : (
            <>
              fontSize: {value.fontSize}, fontStyle: {value.fontStyle}, background: {value.backgroundColour}, colour: {value.fontColour}
            </>
          )}
        </td>
        <td><div style={sampleStyle}>Sample</div></td>
        <td><button onClick={() => onEdit(key, value)}>Edit</button></td>
      </tr>
    );
  };

  return (
    <table style={{ width: "100%", marginTop: "1rem" }}>
      <thead>
        <tr>
          <th>Style Name</th>
          <th>Settings</th>
          <th>Sample</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(styles).map(([key, value]) =>
          key === "row"
            ? Object.entries(value).map(([variant, rowValue]) =>
                renderStyleRow(`${key}.${variant}`, rowValue)
              )
            : renderStyleRow(key, value)
        )}
      </tbody>
    </table>
  );
}