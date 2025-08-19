import React, { useState } from "react";
import StyleSection from "./StyleSection";
import { normalizeStyle } from "../utils/styleUtils";

export default function StyleBoxList({ styles, onSaveSection }) {
  const [openSection, setOpenSection] = useState(null);

  if (!styles) return null;

  const sectionKeys = [
    "header",
    "footer",
    "groupTitle",
    "groupMetadata",
    "labelRow",
    "row",
  ];

  // New, explicit order for row variants
  const ROW_VARIANTS = ["default", "important", "new", "past"];

  const renderRowSample = () => {
    const row = styles.row || {};
    return (
      <div className="flex gap-4">
        {ROW_VARIANTS.map((subKey) => {
          const d = row[subKey] || {};
          const fontSize = typeof d.fontSize === "number" ? d.fontSize : 10;
          const fontStyle = (d.fontStyle || "normal").toLowerCase();
          const fontWeight = fontStyle.includes("bold") ? "bold" : "normal";
          const fontStyleCss = fontStyle.includes("italic") ? "italic" : "normal";
          const fontColour = d.fontColour || "#000000";
          const gutterColour = d.gutterColour || fontColour;

          // Optional: show badge if enabled (purely as a visual hint in preview)
          const badgeEnabled = d.badge?.enabled === true;
          const badgeText = d.badge?.text || (subKey === "new" ? "NEW" : "");

          return (
            <div key={subKey} className="flex items-center">
              {/* left gutter */}
              <div
                style={{
                  width: 6,
                  height: "1.8em",
                  marginRight: 8,
                  borderRadius: 2,
                  background: gutterColour,
                }}
                title={`gutter: ${gutterColour}`}
              />
              <div
                className="px-2 py-1 rounded border border-gray-200"
                style={{
                  fontSize: `${fontSize}px`,
                  fontWeight,
                  fontStyle: fontStyleCss,
                  color: fontColour,
                  minWidth: 120,
                }}
                title={`font: ${fontColour}`}
              >
                {subKey}
                {badgeEnabled && badgeText ? (
                  <span
                    style={{
                      display: "inline-block",
                      marginLeft: 8,
                      padding: "2px 6px",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#F0F8FF",
                      border: "1px solid #F0F8FF",
                      borderRadius: 3,
                      background: "#1A73E8",
                    }}
                  >
                    {badgeText}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSample = (sectionKey) => {
    const section = styles[sectionKey];
    if (!section) return null;

    if (sectionKey === "row") {
      return renderRowSample();
    }

    const normalized = normalizeStyle(section);
    const { fontSize, fontStyle, fontColour, backgroundColour } = normalized;
    const fs = (fontStyle || "").toLowerCase();
    const fontWeight = fs.includes("bold") ? "bold" : "normal";
    const fontStyleCss = fs.includes("italic") ? "italic" : "normal";

    return (
      <div
        className="px-2 py-1 rounded"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight,
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