const ignoredFields = ["tagIds", "locationIds"];

// functions/utils/detectFields.mjs
export function deriveDetectedFieldsFromGroups(groups) {
  const detected = new Set();

  (Array.isArray(groups) ? groups : []).forEach((g) => {
    const entries = Array.isArray(g?.entries) ? g.entries : [];
    entries.forEach((e) => {
      const f = e && typeof e === "object" ? (e.fields ?? e.rows ?? e) : {};
      Object.keys(f || {}).forEach((k) => {
        if (k && !ignoredFields.includes(k)) {
          detected.add(String(k));
        }
      });
    });
  });

  // return a clean array — ensures dropped fields are not carried forward
  return Array.from(detected);
}