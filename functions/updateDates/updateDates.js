//updateDates.js

export async function updateDatesHandler(req, res, db) {
  // Lazy-load external deps so cold start won't crash if optional packages are missing
  let DateTime;
  let table;
  try {
    ({ DateTime } = await import('luxon'));
  } catch (e) {
    console.error('Failed to load luxon:', e);
    return res.status(500).json({ error: 'Server configuration error: missing luxon' });
  }
  try {
    ({ table } = await import('@glideapps/tables'));
  } catch (e) {
    console.error('Failed to load @glideapps/tables:', e);
    return res.status(500).json({ error: 'Server configuration error: missing @glideapps/tables' });
  }
  const {
    appId,
    tableId,
    columnEventId,
    columnDateId,
    eventId,
    startDate,
    endDate
  } = req.body;


  if (!appId || !tableId || !columnEventId || !columnDateId || !eventId || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

//Get Glide token from Firestore
  let token;
  try {
    const tokenDoc = await db.collection('glideTokens').doc(appId).get();
    if (!tokenDoc.exists) {
      return res.status(404).json({ error: `No token found for appId ${appId}` });
    }
    token = tokenDoc.data().token;
  } catch (err) {
    console.error("Error fetching token:", err);
    return res.status(500).json({ error: "Failed to retrieve token" });
  }

  // Configure the Glide table
  const bfScheduleDatesTable = table({
  token,
  app: appId,
  table: tableId,
  columns: {
    eventId: { type: "string", name: columnEventId },
    date: { type: "date-time", name: columnDateId }
  }
});


  const start = DateTime.fromISO(startDate).startOf("day");
  const end = DateTime.fromISO(endDate).startOf("day");

  if (start > end) {
    return res.status(400).json({
      message: "Start date must not be after end date.",
      eventId,
      startDate,
      endDate
    });
  }

  let allRows;
  try {
    allRows = await bfScheduleDatesTable.get();
  } catch (err) {
    console.error('Failed to fetch rows from Glide:', err);
    return res.status(502).json({ error: 'Failed to fetch rows from Glide' });
  }
  const matchingRows = allRows.filter(row => row.eventId === eventId);
  const startCount = matchingRows.length;

  const existingDates = new Set(
    matchingRows.map(row =>
      DateTime.fromISO(row.date).toISODate()
    )
  );

  const deletePromises = matchingRows
    .filter(row => {
      const date = DateTime.fromISO(row.date).startOf("day");
      return date < start || date > end;
    })
    .map(row => bfScheduleDatesTable.delete(row.$rowID));

  const dateRange = [];
  for (let dt = start; dt <= end; dt = dt.plus({ days: 1 })) {
    dateRange.push(dt.toISODate());
  }

  const addPromises = dateRange
    .filter(date => !existingDates.has(date))
    .map(date =>
      bfScheduleDatesTable.addRow({
        eventId,
        date: DateTime.fromISO(date).toISO()
      })
    );

  try {
    await Promise.all([
      Promise.all(deletePromises),
      Promise.all(addPromises)
    ]);
  } catch (err) {
    console.error('Failed to write rows to Glide:', err);
    return res.status(502).json({ error: 'Failed to write rows to Glide' });
  }

  const rowsFinal = startCount - deletePromises.length + addPromises.length;

  res.status(200).json({
    message: "✅ Success",
    eventId,
    startDate,
    endDate,
    rowsAtStart: startCount,
    rowsDeleted: deletePromises.length,
    rowsAdded: addPromises.length,
    rowsFinal
  });
}