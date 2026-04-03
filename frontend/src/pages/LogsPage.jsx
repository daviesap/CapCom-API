import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";
import LogsTable from "../components/LogsTable";

function toDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getComparableValue(log, sortKey) {
  if (sortKey === "createdAt") return toDate(log.createdAt || log.responseTimestamp)?.getTime() || 0;
  if (sortKey === "success") return log.success ? 1 : 0;
  return String(log?.[sortKey] || "").toLowerCase();
}

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      const q = query(collection(db, "logs"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setLogs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    };

    fetchLogs().catch((error) => {
      console.error("Error fetching logs:", error);
    });
  }, []);

  const filteredLogs = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    let next = logs.filter((log) => {
      if (statusFilter === "success" && !log.success) return false;
      if (statusFilter === "failed" && log.success) return false;
      if (!searchTerm) return true;

      const haystack = [
        log.action,
        log.glideAppName,
        log.eventName,
        log.profileId,
        log.userEmail,
        log.runId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(searchTerm);
    });

    next.sort((a, b) => {
      const av = getComparableValue(a, sortKey);
      const bv = getComparableValue(b, sortKey);
      if (av === bv) return 0;
      const result = av > bv ? 1 : -1;
      return sortDirection === "asc" ? result : -result;
    });

    return next;
  }, [logs, search, statusFilter, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection(key === "createdAt" ? "desc" : "asc");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">All Log Entries</h2>
          <p className="text-sm text-gray-600">Search, filter, and sort the Firestore `logs` collection.</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
        >
          Back to Profiles
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search app, event, profile ID, email, run ID..."
          className="border border-gray-300 rounded px-3 py-2 w-full"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="all">All statuses</option>
          <option value="success">Success only</option>
          <option value="failed">Failed only</option>
        </select>
      </div>

      <LogsTable
        logs={filteredLogs}
        sortable
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
      />
    </div>
  );
}
