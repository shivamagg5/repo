// =============================================================================
// venue-web — Venue Staff Directory & Invitations
// Real staff management wired to GET/POST /venue/staff.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VenueLayout } from '../../components/VenueLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function VenueStaffPage() {
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('venue_manager');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getVenueStaff<any>();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setStaffMembers(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load venue staff list.');
      } else {
        setError(err?.message || 'Error occurred while loading staff roster.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    try {
      await apiClient.inviteVenueStaff({
        email: inviteEmail.trim(),
        roleName: inviteRole,
      });

      setInviteSuccess(`Invitation sent successfully to ${inviteEmail}.`);
      setInviteEmail('');
      setTimeout(async () => {
        setShowInviteModal(false);
        setInviteSuccess(null);
        await fetchStaff();
      }, 1500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setInviteError(err.message || 'Failed to send staff invitation.');
      } else {
        setInviteError(err?.message || 'Error occurred while inviting staff.');
      }
    } finally {
      setInviting(false);
    }
  };

  return (
    <VenueLayout title="Venue Staff" subtitle="Venue operational staff directory and team invitations">
      <div className="space-y-4">
        {/* Header Actions Bar */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Venue Staff Members ({staffMembers.length})</span>
          <button
            onClick={() => {
              setShowInviteModal(true);
              setInviteError(null);
              setInviteSuccess(null);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:brightness-110"
          >
            + Invite Staff Member
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchStaff} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Staff Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading venue staff directory...</div>
          ) : staffMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No staff members registered for this venue organization.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {staffMembers.map((s) => (
                    <tr key={s.id ?? s.userId} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-semibold text-slate-200">{s.user?.name ?? s.name ?? 'Staff Member'}</td>
                      <td className="py-3 px-3 text-slate-400 font-mono">{s.user?.email ?? s.email ?? '—'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 capitalize">
                          {s.roleName?.replace('_', ' ') ?? s.role ?? 'Staff'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {s.status ?? 'active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Staff Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-xl border border-slate-800 max-w-md w-full space-y-4">
              <h3 className="text-base font-bold text-slate-100">Invite Venue Staff Member</h3>

              {inviteError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {inviteError}
                </div>
              )}
              {inviteSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  {inviteSuccess}
                </div>
              )}

              <form onSubmit={handleInvite} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Operational Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm capitalize"
                  >
                    <option value="venue_manager">Venue Manager</option>
                    <option value="venue_staff">Venue Staff</option>
                    <option value="box_office">Box Office</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 disabled:opacity-50"
                  >
                    {inviting ? 'Sending Invite...' : 'Send Staff Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </VenueLayout>
  );
}
