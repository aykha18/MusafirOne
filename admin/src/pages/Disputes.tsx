import React, { useEffect, useState } from 'react';
import { disputesService, Dispute, DisputeStatus } from '../services/disputes.service';
import { AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';

const Disputes: React.FC = () => {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionStatus, setResolutionStatus] = useState<DisputeStatus>(DisputeStatus.RESOLVED_VALID);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const data = await disputesService.listAll();
      setDisputes(data);
    } catch (error) {
      console.error('Failed to fetch disputes', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute) return;

    try {
      await disputesService.resolveDispute(selectedDispute.id, resolutionStatus, resolutionNotes);
      setSelectedDispute(null);
      setResolutionNotes('');
      fetchDisputes();
    } catch (error) {
      alert('Failed to resolve dispute');
    }
  };

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.OPEN:
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">Open</span>;
      case DisputeStatus.UNDER_REVIEW:
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">Reviewing</span>;
      case DisputeStatus.RESOLVED_VALID:
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">Valid</span>;
      case DisputeStatus.RESOLVED_INVALID:
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">Invalid</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };

  if (loading && disputes.length === 0) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Dispute Management</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-3">Date</th>
                <th className="p-3">Reporter</th>
                <th className="p-3">Against</th>
                <th className="p-3">Reason</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-500">
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{dispute.raisedBy.fullName}</div>
                    <div className="text-xs text-gray-400">{dispute.raisedBy.phoneNumber}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{dispute.raisedAgainst.fullName}</div>
                    <div className="text-xs text-gray-400">{dispute.raisedAgainst.phoneNumber}</div>
                  </td>
                  <td className="p-3">{dispute.reason}</td>
                  <td className="p-3">{getStatusBadge(dispute.status)}</td>
                  <td className="p-3">
                    <button
                      onClick={() => setSelectedDispute(dispute)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
              {disputes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No disputes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resolution Panel */}
        <div className="lg:col-span-1">
          {selectedDispute ? (
            <div className="bg-white p-6 rounded shadow sticky top-4">
              <h3 className="text-lg font-bold mb-4">Resolve Dispute</h3>
              <div className="mb-4 text-sm">
                <p className="mb-2"><span className="font-semibold">Reason:</span> {selectedDispute.reason}</p>
                <p className="mb-2"><span className="font-semibold">Description:</span></p>
                <div className="bg-gray-50 p-3 rounded text-gray-700 mb-4">
                  {selectedDispute.description}
                </div>
              </div>

              <form onSubmit={handleResolve}>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Verdict</label>
                  <select
                    value={resolutionStatus}
                    onChange={(e) => setResolutionStatus(e.target.value as DisputeStatus)}
                    className="w-full border rounded p-2"
                  >
                    <option value={DisputeStatus.RESOLVED_VALID}>Valid (User checks +1)</option>
                    <option value={DisputeStatus.RESOLVED_INVALID}>Invalid</option>
                    <option value={DisputeStatus.DISMISSED}>Dismiss</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Resolution Notes</label>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    className="w-full border rounded p-2 h-24"
                    placeholder="Explain the decision..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDispute(null)}
                    className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Resolve
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded p-8 text-center text-gray-400">
              Select a dispute to review details and take action.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Disputes;
