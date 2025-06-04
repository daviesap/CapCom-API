//PdfCreationLog.jsx
import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function PdfCreationLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(
          collection(db, 'pdfCreationLog'),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLogs(entries);
      } catch (err) {
        console.error('Error fetching PDF logs:', err);
      }
    };

    fetchLogs();
  }, []);

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">PDF Creation Log</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-300 border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left">Timestamp</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Filename</th>
              <th className="border border-gray-300 px-4 py-2 text-left">URL</th>
              <th className="border border-gray-300 px-4 py-2 text-left">User Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Profile ID</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">
                  {log.timestamp
                    ? new Date(log.timestamp).toLocaleString()
                    : '—'}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {log.filename || '—'}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {log.url ? (
                    <a
                      href={log.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View PDF
                    </a>
                  ) : '—'}
                </td>
                <td className="border border-gray-300 px-4 py-2">{log.userEmail || '—'}</td>
                <td className="border border-gray-300 px-4 py-2">{log.profileId || '—'}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {log.success ? (
                    <span className="text-green-600 font-medium">Success</span>
                  ) : (
                    <span className="text-red-600 font-medium">Failed</span>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-red-500">
                  {log.errorMessage || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}