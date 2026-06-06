import React, { useEffect, useMemo, useState } from 'react';
import { reportsService, type AdminReport, type ReportStatus } from '../services/reports.service';

const Reports: React.FC = () => {
  const [items, setItems] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('open');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((r) => r.status === filter);
  }, [items, filter]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await reportsService.list(filter === 'all' ? undefined : filter);
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter]);

  const resolve = async (id: string) => {
    if (!window.confirm('Mark this report as resolved?')) return;
    try {
      await reportsService.resolve(id);
      await load();
    } catch {
      alert('Failed to resolve report');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Business Reports</h2>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border rounded p-2 bg-white"
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
          <button
            onClick={() => load()}
            className="border rounded px-3 py-2 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div> : null}

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Business</th>
              <th className="p-3">Reporter</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b hover:bg-gray-50 align-top">
                <td className="p-3">
                  <div className="font-medium">{r.business?.name ?? r.businessId}</div>
                  <div className="text-xs text-gray-500">
                    {r.business?.type} • {r.business?.claimStatus} • {r.business?.status}
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-medium">{r.reporter?.fullName ?? r.reporterUserId}</div>
                  <div className="text-xs text-gray-500">{r.reporter?.phoneNumber ?? ''}</div>
                </td>
                <td className="p-3">
                  <div className="font-medium">{r.reason}</div>
                  {r.details ? <div className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{r.details}</div> : null}
                </td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  {r.status === 'open' ? (
                    <button
                      onClick={() => resolve(r.id)}
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Resolve
                    </button>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>
                  No reports found.
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>
                  Loading...
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;

