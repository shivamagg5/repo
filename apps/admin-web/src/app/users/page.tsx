// =============================================================================
// admin-web — User Governance & Moderation
// Authoritative account inspection, search, suspension, and restoration.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';
import { useAnalytics } from '@platform/auth';

export default function AdminUsersPage() {
  const { track } = useAnalytics(apiClient);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Suspension modal state
  const [targetUser, setTargetUser] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Restore confirmation modal state
  const [restoreTargetUser, setRestoreTargetUser] = useState<any | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (selectedStatus !== 'all') params['status'] = selectedStatus;
      if (searchQuery.trim()) params['search'] = searchQuery.trim();

      const res = await apiClient.getAdminUsers<any>(params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setUsers(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load user directory.');
      } else {
        setError(err?.message || 'Network error occurred while fetching users.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUser || !suspendReason.trim()) return;

    setProcessingAction(true);
    setActionError(null);
    try {
      await apiClient.suspendAdminUser(targetUser.id, {
        reason: suspendReason.trim(),
      });
      track('user_suspended', { reason: suspendReason.trim() });
      setTargetUser(null);
      setSuspendReason('');
      await fetchUsers();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setActionError(err.message || 'Failed to suspend user account.');
      } else {
        setActionError(err?.message || 'Error occurred during user suspension.');
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTargetUser) return;

    setProcessingAction(true);
    setActionError(null);
    try {
      await apiClient.restoreAdminUser(restoreTargetUser.id);
      setRestoreTargetUser(null);
      await fetchUsers();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setActionError(err.message || 'Failed to restore user account.');
      } else {
        setActionError(err?.message || 'Error occurred during user restoration.');
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'suspended':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'pending_verification':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <AdminLayout
      title="User Governance"
      subtitle="Search, audit, suspend, and restore platform user accounts"
    >
      <div className="space-y-4">
        {/* Filter and Search Bar */}
        <div className="flex flex-wrap justify-between items-center bg-[#0C101A] p-4 rounded-2xl border border-slate-800 gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user name or email..."
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 w-64 font-medium"
            />

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {['all', 'active', 'suspended', 'pending_verification'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                    selectedStatus === st
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Accounts: <strong className="text-slate-200">{users.length}</strong></span>
            <button
              onClick={fetchUsers}
              title="Refresh User Directory"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchUsers} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Querying verified user directory from database...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No platform accounts found matching the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">User ID</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Registered At</th>
                    <th className="py-2.5 px-3 text-right">Governance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {u.id?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {u.name ?? 'Account User'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {u.email ?? '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBadge(u.status)}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {u.status === 'suspended' ? (
                          <button
                            onClick={() => {
                              setRestoreTargetUser(u);
                              setActionError(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 font-semibold text-[11px] transition-colors"
                          >
                            Restore Access
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setTargetUser(u);
                              setSuspendReason('');
                              setActionError(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-semibold text-[11px] transition-colors"
                          >
                            Suspend User
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Suspend User Modal */}
        {targetUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-red-900/50 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-red-400">Suspend Platform User Account</h3>
              <p className="text-xs text-slate-300">
                Suspending <strong className="text-white">{targetUser.email}</strong> will immediately terminate active sessions and block ticket purchases / administrative capabilities.
              </p>

              {actionError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleSuspend} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Reason for Suspension *</label>
                  <textarea
                    required
                    rows={3}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Provide justification for security / moderation audit trail..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setTargetUser(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingAction || !suspendReason.trim()}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {processingAction ? 'Suspending...' : 'Confirm Suspension'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Restore User Modal */}
        {restoreTargetUser && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Restore User Account Access</h3>
              <p className="text-xs text-slate-300">
                Are you sure you want to restore access for <strong className="text-white">{restoreTargetUser.email}</strong>? Account will return to active status.
              </p>

              {actionError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {actionError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestoreTargetUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={processingAction}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {processingAction ? 'Restoring...' : 'Confirm Restoration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
