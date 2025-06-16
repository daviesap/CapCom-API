// Utility for safely normalizing style data

// Default values for any style object
export const DEFAULT_STYLE = {
  fontSize: 12,
  fontStyle: "normal",
  fontColour: "#000000",
  backgroundColour: "#FFFFFF",
  paddingBottom: 0,  // optional: add other defaults you want globally
  paddingTop: 0
};

// Normalize a single style object
export function normalizeStyle(style = {}) {
  return {
    fontSize: style.fontSize ?? DEFAULT_STYLE.fontSize,
    fontStyle: style.fontStyle ?? DEFAULT_STYLE.fontStyle,
    fontColour: style.fontColour ?? DEFAULT_STYLE.fontColour,
    backgroundColour: style.backgroundColour ?? DEFAULT_STYLE.backgroundColour,
    paddingBottom: style.paddingBottom ?? DEFAULT_STYLE.paddingBottom,
    paddingTop: style.paddingTop ?? DEFAULT_STYLE.paddingTop
  };
}

// Normalize nested 'row' section styles
export function normalizeRowStyles(rowStyles = {}) {
  return {
    default: normalizeStyle(rowStyles.default),
    highlight: normalizeStyle(rowStyles.highlight),
    lowlight: normalizeStyle(rowStyles.lowlight),
  };
}

// Universal normalize function depending on section
export function normalizeSection(sectionKey, sectionData) {
  if (sectionKey === 'row') {
    return normalizeRowStyles(sectionData);
  }
  return normalizeStyle(sectionData);
}