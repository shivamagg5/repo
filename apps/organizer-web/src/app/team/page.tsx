'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Organizer Member');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getOrganizerTeam<any[]>();
      setTeamMembers(res.data ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load organization team members.');
      } else {
        setError(err?.message || 'Network error occurred while fetching team.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      await apiClient.inviteTeamMember({
        email: inviteEmail.trim(),
        roleName: inviteRole,
      });

      setInviteSuccess(`Invitation successfully sent to ${inviteEmail}.`);
      setInviteEmail('');
      await fetchTeam();

      setTimeout(() => {
        setShowInviteModal(false);
        setInviteSuccess(null);
      }, 1500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setInviteError(err.message || 'Failed to invite team member.');
      } else {
        setInviteError(err?.message || 'Error occurred while sending invitation.');
      }
    } finally {
      setInviting(false);
    }
  };

  return (
    <DashboardLayout title="Team Management" subtitle="Manage organization members and role permissions">
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">
            Organization Team Members ({teamMembers.length})
          </span>
          <button
            onClick={() => {
              setShowInviteModal(true);
              setInviteError(null);
              setInviteSuccess(null);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:brightness-110 transition-all"
          >
            + Invite Member
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchTeam} className="font-bold underline ml-2">
              Retry
            </button>
          </div>
        )}

        {/* Team Members Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Loading verified organization memberships...
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No organization members found. Invite your first team member above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamMembers.map((m) => (
                    <tr key={m.id ?? m.userId} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 font-semibold text-slate-200">
                        {m.name ?? m.user?.name ?? 'Organization Member'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono">
                        {m.email ?? m.user?.email ?? '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {m.role?.name ?? m.roleName ?? 'Member'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {m.status ?? 'active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Invite Organization Member</h3>
              <p className="text-xs text-slate-400">
                Send an invitation to join your organization with assigned permissions.
              </p>

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

              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Role Assignment</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    <option value="Organizer Admin">Organizer Admin</option>
                    <option value="Event Manager">Event Manager</option>
                    <option value="Operations Staff">Operations Staff</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {inviting ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
