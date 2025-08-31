//updateDates.js
import { table } from "@glideapps/tables";
import { DateTime } from "luxon";

//const token = process.env.GLIDE_API_KEY; // actual secret value

//export async function updateDatesHandler(req, res, db) {
export async function updateDatesHandler(req, res ) {
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

// Get Glide token from env (bound via Secret Manager). Fail fast if missing.
  if (!process.env.GLIDE_API_KEY) {
    return res.status(500).json({ error: "Missing GLIDE_API_KEY environment value" });
  }
  const token = process.env.GLIDE_API_KEY;

  //try {
   // const tokenDoc = await db.collection('glideTokens').doc(appId).get();
  //  if (!tokenDoc.exists) {
 //     return res.status(404).json({ error: `No token found for appId ${appId}` });
//    }
//    token = tokenDoc.data().token;
//  } catch (err) {
////    console.error("Error fetching token:", err);
//    return res.status(500).json({ error: "Failed to retrieve token" });
//  }

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
  } catch (e) {
    console.error("Glide get() failed", e);
    return res.status(502).json({ error: "Failed to read Glide table" });
  }
  const matchingRows = allRows.filter(row => String(row.eventId) === String(eventId));
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

  const deleteResults = await Promise.allSettled(deletePromises);
  const deletesSucceeded = deleteResults.filter(r => r.status === "fulfilled").length;
  const deletesFailed = deleteResults.length - deletesSucceeded;

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

  const addResults = await Promise.allSettled(addPromises);
  const addsSucceeded = addResults.filter(r => r.status === "fulfilled").length;
  const addsFailed = addResults.length - addsSucceeded;

  const rowsFinal = startCount - deletesSucceeded + addsSucceeded;

  res.status(200).json({
    message: "Success",
    eventId,
    startDate,
    endDate,
    rowsAtStart: startCount,
    rowsDeleted: deletesSucceeded,
    rowsAdded: addsSucceeded,
    rowsFinal,
    failures: {
      deleteFailures: deletesFailed,
      addFailures: addsFailed
    }
  });
}