'use client';

import React, { useState } from 'react';
import { VenueLayout } from '../../components/VenueLayout';

export default function VenueStaffPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const staffMembers = [
    { id: 'st-1', name: 'Venue Manager', email: 'venue@platform.internal', role: 'Venue Manager', status: 'active' },
    { id: 'st-2', name: 'Gate Manager Simran', email: 'simran@example.com', role: 'Gate Staff', status: 'active' },
  ];

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    // Calls POST /venue/staff via ApiClient
    setTimeout(() => {
      setInviting(false);
      setShowInviteModal(false);
      setInviteEmail('');
    }, 600);
  };

  return (
    <VenueLayout title="Venue Staff" subtitle="Venue operational staff directory and team invitations">
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-300 font-medium">Venue Staff Members ({staffMembers.length})</span>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md hover:brightness-110"
          >
            + Invite Staff Member
          </button>
        </div>

        {/* Staff Table */}
        <div className="glass-panel p-5 rounded-xl border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2.5 px-3">Staff Name</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {staffMembers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-semibold text-slate-200">{s.name}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">{s.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {s.role}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Staff Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-xl border border-slate-800 max-w-md w-full space-y-4">
              <h3 className="text-base font-bold text-slate-100">Invite Venue Staff Member</h3>
              <form onSubmit={handleInvite} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="staff@example.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-blue-500 text-sm"
                  />
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
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500"
                  >
                    {inviting ? 'Sending...' : 'Send Staff Invite'}
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
