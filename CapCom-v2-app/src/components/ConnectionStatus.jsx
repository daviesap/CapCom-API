import useOnlineStatus from "../hooks/useOnlineStatus.js";

export default function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  return (
    <span className={isOnline ? "connection-pill online" : "connection-pill offline"}>
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}
