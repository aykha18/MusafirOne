import React, { useEffect, useState } from 'react';
import { usersService, User } from '../services/users.service';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await usersService.listAll(page);
      setUsers(data.items);
      setTotalPages(data.meta.lastPage);
    } catch (error) {
      console.error('Failed to fetch users', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page]);

  const handleSuspend = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unsuspend' : 'suspend'} this user?`)) return;
    try {
      await usersService.suspendUser(userId, !currentStatus);
      fetchUsers(); // Refresh list
    } catch (error) {
      alert('Failed to update user status');
    }
  };

  const handleVerify = async (userId: string, level: number) => {
    try {
      await usersService.verifyUser(userId, level);
      fetchUsers();
    } catch (error) {
      alert('Failed to update verification level');
    }
  };

  if (loading && users.length === 0) return <div className="p-4">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">City / Corridor</th>
              <th className="p-3">Verification</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium">{user.fullName || 'N/A'}</td>
                <td className="p-3">{user.phoneNumber}</td>
                <td className="p-3">
                  {user.city} <span className="text-gray-400">/</span> {user.corridor}
                </td>
                <td className="p-3">
                  <select
                    value={user.verificationLevel}
                    onChange={(e) => handleVerify(user.id, Number(e.target.value))}
                    className="border rounded p-1"
                  >
                    <option value={0}>Level 0 (Unverified)</option>
                    <option value={1}>Level 1 (Basic)</option>
                    <option value={2}>Level 2 (Full)</option>
                  </select>
                </td>
                <td className="p-3">
                  {user.isSuspended ? (
                    <span className="flex items-center text-red-600">
                      <XCircle size={16} className="mr-1" /> Suspended
                    </span>
                  ) : (
                    <span className="flex items-center text-green-600">
                      <CheckCircle size={16} className="mr-1" /> Active
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleSuspend(user.id, user.isSuspended)}
                    className={`text-sm px-3 py-1 rounded text-white ${
                      user.isSuspended ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {user.isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
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

export default Users;
