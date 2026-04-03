import React from "react";

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleString() : "—";
}

function renderSortArrow(activeKey, sortKey, sortDirection) {
  if (activeKey !== sortKey) return "↕";
  return sortDirection === "asc" ? "↑" : "↓";
}

export default function LogsTable({
  logs,
  sortable = false,
  sortKey = "createdAt",
  sortDirection = "desc",
  onSort = null,
}) {
  const headerClass = "border border-gray-300 px-4 py-2 text-left";
  const sortButtonClass = "inline-flex items-center gap-1 font-semibold text-left";

  const renderHeader = (label, key) => (
    <th className={headerClass}>
      {sortable ? (
        <button type="button" className={sortButtonClass} onClick={() => onSort?.(key)}>
          <span>{label}</span>
          <span>{renderSortArrow(key, sortKey, sortDirection)}</span>
        </button>
      ) : (
        label
      )}
    </th>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            {renderHeader("Created", "createdAt")}
            {renderHeader("Action", "action")}
            {renderHeader("Status", "success")}
            {renderHeader("App", "glideAppName")}
            {renderHeader("Event", "eventName")}
            {renderHeader("Profile ID", "profileId")}
            {renderHeader("User Email", "userEmail")}
            {renderHeader("Run ID", "runId")}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan="8" className="border border-gray-300 px-4 py-8 text-center text-gray-500">
                No log entries found.
              </td>
            </tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 align-top">
                <td className="border border-gray-300 px-4 py-2">{formatDate(log.createdAt || log.responseTimestamp)}</td>
                <td className="border border-gray-300 px-4 py-2">{log.action || "—"}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {log.success ? (
                    <span className="font-medium text-green-700">Success</span>
                  ) : (
                    <span className="font-medium text-red-700">Failed</span>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">{log.glideAppName || "—"}</td>
                <td className="border border-gray-300 px-4 py-2">{log.eventName || "—"}</td>
                <td className="border border-gray-300 px-4 py-2">{log.profileId || "—"}</td>
                <td className="border border-gray-300 px-4 py-2">{log.userEmail || "—"}</td>
                <td className="border border-gray-300 px-4 py-2">{log.runId || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
