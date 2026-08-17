// =============================================================================
// admin-web — Immutable Governance Audit Logs
// Append-only ledger of administrative moderation, refunds, and policy actions.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedAction, setSelectedAction] = useState('all');

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (selectedAction !== 'all') params['action'] = selectedAction;

      const res = await apiClient.getAdminAuditLogs<any>(params);
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setLogs(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load governance audit logs.');
      } else {
        setError(err?.message || 'Error occurred while loading audit trail.');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedAction]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <AdminLayout
      title="Immutable Governance Audit Logs"
      subtitle="Cryptographically tracked, append-only record of all administrative, financial, and moderation decisions"
    >
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-wrap justify-between items-center bg-[#0C101A] p-4 rounded-2xl border border-slate-800 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Filter Action:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
            >
              <option value="all">All Actions</option>
              <option value="user.suspend">user.suspend</option>
              <option value="user.restore">user.restore</option>
              <option value="event.approve">event.approve</option>
              <option value="event.reject">event.reject</option>
              <option value="event.suspend">event.suspend</option>
              <option value="order.refund">order.refund</option>
              <option value="settlement.approve">settlement.approve</option>
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>Audit Entries: <strong className="text-slate-200">{logs.length}</strong></span>
            <button
              onClick={fetchAuditLogs}
              title="Refresh Audit Logs"
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
            <button onClick={fetchAuditLogs} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Logs Table */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-400 animate-pulse">
              Querying append-only governance audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No audit log records match the selected action filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Log ID</th>
                    <th className="py-2.5 px-3">Action Event</th>
                    <th className="py-2.5 px-3">Actor / Admin</th>
                    <th className="py-2.5 px-3">Target Reference</th>
                    <th className="py-2.5 px-3">Metadata / Details</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {logs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-3 text-slate-500">
                        {l.id?.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-3 text-red-300 font-bold">
                        {l.action}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        {l.actorId?.substring(0, 8) ?? l.actorEmail ?? 'System'}
                      </td>
                      <td className="py-3 px-3 text-purple-300">
                        {l.targetId ?? '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-400 truncate max-w-xs font-sans text-xs">
                        {l.metadata ? JSON.stringify(l.metadata) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400">
                        {l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
