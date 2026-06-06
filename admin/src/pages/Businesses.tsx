import React, { useEffect, useMemo, useState } from 'react';
import { businessesService, type AdminBusiness } from '../services/businesses.service';

const Businesses: React.FC = () => {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<'active' | 'pending' | 'rejected' | 'all'>('active');
  const [type, setType] = useState<'exchange' | 'umrah' | 'all'>('all');

  const [targetBusinessId, setTargetBusinessId] = useState('');
  const [sourceBusinessId, setSourceBusinessId] = useState('');
  const [merging, setMerging] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      if (status !== 'all' && b.status !== status) return false;
      if (type !== 'all' && b.type !== type) return false;
      return true;
    });
  }, [items, status, type]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await businessesService.list();
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const merge = async () => {
    const target = targetBusinessId.trim();
    const source = sourceBusinessId.trim();
    if (!target || !source) {
      alert('Enter both target and source business IDs');
      return;
    }
    if (!window.confirm(`Merge source ${source} into target ${target}?`)) return;
    setMerging(true);
    setError(null);
    try {
      await businessesService.merge(target, source);
      setSourceBusinessId('');
      await load();
      alert('Merged');
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to merge');
    } finally {
      setMerging(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Businesses</h2>
        <button
          onClick={() => load()}
          className="border rounded px-3 py-2 bg-white hover:bg-gray-50"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? <div className="p-3 mb-4 bg-red-50 text-red-700 border border-red-200 rounded">{error}</div> : null}

      <div className="bg-white rounded shadow p-4 mb-6">
        <h3 className="font-bold mb-3">Merge Duplicates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Target businessId</label>
            <input
              value={targetBusinessId}
              onChange={(e) => setTargetBusinessId(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="Target (keep)"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Source businessId</label>
            <input
              value={sourceBusinessId}
              onChange={(e) => setSourceBusinessId(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="Source (hide)"
            />
          </div>
          <button
            onClick={() => merge()}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={merging}
          >
            {merging ? 'Merging...' : 'Merge'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <div className="flex gap-3 p-4 border-b bg-gray-50">
          <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="border rounded p-2 bg-white">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value as any)} className="border rounded p-2 bg-white">
            <option value="all">All Types</option>
            <option value="exchange">Exchange</option>
            <option value="umrah">Umrah</option>
          </select>
          <div className="text-sm text-gray-600 flex items-center">
            Showing {filtered.length} of {items.length}
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Claim</th>
              <th className="p-3">Owner</th>
              <th className="p-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{b.name}</td>
                <td className="p-3">{b.type}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3">{b.claimStatus}</td>
                <td className="p-3">{b.ownerUserId ? b.ownerUserId.slice(0, 8) : '—'}</td>
                <td className="p-3 font-mono text-xs">{b.id}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={6}>
                  No businesses found.
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

export default Businesses;

