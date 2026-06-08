export function getSectionLoadingMessage(loadingSections) {
  const activeSections = loadingSections
    .filter((entry) => {
      if (entry.length < 2) return false;
      const [, isLoading] = entry;
      return Boolean(isLoading);
    })
    .map((entry) => entry[0]);

  if (activeSections.length === 0) return "";
  if (activeSections.length === 1) return `Loading ${activeSections[0]}...`;
  if (activeSections.length === 2) return `Loading ${activeSections[0]} and ${activeSections[1]}...`;

  return `Loading ${activeSections[0]}, ${activeSections[1]} and ${activeSections
    .slice(2)
    .map((section) => section)
    .join(", ")}...`;
}
