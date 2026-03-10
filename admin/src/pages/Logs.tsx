import React, { useEffect, useState } from 'react';
import { logsService, Log } from '../services/logs.service';
import { Clock } from 'lucide-react';

const Logs: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await logsService.listLogs(page);
      setLogs(data.items);
      setTotalPages(data.meta.lastPage);
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  if (loading && logs.length === 0) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">System Transaction Logs</h2>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Time</th>
              <th className="p-3">Entity</th>
              <th className="p-3">Change</th>
              <th className="p-3">Changed By</th>
              <th className="p-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b hover:bg-gray-50 text-sm">
                <td className="p-3 text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock size={14} />
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </td>
                <td className="p-3">
                  <span className="font-medium">{log.entityType}</span>
                  <div className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 8)}...</div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-200 rounded text-gray-700 text-xs">{log.fromState || 'N/A'}</span>
                    <span>→</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-bold">{log.toState}</span>
                  </div>
                </td>
                <td className="p-3">
                  {log.changedByUser ? (
                    <div>
                      <div>{log.changedByUser.fullName}</div>
                      <div className="text-xs text-gray-400">{log.changedByUser.phoneNumber}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">System</span>
                  )}
                </td>
                <td className="p-3 text-gray-600 italic">
                  {log.reason || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="mt-4 flex justify-between items-center">
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Logs;
