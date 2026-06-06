import useOnlineStatus from "../hooks/useOnlineStatus.js";
import useScheduleLastUpdated from "../hooks/useScheduleLastUpdated.js";

function formatLastUpdated(timestamp) {
  if (!timestamp) return "No local schedule copy yet";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function ScheduleCacheStatus({ eventId }) {
  const isOnline = useOnlineStatus();
  const lastUpdated = useScheduleLastUpdated(eventId);

  return (
    <p className="cache-status">
      <span className={isOnline ? "status-dot online" : "status-dot offline"} />
      {isOnline ? "Online" : "Offline read-only"} | Last updated:{" "}
      {formatLastUpdated(lastUpdated)}
    </p>
  );
}
