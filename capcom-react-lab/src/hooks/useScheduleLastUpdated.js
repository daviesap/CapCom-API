import { useEffect, useState } from "react";
import { getScheduleLastUpdated } from "../services/localScheduleCache.js";

export default function useScheduleLastUpdated(eventId) {
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    const updateTimestamp = () => setLastUpdated(eventId ? getScheduleLastUpdated(eventId) : "");
    updateTimestamp();
    window.addEventListener("schedule-cache-updated", updateTimestamp);
    return () => window.removeEventListener("schedule-cache-updated", updateTimestamp);
  }, [eventId]);

  return lastUpdated;
}
