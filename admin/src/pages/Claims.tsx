import React, { useEffect, useMemo, useState } from 'react';
import { claimsService, type AdminClaim, type ClaimStatus } from '../services/claims.service';

type ClaimDoc = {
  id: string;
  fileName: string;
  mimeType?: string;
  storagePath?: string;
  uploadedAt?: string;
};

const Claims: React.FC = () => {
  const [items, setItems] = useState<AdminClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ClaimStatus | 'all'>('pending');
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((c) => c.status === filter);
  }, [items, filter]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await claimsService.list(filter === 'all' ? undefined : filter);
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load claims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [filter]);

  const parseDocs = (docsJson?: string | null): ClaimDoc[] => {
    if (!docsJson) return [];
    try {
      const parsed = JSON.parse(docsJson) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((d) => ({
          id: String((d as any)?.id ?? ''),
          fileName: String((d as any)?.fileName ?? ''),
          mimeType: (d as any)?.mimeType ? String((d as any).mimeType) : undefined,
          storagePath: (d as any)?.storagePath ? String((d as any).storagePath) : undefined,
          uploadedAt: (d as any)?.uploadedAt ? String((d as any).uploadedAt) : undefined,
        }))
        .filter((d) => d.id && d.fileName);
    } catch {
      return [];
    }
  };

  const downloadDoc = async (claimId: string, doc: ClaimDoc) => {
    try {
      const blob = await claimsService.downloadDoc(claimId, doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download document');
    }
  };

  const approve = async (id: string) => {
    if (!window.confirm('Approve this claim and assign ownership?')) return;
    try {
      await claimsService.approve(id);
      await load();
    } catch {
      alert('Failed to approve claim');
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt('Rejection reason (optional):') ?? undefined;
    if (!window.confirm('Reject this claim?')) return;
    try {
      await claimsService.reject(id, reason);
      await load();
    } catch {
      alert('Failed to reject claim');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Business Claims</h2>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border rounded p-2 bg-white"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
              <th className="p-3">Requester</th>
              <th className="p-3">Method</th>
              <th className="p-3">Docs</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              (() => {
                const docs = parseDocs(c.docsJson);
                return (
              <tr key={c.id} className="border-b hover:bg-gray-50">
                <td className="p-3">
                  <div className="font-medium">{c.business?.name ?? c.businessId}</div>
                  <div className="text-xs text-gray-500">
                    {c.business?.type} • {c.business?.claimStatus} • {c.business?.status}
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-medium">{c.requester?.fullName ?? c.requesterUserId}</div>
                  <div className="text-xs text-gray-500">{c.requester?.phoneNumber ?? ''}</div>
                </td>
                <td className="p-3">{c.method}</td>
                <td className="p-3">
                  {docs.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="text-xs text-gray-500">{docs.length} file(s)</div>
                      <div className="flex flex-wrap gap-2">
                        {docs.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => downloadDoc(c.id, d)}
                            className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                          >
                            Download
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="p-3">{c.status}</td>
                <td className="p-3">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  {c.status === 'pending' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(c.id)}
                        className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => reject(c.id)}
                        className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
                );
              })()
            ))}
            {filtered.length === 0 && !loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>
                  No claims found.
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>
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

export default Claims;
