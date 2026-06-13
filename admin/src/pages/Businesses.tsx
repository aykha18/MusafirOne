import React, { useEffect, useMemo, useState } from 'react';
import { businessesService, type AdminBusiness } from '../services/businesses.service';

const Businesses: React.FC = () => {
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<'active' | 'pending' | 'rejected' | 'all'>('pending');
  const [type, setType] = useState<'exchange' | 'umrah' | 'all'>('all');
  const [sourceType, setSourceType] = useState<'manual' | 'api' | 'partner' | 'other' | 'owner' | 'all'>('all');
  const [batchInput, setBatchInput] = useState('');
  const [importBatchId, setImportBatchId] = useState('');

  const [targetBusinessId, setTargetBusinessId] = useState('');
  const [sourceBusinessId, setSourceBusinessId] = useState('');
  const [merging, setMerging] = useState(false);
  const [claimCodeBusinessId, setClaimCodeBusinessId] = useState('');
  const [claimCode, setClaimCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [actingBusinessId, setActingBusinessId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return items.filter((b) => {
      return true;
    });
  }, [items]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await businessesService.list({
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
        sourceType: sourceType === 'all' ? undefined : sourceType,
        importBatchId: importBatchId.trim() ? importBatchId.trim() : undefined,
      });
      setItems(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status, type, sourceType, importBatchId]);

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

  const generateClaimCode = async () => {
    const id = claimCodeBusinessId.trim();
    if (!id) {
      alert('Enter a business ID');
      return;
    }
    if (!window.confirm(`Generate a new in-person claim code for ${id}?`)) return;
    setGeneratingCode(true);
    setError(null);
    try {
      const res = await businessesService.generateClaimCode(id);
      setClaimCode(res?.code ? String(res.code) : null);
      await load();
      alert(`Claim code: ${String(res.code)}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to generate claim code');
    } finally {
      setGeneratingCode(false);
    }
  };

  const approve = async (businessId: string) => {
    if (!window.confirm(`Approve business ${businessId}?`)) return;
    setActingBusinessId(businessId);
    setError(null);
    try {
      await businessesService.approve(businessId);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to approve business');
    } finally {
      setActingBusinessId(null);
    }
  };

  const reject = async (businessId: string) => {
    if (!window.confirm(`Reject business ${businessId}?`)) return;
    setActingBusinessId(businessId);
    setError(null);
    try {
      await businessesService.reject(businessId);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to reject business');
    } finally {
      setActingBusinessId(null);
    }
  };

  const prefillMerge = (targetId: string, sourceId: string) => {
    setTargetBusinessId(targetId);
    setSourceBusinessId(sourceId);
    window.alert(`Merge form prefilled. Target: ${targetId} | Source: ${sourceId}`);
  };

  const applyBatchFilter = () => {
    setImportBatchId(batchInput.trim());
  };

  const clearBatchFilter = () => {
    setBatchInput('');
    setImportBatchId('');
  };

  const formatDate = (value?: string | null) => {
    if (!value) return null;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleString();
  };

  const describeSource = (business: AdminBusiness) => {
    if (!business.sourceType) {
      return {
        label: 'owner',
        detail: 'Owner-submitted',
      };
    }
    return {
      label: business.sourceType,
      detail: business.sourceName ?? business.sourceType,
    };
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
        <h3 className="font-bold mb-2">Missing Business Review</h3>
        <p className="text-sm text-gray-600">
          Pending submissions from business owners appear in the table below. Review them,
          approve legitimate listings, and reject obvious duplicates or invalid entries.
        </p>
      </div>

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

      <div className="bg-white rounded shadow p-4 mb-6">
        <h3 className="font-bold mb-3">In-person Claim Code</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Business ID</label>
            <input
              value={claimCodeBusinessId}
              onChange={(e) => setClaimCodeBusinessId(e.target.value)}
              className="border rounded p-2 w-full"
              placeholder="Business ID"
            />
          </div>
          <button
            onClick={() => generateClaimCode()}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={generatingCode}
          >
            {generatingCode ? 'Generating...' : 'Generate Code'}
          </button>
        </div>
        {claimCode ? (
          <div className="mt-3 text-sm">
            <span className="text-gray-600">Latest code:</span>{' '}
            <span className="font-mono font-bold">{claimCode}</span>
          </div>
        ) : null}
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
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as any)}
            className="border rounded p-2 bg-white"
          >
            <option value="all">All Sources</option>
            <option value="owner">Owner Submitted</option>
            <option value="manual">Manual Import</option>
            <option value="api">API Import</option>
            <option value="partner">Partner Import</option>
            <option value="other">Other Import</option>
          </select>
          <input
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            placeholder="Import batch ID"
            className="border rounded p-2 bg-white min-w-[180px]"
          />
          <button
            onClick={applyBatchFilter}
            className="border rounded px-3 py-2 bg-white hover:bg-gray-50"
            type="button"
          >
            Apply Batch
          </button>
          <button
            onClick={clearBatchFilter}
            className="border rounded px-3 py-2 bg-white hover:bg-gray-50"
            type="button"
            disabled={!batchInput && !importBatchId}
          >
            Clear Batch
          </button>
          <div className="text-sm text-gray-600 flex items-center">
            Showing {filtered.length} of {items.length}
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Location</th>
              <th className="p-3">Type</th>
              <th className="p-3">Status</th>
              <th className="p-3">Claim</th>
              <th className="p-3">Owner</th>
              <th className="p-3">Source</th>
              <th className="p-3">Actions</th>
              <th className="p-3">ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b hover:bg-gray-50 align-top">
                <td className="p-3">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-gray-500">
                    Created {new Date(b.createdAt).toLocaleString()}
                  </div>
                  {b.possibleDuplicates && b.possibleDuplicates.length > 0 ? (
                    <div className="mt-2 text-xs text-amber-700">
                      {b.possibleDuplicates.length} possible duplicate
                      {b.possibleDuplicates.length === 1 ? '' : 's'}
                    </div>
                  ) : null}
                </td>
                <td className="p-3">
                  {b.branches?.[0] ? (
                    <div>
                      <div className="font-medium">{b.branches[0].city}</div>
                      <div className="text-xs text-gray-500">{b.branches[0].address}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="p-3">{b.type}</td>
                <td className="p-3">{b.status}</td>
                <td className="p-3">{b.claimStatus}</td>
                <td className="p-3">{b.ownerUserId ? b.ownerUserId.slice(0, 8) : '—'}</td>
                <td className="p-3">
                  {(() => {
                    const source = describeSource(b);
                    return (
                      <div className="text-xs">
                        <div className="font-medium text-gray-800">{source.detail}</div>
                        <div className="text-gray-600 uppercase">{source.label}</div>
                        {b.importBatchId ? (
                          <div className="text-gray-600">Batch: {b.importBatchId}</div>
                        ) : null}
                        {b.importedAt ? (
                          <div className="text-gray-600">Imported: {formatDate(b.importedAt)}</div>
                        ) : null}
                        {b.lastSeenAt ? (
                          <div className="text-gray-600">Last seen: {formatDate(b.lastSeenAt)}</div>
                        ) : null}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-3">
                  {b.status === 'pending' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => approve(b.id)}
                          className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          disabled={actingBusinessId === b.id}
                        >
                          {actingBusinessId === b.id ? 'Saving...' : 'Approve'}
                        </button>
                        <button
                          onClick={() => reject(b.id)}
                          className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          disabled={actingBusinessId === b.id}
                        >
                          {actingBusinessId === b.id ? 'Saving...' : 'Reject'}
                        </button>
                      </div>
                      {b.possibleDuplicates && b.possibleDuplicates.length > 0 ? (
                        <div className="flex flex-col gap-2 rounded border border-amber-200 bg-amber-50 p-2">
                          {b.possibleDuplicates.map((duplicate) => (
                            <div key={duplicate.id} className="text-xs">
                              <div className="font-medium text-gray-800">
                                {duplicate.name} {duplicate.city ? `(${duplicate.city})` : ''}
                              </div>
                              <div className="text-gray-600">
                                {duplicate.status} • {duplicate.claimStatus}
                              </div>
                              <div className="text-gray-600">
                                Match: {duplicate.reasons.join(', ')}
                              </div>
                              <button
                                onClick={() => prefillMerge(duplicate.id, b.id)}
                                className="mt-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                                type="button"
                              >
                                Prefill merge
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">{b.id}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={9}>
                  No businesses found.
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td className="p-4 text-gray-500" colSpan={9}>
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
