import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { UserCheck, Plus, Calendar, AlertCircle, Edit2 } from 'lucide-react';

interface DelegationItem {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
  createdAt: string;
  delegator: {
    id: string;
    username: string;
    fullName?: string;
    role: string;
    division: string;
  };
  delegatee: {
    id: string;
    username: string;
    fullName?: string;
    role: string;
    division: string;
  };
}

export const DelegationsPage: React.FC = () => {
  const { user } = useAuth();
  const [delegations, setDelegations] = useState<DelegationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<any[]>([]);

  // Create / Edit Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<DelegationItem | null>(null);
  const [formData, setFormData] = useState({
    delegateeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    reason: 'Annual Leave / On Vacation',
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDelegations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks/delegations');
      setDelegations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await api.get('/tasks/delegates/candidates');
      setCandidates(res.data);
      return res.data;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  useEffect(() => {
    fetchDelegations();
    fetchCandidates();
  }, []);

  const handleOpenCreate = async () => {
    setEditingDelegation(null);
    setErrorMessage(null);
    const candidateList = await fetchCandidates();
    setFormData({
      delegateeId: candidateList[0]?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      reason: 'Annual Leave / On Vacation',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = async (delegation: DelegationItem) => {
    setEditingDelegation(delegation);
    setErrorMessage(null);
    await fetchCandidates();
    setFormData({
      delegateeId: delegation.delegatee.id,
      startDate: delegation.startDate,
      endDate: delegation.endDate,
      reason: delegation.reason || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      if (editingDelegation) {
        // Update existing delegation
        await api.put(`/tasks/delegations/${editingDelegation.id}`, formData);
      } else {
        // Create new delegation
        await api.post('/tasks/delegations', formData);
      }
      setModalOpen(false);
      setEditingDelegation(null);
      fetchDelegations();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save delegation');
    }
  };

  const handleCancelDelegation = async (id: string) => {
    if (!window.confirm('Deactivate this approval delegation?')) return;
    try {
      await api.delete(`/tasks/delegations/${id}`);
      fetchDelegations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel delegation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            Approval Delegations / Substitutions
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Delegate your approval authority to a same-role colleague during annual leave or absence
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm hover:shadow transition text-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Delegation</span>
        </button>
      </div>

      {/* Delegations List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Delegator (Origin)</th>
                <th className="px-6 py-4">Delegatee (Substitute)</th>
                <th className="px-6 py-4">Active Period</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Loading delegations...
                  </td>
                </tr>
              ) : delegations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    No active delegations found.
                  </td>
                </tr>
              ) : (
                delegations.map((d) => {
                  const canManage = d.delegator.id === user?.id || user?.role === 'Admin';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {d.delegator.fullName || d.delegator.username}
                        <span className="block text-xs font-normal text-slate-500">
                          @{d.delegator.username} • {d.delegator.role} • {d.delegator.division}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">
                        {d.delegatee.fullName || d.delegatee.username}
                        <span className="block text-xs font-normal text-slate-500">
                          @{d.delegatee.username} • {d.delegatee.role} • {d.delegatee.division}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {d.startDate} &rarr; {d.endDate}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">{d.reason || 'Leave'}</td>
                      <td className="px-6 py-4">
                        {d.isActive ? (
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                            Active
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {d.isActive && canManage && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEdit(d)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg font-medium transition"
                              title="Edit Delegation"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleCancelDelegation(d.id)}
                              className="text-xs text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg font-medium transition"
                              title="Revoke Delegation"
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Delegation */}
      {modalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              {editingDelegation ? 'Update Approval Delegation' : 'Create Approval Delegation'}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Authorize a same-role colleague to review & approve tasks on your behalf during your absence.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Substitute Approver (Same Role)
                </label>
                <select
                  required
                  value={formData.delegateeId}
                  onChange={(e) => setFormData({ ...formData, delegateeId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {candidates.length === 0 && (
                    <option value="">No candidate found with same role</option>
                  )}
                  {candidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} (@{u.username} - {u.role} - {u.division})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Delegation is strictly constrained to users holding the exact same role.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Reason / Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Cuti Tahunan / Out of Office"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow transition"
                >
                  {editingDelegation ? 'Save Changes' : 'Confirm Delegation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default DelegationsPage;
