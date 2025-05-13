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
    <div>
      <h2>PDF Creation Log</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Filename</th>
            <th>URL</th>
            <th>User ID</th>
            <th>User email</th>
            <th>Profile ID</th>
            <th>Status</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.filename || '—'}</td>
              <td>
                {log.url ? (
                  <a href={log.url} target="_blank" rel="noopener noreferrer">View PDF</a>
                ) : '—'}
              </td>
              <td>{log.userId}</td>
              <td>{log.userEmail}</td>
              <td>{log.profileId}</td>
              <td>{log.success ? 'Success' : 'Failed'}</td>
              <td style={{ color: 'red' }}>{log.errorMessage || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}