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

  // Scanner Pairing Modal State
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [eventsList, setEventsList] = useState<{ id: string; title: string }[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [gateName, setGateName] = useState('');
  const [pairingData, setPairingData] = useState<{ pairingCode: string; expiresAt: string } | null>(null);
  const [generatingPairing, setGeneratingPairing] = useState(false);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

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

  const openScannerModal = async () => {
    setShowScannerModal(true);
    setPairingError(null);
    setCopiedCode(false);
    if (eventsList.length === 0) {
      setLoadingEvents(true);
      try {
        const res = await apiClient.getOrganizerEvents<any>();
        const evts = Array.isArray(res?.data) ? res.data : (res?.data?.events ?? []);
        const mapped = evts.map((e: any) => ({ id: e.id, title: e.title ?? e.name ?? 'Untitled Event' }));
        setEventsList(mapped);
        if (mapped.length > 0 && !selectedEventId) {
          setSelectedEventId(mapped[0].id);
        }
      } catch (err: any) {
        setPairingError(err?.message || 'Failed to load events for pairing.');
      } finally {
        setLoadingEvents(false);
      }
    }
  };

  const handleGeneratePairing = async () => {
    if (!selectedEventId) {
      setPairingError('Please select an event to associate with the gate scanner.');
      return;
    }
    setGeneratingPairing(true);
    setPairingError(null);
    try {
      const res = await apiClient.createScannerPairingToken<{ pairingCode: string; expiresAt: string }>({
        eventId: selectedEventId,
        gateId: gateName.trim() || undefined,
      });
      if (res.data) {
        setPairingData(res.data);
        const sec = Math.max(0, Math.floor((new Date(res.data.expiresAt).getTime() - Date.now()) / 1000));
        setRemainingSeconds(sec);
      }
    } catch (err: any) {
      setPairingError(err?.message || 'Failed to generate scanner pairing token.');
    } finally {
      setGeneratingPairing(false);
    }
  };

  // Countdown timer for pairing token
  useEffect(() => {
    if (!pairingData || remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      const sec = Math.max(0, Math.floor((new Date(pairingData.expiresAt).getTime() - Date.now()) / 1000));
      setRemainingSeconds(sec);
      if (sec <= 0) {
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [pairingData, remainingSeconds]);

  const copyPairingCode = () => {
    if (!pairingData?.pairingCode) return;
    navigator.clipboard.writeText(pairingData.pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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

  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return;
    }
    setMemberActionLoading(userId);
    setActionError(null);
    try {
      await apiClient.removeOrganizerTeamMember(userId);
      await fetchTeam();
    } catch (err: any) {
      setActionError(err?.message || 'Failed to remove member. Note: you cannot remove the last owner.');
    } finally {
      setMemberActionLoading(null);
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
        {(error || actionError) && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error || actionError}</span>
            <button onClick={() => { setActionError(null); fetchTeam(); }} className="font-bold underline ml-2">
              Dismiss
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
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamMembers.map((m) => {
                    const targetId = m.userId ?? m.id;
                    const memberName = m.name ?? m.user?.name ?? 'Organization Member';
                    return (
                      <tr key={m.id ?? m.userId} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {memberName}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono">
                          {m.email ?? m.user?.email ?? '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {m.role?.name ?? m.roleName ?? 'Member'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                            {m.status ?? 'active'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={memberActionLoading === targetId}
                            onClick={() => handleRemoveMember(targetId, memberName)}
                            className="px-2.5 py-1 rounded text-[10px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-colors"
                          >
                            {memberActionLoading === targetId ? 'Removing...' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Gate Scanner Device Pairing for Mobile Scanner App */}
        <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900/60 to-black/60 border border-purple-900/30 rounded-xl p-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(147,51,234,0.2)', border: '1px solid rgba(147,51,234,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c084fc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
                <h4 className="text-sm font-bold text-white">Mobile Gate Scanner App Pairing</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase">
                  ECDSA P-256 Offline Ready
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 max-w-xl">
                Gate staff can download the EventFlow Scanner mobile app on Android/iOS and scan an event access pass to verify tickets offline or online with instantaneous check-in deduplication.
              </p>
            </div>
            <button
              type="button"
              onClick={openScannerModal}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-purple-900/30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Generate Scanner Passkey
            </button>
          </div>
        </div>

        {/* Gate Scanner Pairing Modal */}
        {showScannerModal && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-zinc-950/95 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Mobile Gate Scanner Pairing</h3>
                    <p className="text-[11px] text-zinc-400">Single-use cryptographically signed gate authorization</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowScannerModal(false);
                    setPairingData(null);
                  }}
                  className="text-zinc-400 hover:text-white text-lg p-1"
                >
                  ✕
                </button>
              </div>

              {pairingError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
                  {pairingError}
                </div>
              )}

              {!pairingData ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Select Event *</label>
                    {loadingEvents ? (
                      <div className="text-xs text-zinc-400 py-2">Loading events...</div>
                    ) : eventsList.length === 0 ? (
                      <p className="text-xs text-amber-400">No active events found. Create an event before pairing scanners.</p>
                    ) : (
                      <select
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                      >
                        {eventsList.map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-zinc-300 block mb-1.5 font-medium">Gate / Entrance Identifier (Optional)</label>
                    <input
                      type="text"
                      value={gateName}
                      onChange={(e) => setGateName(e.target.value)}
                      placeholder="e.g. Gate 2 - VIP Access, North Turnstile"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200/90 leading-relaxed">
                    💡 <strong>How it works:</strong> Generates an ephemeral 10-minute pairing passkey. Field staff scan this QR code or enter the 6-character code in the mobile scanner app to download the offline validation keys and event roster.
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setShowScannerModal(false)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={generatingPairing || !selectedEventId}
                      onClick={handleGeneratePairing}
                      className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/40"
                    >
                      {generatingPairing ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Generating Passkey...
                        </>
                      ) : (
                        'Generate Pairing Passkey'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-center">
                  <div className="flex flex-col items-center justify-center p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                    {/* QR Code Container */}
                    <div className="bg-white p-2.5 rounded-xl shadow-lg mb-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          JSON.stringify({ pairingCode: pairingData.pairingCode, eventId: selectedEventId })
                        )}&margin=10`}
                        alt="Mobile Scanner Pairing QR"
                        className="w-40 h-40 block"
                      />
                    </div>

                    <span className="text-[11px] text-zinc-400 font-medium">Or enter 6-character passkey:</span>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="font-mono text-3xl font-black text-white tracking-widest bg-zinc-950 px-4 py-1.5 rounded-xl border border-purple-500/50 shadow-inner">
                        {pairingData.pairingCode}
                      </span>
                      <button
                        type="button"
                        onClick={copyPairingCode}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        {copiedCode ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* Expiry Countdown Timer */}
                    <div className="mt-3 text-xs">
                      {remainingSeconds > 0 ? (
                        <span className="text-amber-400 font-mono font-medium">
                          Expires in {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold">Passkey Expired</span>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 max-w-sm mx-auto">
                    Open the EventFlow Scanner app on iOS or Android, tap <strong>Scan Pairing QR</strong>, and point the camera at this screen.
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setPairingData(null)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      ← Generate for another event
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowScannerModal(false);
                        setPairingData(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
