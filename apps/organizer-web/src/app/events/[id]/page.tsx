'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { apiClient, ApiError } from '../../../lib/api';
import type {
  OrganizerEventDashboardDto,
  TicketTierDashboardDto,
  OrganizerOrderDto,
} from '@platform/types';

export default function EventCommandCenterPage() {
  const params = useParams();
  const eventId = params?.id as string;

  const [dashboard, setDashboard] = useState<OrganizerEventDashboardDto | null>(null);
  const [ticketTiers, setTicketTiers] = useState<TicketTierDashboardDto[]>([]);
  const [attendance, setAttendance] = useState<{ totalScans: number; scannerStatus: string; message: string } | null>(null);
  const [orders, setOrders] = useState<OrganizerOrderDto[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Destructive Confirmation Modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Add Ticket Tier Modal
  const [showAddTierModal, setShowAddTierModal] = useState(false);
  const [newTier, setNewTier] = useState({
    name: '',
    priceRupees: 500,
    quantity: 100,
    minPerOrder: 1,
    maxPerOrder: 10,
  });

  const fetchEventData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const [dashRes, attendanceRes, ordersRes, promotersRes] = await Promise.all([
        apiClient.getOrganizerEventDashboard<OrganizerEventDashboardDto>(eventId),
        apiClient.getOrganizerEventAttendance<{ totalScans: number; scannerStatus: string; message: string }>(eventId),
        apiClient.getOrganizerEventOrders<OrganizerOrderDto[]>(eventId, { limit: '10' }),
        apiClient.getOrganizerEventPromoters<any[]>(eventId),
      ]);

      setDashboard(dashRes.data);
      setTicketTiers(dashRes.data.ticketTiers ?? []);
      setAttendance(attendanceRes.data);
      setOrders(ordersRes.data ?? []);
      setPromoters(promotersRes.data ?? []);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load event command center metrics');
      } else {
        setError(err?.message || 'Network error occurred while fetching event data');
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);

  const handleStateTransition = async (action: 'submit' | 'publish' | 'unpublish' | 'cancel') => {
    setActionLoading(true);
    setActionError(null);
    try {
      if (action === 'submit') {
        await apiClient.submitEventForReview(eventId);
      } else if (action === 'publish') {
        await apiClient.publishEvent(eventId);
      } else if (action === 'unpublish') {
        await apiClient.unpublishEvent(eventId);
      } else if (action === 'cancel') {
        await apiClient.cancelEvent(eventId);
        setShowCancelModal(false);
      }
      await fetchEventData();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setActionError(err.message || `Failed to execute ${action} transition.`);
      } else {
        setActionError(err?.message || `Failed to transition event status.`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      await apiClient.createTicketType(eventId, {
        name: newTier.name.trim(),
        priceMinor: Math.round(Number(newTier.priceRupees) * 100),
        currency: 'INR',
        quantity: Number(newTier.quantity),
        minPerOrder: Number(newTier.minPerOrder),
        maxPerOrder: Number(newTier.maxPerOrder),
        status: 'active',
      });
      setShowAddTierModal(false);
      setNewTier({ name: '', priceRupees: 500, quantity: 100, minPerOrder: 1, maxPerOrder: 10 });
      await fetchEventData();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setActionError(err.message || 'Failed to create ticket tier.');
      } else {
        setActionError(err?.message || 'Error occurred while creating ticket tier.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (minor: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(minor / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse';
      case 'published':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'approved':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      case 'under_review':
      case 'submitted':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'cancelled':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/40';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <DashboardLayout
      title={dashboard?.title ?? 'Event Command Center'}
      subtitle={dashboard ? `Starts ${new Date(dashboard.startsAt).toLocaleString('en-IN')} · ID: ${eventId}` : undefined}
    >
      {loading ? (
        <div className="space-y-6">
          <div className="h-24 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
            ))}
          </div>
        </div>
      ) : error || !dashboard ? (
        <div className="glass-panel p-8 rounded-2xl border border-red-900/40 text-center max-w-lg mx-auto my-12">
          <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-700 flex items-center justify-center mx-auto mb-4 text-red-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Event Unavailable</h3>
          <p className="text-xs text-slate-400 mb-5">{error ?? 'Event not found or access denied.'}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={fetchEventData}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold"
            >
              Retry
            </button>
            <Link
              href="/events"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Back to Events
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Action Error Notification */}
          {actionError && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
              <span>{actionError}</span>
              <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Command Center Control Header */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(dashboard.status)}`}>
                {dashboard.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: {eventId}</span>
            </div>

            {/* Authoritative State Transition Action Buttons */}
            <div className="flex items-center gap-2">
              {dashboard.status === 'draft' && (
                <button
                  onClick={() => handleStateTransition('submit')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600/30 text-blue-200 border border-blue-500/40 text-xs font-semibold hover:bg-blue-600/40 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? 'Submitting...' : 'Submit for Review'}
                </button>
              )}

              {dashboard.status === 'approved' && (
                <button
                  onClick={() => handleStateTransition('publish')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? 'Publishing...' : '🚀 Publish Event'}
                </button>
              )}

              {dashboard.status === 'published' && (
                <button
                  onClick={() => handleStateTransition('unpublish')}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-amber-600/30 text-amber-200 border border-amber-500/40 text-xs font-semibold hover:bg-amber-600/40 disabled:opacity-50 transition-all"
                >
                  {actionLoading ? 'Updating...' : '⏸ Unpublish Event'}
                </button>
              )}

              {dashboard.status !== 'cancelled' && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-500/20 disabled:opacity-50 transition-all"
                >
                  Cancel Event
                </button>
              )}
            </div>
          </div>

          {/* Operational Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block mb-1">Gross Ticket Sales</span>
              <p className="text-xl font-bold text-slate-100">{formatCurrency(dashboard.grossSalesMinor)}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Authoritative Ledger Value</p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block mb-1">Sold Tickets</span>
              <p className="text-xl font-bold text-slate-100">
                {dashboard.totalTicketsSold} / {dashboard.totalCapacity}
              </p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, dashboard.capacityUtilization)}%` }}
                />
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block mb-1">Gate Scans (Attendance)</span>
              <p className="text-xl font-bold text-slate-100">{attendance?.totalScans ?? dashboard.totalCheckins}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{attendance?.scannerStatus === 'active' ? 'Live turnstile active' : 'Scanner gate pending'}</p>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400 font-medium block mb-1">Active Tiers</span>
              <p className="text-xl font-bold text-slate-100">{ticketTiers.length} Configured</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Promoter Campaigns: {promoters.length}</p>
            </div>
          </div>

          {/* Ticket Tiers Management */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-200">Ticket Tiers & Inventory</h3>
              <button
                onClick={() => setShowAddTierModal(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                + Add Ticket Tier
              </button>
            </div>

            {ticketTiers.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400 mb-2">No ticket tiers configured for this event yet.</p>
                <button
                  onClick={() => setShowAddTierModal(true)}
                  className="px-3.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold"
                >
                  Configure First Tier
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Tier Name</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Capacity</th>
                      <th className="py-2.5 px-3">Sold</th>
                      <th className="py-2.5 px-3">Reserved (Hold)</th>
                      <th className="py-2.5 px-3">Remaining</th>
                      <th className="py-2.5 px-3 text-right">Gross Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ticketTiers.map((tier) => (
                      <tr key={tier.ticketTypeId} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-semibold text-slate-200">{tier.name}</td>
                        <td className="py-3 px-3 font-mono text-purple-300">{formatCurrency(tier.priceMinor)}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{tier.capacity}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{tier.soldQuantity}</td>
                        <td className="py-3 px-3 font-mono text-amber-400">{tier.reservedQuantity}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{tier.remainingQuantity}</td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-100 text-right">
                          {formatCurrency(tier.grossSalesMinor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Orders & Promoters Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Orders Feed */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold text-slate-200">Recent Event Orders</h3>
                <Link href="/orders" className="text-xs text-purple-400 hover:text-purple-300">
                  View All →
                </Link>
              </div>

              {orders.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No orders placed for this event yet.</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((ord) => (
                    <div
                      key={ord.orderId}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-300">{ord.orderId.substring(0, 8)}...</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{ord.purchaserName ?? ord.purchaserEmail ?? 'Attendee'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-200">{formatCurrency(ord.totalMinor)}</p>
                        {ord.promoterCode && (
                          <span className="text-[10px] text-purple-400 font-mono">Code: {ord.promoterCode}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Promoters Feed */}
            <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold text-slate-200">Promoter Campaigns</h3>
                <Link href="/promoters" className="text-xs text-purple-400 hover:text-purple-300">
                  Manage →
                </Link>
              </div>

              {promoters.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No promoter campaigns linked to this event.</p>
              ) : (
                <div className="space-y-2">
                  {promoters.map((p) => (
                    <div
                      key={p.campaignId}
                      className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-purple-300">{p.code}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Commission: {p.commissionType === 'percentage' ? `${p.commissionValue}%` : `₹${p.commissionValue}`}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Event Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-red-900/60 max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-600 flex items-center justify-center mx-auto text-red-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-white text-center">Confirm Event Cancellation</h3>
            <p className="text-xs text-slate-400 text-center">
              Cancelling this event will halt ticket sales and change the authoritative backend state to cancelled. This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Keep Event
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStateTransition('cancel')}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Cancelling...' : 'Yes, Cancel Event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Ticket Tier Modal */}
      {showAddTierModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Add New Ticket Tier</h3>
            <form onSubmit={handleAddTier} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Tier Name *</label>
                <input
                  type="text"
                  required
                  value={newTier.name}
                  onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                  placeholder="e.g. VIP Backstage Pass"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newTier.priceRupees}
                    onChange={(e) => setNewTier({ ...newTier, priceRupees: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Total Capacity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newTier.quantity}
                    onChange={(e) => setNewTier({ ...newTier, quantity: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Min Per Order</label>
                  <input
                    type="number"
                    min={1}
                    value={newTier.minPerOrder}
                    onChange={(e) => setNewTier({ ...newTier, minPerOrder: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Max Per Order</label>
                  <input
                    type="number"
                    min={1}
                    value={newTier.maxPerOrder}
                    onChange={(e) => setNewTier({ ...newTier, maxPerOrder: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setShowAddTierModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Creating Tier...' : 'Create Ticket Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
