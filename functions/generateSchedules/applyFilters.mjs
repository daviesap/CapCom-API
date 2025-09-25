// functions/generateSchedules/applyFilters.mjs

function normaliseIdArray(x) {
  if (!Array.isArray(x)) return [];
  return x.map(v => String(v));
}

export function filterEntriesArray({
  data,
  filterTagIds = [],
  filterLocationIds = [],
  filterSubLocationIds = [],
}) {
  const reqTags  = normaliseIdArray(filterTagIds);
  const reqLocs  = normaliseIdArray(filterLocationIds);
  const reqSubs  = normaliseIdArray(filterSubLocationIds);

  return (Array.isArray(data) ? data : []).filter(entry => {
    const rowTags = normaliseIdArray(entry?.tagIds);
    const rowLocs = normaliseIdArray(entry?.locationIds);
    const rowSubs = normaliseIdArray(entry?.subLocationIds);

    const matchSet = (row, req) => {
      if (!req.length) return true; // no filter
      return req.some(id => row.includes(id));
    };

    const tagMatch = matchSet(rowTags, reqTags);
    const locMatch = matchSet(rowLocs, reqLocs);
    const subMatch = matchSet(rowSubs, reqSubs);

    return tagMatch && locMatch && subMatch;
  });
}

export function applySnapshotFiltersToView(view, {
  filterTagIds = [],
  filterLocationIds = [],
  filterSubLocationIds = [],
}) {
  if (!view || !Array.isArray(view.groups)) {
    return { groupBy: view?.groupBy || "", groups: [] };
  }

  const groups = [];
  for (const g of view.groups) {
    const entries = filterEntriesArray({
      data: g.entries,
      filterTagIds,
      filterLocationIds,
      filterSubLocationIds,
    });
    if (entries.length) {
      groups.push({ rawKey: g.rawKey, title: g.title, meta: g.meta, entries });
    }
  }
  return { groupBy: view.groupBy, groups };
}