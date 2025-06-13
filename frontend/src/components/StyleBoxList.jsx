import React, { useState } from "react";
import StyleSection from "./StyleSection";

export default function StyleBoxList({ styles, onSaveSection }) {
  if (!styles) return null;

  const sectionKeys = [
    "header",
    "footer",
    "groupTitle",
    "groupMetadata",
    "labelRow",
    "row"
  ];

  const [openSection, setOpenSection] = useState(null);

  // Helper function to render the sample text for each section
const renderSample = (sectionKey) => {
  const section = styles[sectionKey];

  if (!section) return null;

  if (sectionKey === "row") {
    return (
      <div className="flex gap-4">
        {["default", "highlight", "lowlight"].map((subKey) => {
          const styleData = section[subKey] || {};
          const {
            fontSize = 12,
            fontStyle = "normal",
            fontColour = "#000000",
            backgroundColour = "#FFFFFF"
          } = styleData;

          const fontWeight = fontStyle.toLowerCase().includes("bold") ? "bold" : "normal";
          const fontStyleCss = fontStyle.toLowerCase().includes("italic") ? "italic" : "normal";

          return (
            <div
              key={subKey}
              className="px-2 py-1 rounded"
              style={{
                fontSize: `${fontSize}px`,
                fontWeight: fontWeight,
                fontStyle: fontStyleCss,
                color: fontColour,
                backgroundColor: backgroundColour,
                minWidth: "100px",
              }}
            >
              {subKey}
            </div>
          );
        })}
      </div>
    );
  }

  // All other sections
  const {
    fontSize = 12,
    fontStyle = "normal",
    fontColour = "#000000",
    backgroundColour = "#FFFFFF"
  } = section;

  const fontWeight = fontStyle.toLowerCase().includes("bold") ? "bold" : "normal";
  const fontStyleCss = fontStyle.toLowerCase().includes("italic") ? "italic" : "normal";

  return (
    <div
      className="px-2 py-1 rounded"
      style={{
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        fontStyle: fontStyleCss,
        color: fontColour,
        backgroundColor: backgroundColour,
        minWidth: "120px",
      }}
    >
      Sample Text
    </div>
  );
};

  return (
    <div className="space-y-4">
      {sectionKeys.map((sectionKey) => (
        <div key={sectionKey} className="p-4 rounded-xl shadow border border-gray-300 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-40 font-semibold text-lg capitalize">{sectionKey}</div>
              <div>{renderSample(sectionKey)}</div>
            </div>
            <button
              onClick={() => setOpenSection(openSection === sectionKey ? null : sectionKey)}
              className="px-3 py-1 rounded bg-blue-500 text-white shadow"
            >
              {openSection === sectionKey ? "Close" : "Edit"}
            </button>
          </div>

          {openSection === sectionKey && (
            <StyleSection
              sectionKey={sectionKey}
              sectionData={styles[sectionKey]}
              onSave={(updatedData) => {
                onSaveSection(sectionKey, updatedData);
                setOpenSection(null);
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}