// =============================================================================
// admin-web — CMS & Content Management
// Manage consumer discovery banners, collections, and featured editorial items.
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '../../components/AdminLayout';
import { apiClient, ApiError } from '../../lib/api';

export default function AdminCmsPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Banner Modal State
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [bannerLinkUrl, setBannerLinkUrl] = useState('');
  const [bannerSortOrder, setBannerSortOrder] = useState('1');
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Create Collection Modal State
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [colName, setColName] = useState('');
  const [colSlug, setColSlug] = useState('');
  const [colDesc, setColDesc] = useState('');
  const [savingCol, setSavingCol] = useState(false);
  const [colError, setColError] = useState<string | null>(null);

  const fetchCmsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bannersRes, featuredRes] = await Promise.allSettled([
        apiClient.getCmsBanners<any>(),
        apiClient.getCmsFeaturedEvents<any>(),
      ]);

      const bList = bannersRes.status === 'fulfilled' ? bannersRes.value.data : [];
      const fList = featuredRes.status === 'fulfilled' ? featuredRes.value.data : [];

      setBanners(Array.isArray(bList) ? bList : (bList?.items ?? []));
      setFeaturedEvents(Array.isArray(fList) ? fList : (fList?.items ?? []));
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load CMS content records.');
      } else {
        setError(err?.message || 'Error occurred while loading CMS.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCmsData();
  }, [fetchCmsData]);

  const handleCreateBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim() || !bannerImageUrl.trim()) return;

    setSavingBanner(true);
    setBannerError(null);
    try {
      await apiClient.createCmsBanner({
        title: bannerTitle.trim(),
        imageUrl: bannerImageUrl.trim(),
        linkUrl: bannerLinkUrl.trim() || undefined,
        sortOrder: parseInt(bannerSortOrder, 10) || 0,
      });

      setShowBannerModal(false);
      setBannerTitle('');
      setBannerImageUrl('');
      setBannerLinkUrl('');
      await fetchCmsData();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setBannerError(err.message || 'Failed to create banner.');
      } else {
        setBannerError(err?.message || 'Error occurred while saving banner.');
      }
    } finally {
      setSavingBanner(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!colName.trim()) return;

    setSavingCol(true);
    setColError(null);
    try {
      await apiClient.createCmsCollection({
        name: colName.trim(),
        slug: (colSlug.trim() || colName.toLowerCase().replace(/[^a-z0-9]+/g, '-')).replace(/^-|-$/g, ''),
        description: colDesc.trim() || undefined,
      });

      setShowCollectionModal(false);
      setColName('');
      setColSlug('');
      setColDesc('');
      await fetchCmsData();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setColError(err.message || 'Failed to create collection.');
      } else {
        setColError(err?.message || 'Error occurred while saving collection.');
      }
    } finally {
      setSavingCol(false);
    }
  };

  return (
    <AdminLayout
      title="CMS & Discovery Content"
      subtitle="Manage homepage banners, curated event collections, and editorial discovery blocks"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowCollectionModal(true);
              setColError(null);
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-bold transition-colors"
          >
            + New Collection
          </button>
          <button
            onClick={() => {
              setShowBannerModal(true);
              setBannerError(null);
            }}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-lg shadow-red-950/40"
          >
            + Create Banner
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs flex justify-between items-center">
            <span>{error}</span>
            <button onClick={fetchCmsData} className="font-bold underline ml-2">Retry</button>
          </div>
        )}

        {/* Discovery Banners Section */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Active Discovery Banners ({banners.length})
            </h3>
            <button onClick={fetchCmsData} title="Refresh Banners" className="p-1 rounded bg-slate-800 text-xs text-slate-300">🔄</button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">Loading discovery banner assets...</div>
          ) : banners.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No active banners found. Create your first banner above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((b) => (
                <div key={b.id} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-sm text-white truncate">{b.title}</p>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">Order: {b.sortOrder ?? 0}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">Image: {b.imageUrl}</p>
                  {b.linkUrl && <p className="text-[11px] text-purple-400 font-mono truncate">Link: {b.linkUrl}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Featured Events Section */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Featured Editorial Events ({featuredEvents.length})
          </h3>
          {featuredEvents.length === 0 ? (
            <p className="text-xs text-slate-400">No featured event slots currently pinned to discovery homepage.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {featuredEvents.map((f) => (
                <div key={f.id} className="py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">{f.title ?? f.event?.title ?? 'Featured Event'}</p>
                    <p className="text-[11px] text-slate-400 font-mono">ID: {f.eventId ?? f.id}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    PINNED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Banner Modal */}
        {showBannerModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Create Discovery Banner</h3>
              <p className="text-xs text-slate-400">Publish a promotional hero banner on the consumer discovery portal.</p>

              {bannerError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">{bannerError}</div>
              )}

              <form onSubmit={handleCreateBanner} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Banner Title *</label>
                  <input
                    type="text"
                    required
                    value={bannerTitle}
                    onChange={(e) => setBannerTitle(e.target.value)}
                    placeholder="e.g. Summer Music Festival Season 2026"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Image URL *</label>
                  <input
                    type="url"
                    required
                    value={bannerImageUrl}
                    onChange={(e) => setBannerImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Target Link URL (Optional)</label>
                  <input
                    type="text"
                    value={bannerLinkUrl}
                    onChange={(e) => setBannerLinkUrl(e.target.value)}
                    placeholder="/events/summer-fest-2026"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={bannerSortOrder}
                    onChange={(e) => setBannerSortOrder(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowBannerModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingBanner || !bannerTitle.trim() || !bannerImageUrl.trim()}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {savingBanner ? 'Publishing...' : 'Publish Banner'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Collection Modal */}
        {showCollectionModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-slate-100">Create Curated Collection</h3>
              <p className="text-xs text-slate-400">Curate themed event collections for consumer discovery.</p>

              {colError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs">{colError}</div>
              )}

              <form onSubmit={handleCreateCollection} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Collection Name *</label>
                  <input
                    type="text"
                    required
                    value={colName}
                    onChange={(e) => setColName(e.target.value)}
                    placeholder="e.g. Weekend Music Fest & Nightlife"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Slug (Optional)</label>
                  <input
                    type="text"
                    value={colSlug}
                    onChange={(e) => setColSlug(e.target.value)}
                    placeholder="weekend-music-fest"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={colDesc}
                    onChange={(e) => setColDesc(e.target.value)}
                    placeholder="Curated selection of top concerts..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowCollectionModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCol || !colName.trim()}
                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {savingCol ? 'Creating...' : 'Create Collection'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
