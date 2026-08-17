// =============================================================================
// consumer-web — In-App Notifications & Delivery Preferences
// Real notifications inbox and communication preferences from backend APIs.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@platform/auth';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { apiClient, ApiError } from '../../lib/api';

export default function ConsumerNotificationsPage() {
  const router = useRouter();
  const { status } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Preferences State
  const [showPrefModal, setShowPrefModal] = useState(false);
  const [marketingEmail, setMarketingEmail] = useState(true);
  const [marketingPush, setMarketingPush] = useState(true);
  const [transactionalEmail, setTransactionalEmail] = useState(true);
  const [transactionalSms, setTransactionalSms] = useState(true);
  const [savingPref, setSavingPref] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getInAppNotifications<any>();
      const list = Array.isArray(res.data) ? res.data : (res.data?.items ?? []);
      setNotifications(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load in-app notifications.');
      } else {
        setError(err?.message || 'Error occurred while loading notifications.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchNotifications();
    } else if (status === 'unauthenticated') {
      router.replace('/auth/login?redirectTo=/notifications');
    }
  }, [status, fetchNotifications, router]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPref(true);
    setPrefSuccess(null);
    try {
      await apiClient.updateNotificationPreferences({
        marketingEmail,
        marketingPush,
        transactionalEmail,
        transactionalSms,
      });

      setPrefSuccess('Communication preferences updated successfully.');
      setTimeout(() => {
        setShowPrefModal(false);
        setPrefSuccess(null);
      }, 1500);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update preferences.');
      }
    } finally {
      setSavingPref(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">Notifications & Alerts</h1>
            <p className="text-xs text-gray-400 mt-1">Real-time order receipts, gate updates, and event announcements</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPrefModal(true)}
              className="px-4 py-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs font-semibold text-gray-200 transition-colors"
            >
              ⚙️ Delivery Preferences
            </button>
            <button
              onClick={fetchNotifications}
              title="Refresh Notifications"
              className="p-2 rounded-xl bg-gray-900 border border-gray-800 hover:bg-gray-800 text-xs text-gray-300 transition-colors"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchNotifications} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Notifications Feed */}
        <div className="glass-surface p-6 rounded-3xl border border-gray-800 bg-[#12151D]/60 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-gray-400 animate-pulse">Loading notification feed...</div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs space-y-2">
              <span className="text-3xl block">📭</span>
              <p className="font-bold text-white">You're all caught up!</p>
              <p className="text-gray-400">Order confirmations, QR ticket delivery, and gate changes will appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {notifications.map((n) => (
                <div key={n.id} className="py-4 flex items-start gap-4 text-xs">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    {n.type === 'ticket' ? '🎟️' : n.type === 'order' ? '📦' : '🔔'}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold text-white">{n.title ?? 'Platform Notification'}</p>
                    <p className="text-gray-400 leading-relaxed">{n.body ?? n.message ?? '—'}</p>
                    {n.link && (
                      <Link href={n.link} className="text-purple-400 hover:underline font-semibold text-[11px] inline-block mt-1">
                        View Details →
                      </Link>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                    {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Preferences Modal */}
        {showPrefModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-surface p-6 rounded-3xl border border-gray-800 max-w-md w-full space-y-4 bg-[#161922] shadow-2xl">
              <h3 className="text-base font-bold text-white">Communication Preferences</h3>
              <p className="text-xs text-gray-400">Control channels for transactional receipts vs event recommendations.</p>

              {prefSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
                  ✓ {prefSuccess}
                </div>
              )}

              <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
                    <span>Transactional Order Emails (Receipts & QR Codes)</span>
                    <input
                      type="checkbox"
                      checked={transactionalEmail}
                      onChange={(e) => setTransactionalEmail(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
                    <span>Transactional SMS Gate Alerts</span>
                    <input
                      type="checkbox"
                      checked={transactionalSms}
                      onChange={(e) => setTransactionalSms(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
                    <span>Marketing & Curated Event Recommendations</span>
                    <input
                      type="checkbox"
                      checked={marketingEmail}
                      onChange={(e) => setMarketingEmail(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer">
                    <span>Push Notifications</span>
                    <input
                      type="checkbox"
                      checked={marketingPush}
                      onChange={(e) => setMarketingPush(e.target.checked)}
                      className="rounded text-purple-600 focus:ring-purple-500"
                    />
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowPrefModal(false)}
                    className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPref}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {savingPref ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
