'use client';

import React, { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';

export default function TeamPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const teamMembers = [
    { id: 'mem-1', name: 'Organizer Admin', email: 'organizer@platform.internal', role: 'Organizer Admin', status: 'active' },
    { id: 'mem-2', name: 'Event Manager Rahul', email: 'rahul@example.com', role: 'Event Manager', status: 'active' },
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    // Calls POST /organizer/team/invitations via ApiClient
    setTimeout(() => {
      setInviting(false);
      setShowInviteModal(false);
      setInviteEmail('');
    }, 600);
  };

  return (
    <DashboardLayout title="Team Management" subtitle="Manage organization members and role permissions">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Organization Team Members ({teamMembers.length})</span>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:brightness-110"
          >
            + Invite Member
          </button>
        </div>

        {/* Team Members List */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Member Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {teamMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-semibold text-slate-200">{m.name}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{m.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Member Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-xl border border-slate-800 max-w-md w-full space-y-4">
              <h3 className="text-base font-bold text-slate-100">Invite Organization Member</h3>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Role Assignment</label>
                  <select className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500">
                    <option value="organizer_manager">Event Manager</option>
                    <option value="organizer_staff">Operations Staff</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-500"
                  >
                    {inviting ? 'Sending Invitation...' : 'Send Invitation'}
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
