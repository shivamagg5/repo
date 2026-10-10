'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { apiClient, ApiError } from '../../lib/api';
import type {
  OrganizerMarketingOverviewDto,
  OrganizerCampaignDto,
  OrganizerCreditWalletDto,
} from '@platform/types';

type MarketingTab = 'transactions' | 'past_campaigns' | 'whatsapp' | 'qr_campaigns' | 'menu_qr';

const CAMPAIGN_TYPES = [
  'WhatsApp Blast',
  'SMS Campaign',
  'Email Newsletter',
  'QR Code Campaign',
];

export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<MarketingTab>('transactions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live data
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [wallet, setWallet] = useState<OrganizerCreditWalletDto | null>(null);
  const [campaigns, setCampaigns] = useState<OrganizerCampaignDto[]>([]);
  const [overview, setOverview] = useState<OrganizerMarketingOverviewDto | null>(null);

  // Add Credits modal
  const [showAddCredits, setShowAddCredits] = useState(false);
  const [creditsInput, setCreditsInput] = useState('');
  const [billingType, setBillingType] = useState<'individual' | 'company' | 'firm'>('individual');
  const [firmName, setFirmName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [submittingCredits, setSubmittingCredits] = useState(false);
  const [topupMessage, setTopupMessage] = useState<string | null>(null);

  // Campaign modal
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignType, setCampaignType] = useState('WhatsApp Blast');
  const [campaignEvent, setCampaignEvent] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [campaignCode, setCampaignCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState('10');
  const [submittingCampaign, setSubmittingCampaign] = useState(false);
  const [campaignMessage, setCampaignMessage] = useState<string | null>(null);

  // Menu QR State
  const [selectedMenuEventId, setSelectedMenuEventId] = useState('');
  const [generatedMenuUrl, setGeneratedMenuUrl] = useState<string | null>(null);
  const [copiedMenuUrl, setCopiedMenuUrl] = useState(false);

  // WhatsApp Template State
  const [whatsappTemplates, setWhatsappTemplates] = useState<any[]>([]);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [wtName, setWtName] = useState('');
  const [wtCategory, setWtCategory] = useState('marketing');
  const [wtLanguage, setWtLanguage] = useState('en');
  const [wtHeaderText, setWtHeaderText] = useState('');
  const [wtBody, setWtBody] = useState('Hey {{1}}, your tickets for {{2}} are ready! View live event pass: {{3}}');
  const [wtButtonUrl, setWtButtonUrl] = useState('https://eventflow.in/tickets');
  const [submittingWt, setSubmittingWt] = useState(false);
  const [wtMessage, setWtMessage] = useState<string | null>(null);

  // QR Stand Campaigns State
  const [qrCampaigns, setQrCampaigns] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('pulsr_organizer_qr_campaigns');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return [];
  });
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrName, setQrName] = useState('');
  const [qrEventId, setQrEventId] = useState('');
  const [qrPlacement, setQrPlacement] = useState('Main Gate Poster');
  const [qrPromoCode, setQrPromoCode] = useState('');
  const [copiedQrId, setCopiedQrId] = useState<string | null>(null);

  const creditsNum = parseInt(creditsInput, 10) || 0;
  const gst = creditsNum * 0.18;
  const netAmount = creditsNum + gst;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, walletRes, campaignsRes, overviewRes, wtRes] = await Promise.allSettled([
        apiClient.getOrganizerEvents<any>(),
        apiClient.getOrganizerMarketingCredits<OrganizerCreditWalletDto>(),
        apiClient.getOrganizerMarketingCampaigns<OrganizerCampaignDto[]>(),
        apiClient.getOrganizerMarketingOverview<OrganizerMarketingOverviewDto>(),
        apiClient.getOrganizerWhatsappTemplates<any[]>(),
      ]);

      if (eventsRes.status === 'fulfilled') {
        const d: any = eventsRes.value?.data;
        const evts = Array.isArray(d) ? d : (d?.events ?? d?.data ?? []);
        setEvents(evts.map((e: any) => ({ id: e.id, title: e.title ?? e.name ?? 'Untitled Event' })));
      }
      if (walletRes.status === 'fulfilled' && walletRes.value.data) {
        setWallet(walletRes.value.data);
      }
      if (campaignsRes.status === 'fulfilled' && campaignsRes.value.data) {
        setCampaigns(campaignsRes.value.data);
      }
      if (overviewRes.status === 'fulfilled' && overviewRes.value.data) {
        setOverview(overviewRes.value.data);
      }
      if (wtRes.status === 'fulfilled' && wtRes.value.data) {
        const list = Array.isArray(wtRes.value.data) ? wtRes.value.data : ((wtRes.value.data as any)?.items ?? []);
        setWhatsappTemplates(list);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load marketing dashboard.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCredits = async () => {
    if (creditsNum < 100) return;
    setSubmittingCredits(true);
    setTopupMessage(null);
    try {
      await apiClient.topupOrganizerMarketingCredits({
        credits: creditsNum,
        billingType,
        firmName: firmName || undefined,
        billingEmail: billingEmail || undefined,
        country,
        state: state || undefined,
        city: city || undefined,
        address: address || undefined,
      });

      setTopupMessage('Credits successfully added to wallet!');
      setCreditsInput('');
      await fetchData();
      setTimeout(() => {
        setShowAddCredits(false);
        setTopupMessage(null);
      }, 1500);
    } catch (err: any) {
      setTopupMessage(err?.message || 'Failed to add credits.');
    } finally {
      setSubmittingCredits(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignType || !campaignEvent || !campaignName || !campaignCode) return;
    setSubmittingCampaign(true);
    setCampaignMessage(null);
    try {
      await apiClient.createOrganizerMarketingCampaign({
        eventId: campaignEvent,
        name: campaignName.trim(),
        code: campaignCode.trim().toUpperCase(),
        campaignType: campaignType as any,
        discountType: 'percentage',
        discountValueMinor: (parseInt(discountPercent, 10) || 10) * 100,
      });

      setCampaignMessage('Campaign launched successfully!');
      setCampaignName('');
      setCampaignCode('');
      await fetchData();
      setTimeout(() => {
        setShowCampaignModal(false);
        setCampaignMessage(null);
      }, 1500);
    } catch (err: any) {
      setCampaignMessage(err?.message || 'Failed to create campaign.');
    } finally {
      setSubmittingCampaign(false);
    }
  };

  const handleCreateWhatsappTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wtName.trim() || !wtBody.trim()) {
      setWtMessage('Template name and body message are required.');
      return;
    }
    setSubmittingWt(true);
    setWtMessage(null);
    try {
      await apiClient.createOrganizerWhatsappTemplate({
        name: wtName.trim(),
        category: wtCategory,
        language: wtLanguage,
        headerText: wtHeaderText.trim() || undefined,
        body: wtBody.trim(),
        buttonUrl: wtButtonUrl.trim() || undefined,
      });

      setWtMessage('Template submitted for WhatsApp verification!');
      setWtName('');
      setWtHeaderText('');
      await fetchData();
      setTimeout(() => {
        setShowWhatsAppModal(false);
        setWtMessage(null);
      }, 1200);
    } catch (err: any) {
      setWtMessage(err?.message || 'Failed to submit template.');
    } finally {
      setSubmittingWt(false);
    }
  };

  const handleCreateQrCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrName.trim() || !qrEventId) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eventflow.in';
    const targetUrl = `${origin}/events/${qrEventId}?utm_source=qr&utm_medium=offline&utm_campaign=${encodeURIComponent(qrPlacement.toLowerCase().replace(/\s+/g, '_'))}${qrPromoCode ? `&code=${encodeURIComponent(qrPromoCode.trim().toUpperCase())}` : ''}`;
    const newCamp = {
      id: `qr_${Date.now()}`,
      name: qrName.trim(),
      eventId: qrEventId,
      eventTitle: events.find(ev => ev.id === qrEventId)?.title || 'Event Experience',
      placement: qrPlacement,
      promoCode: qrPromoCode.trim().toUpperCase(),
      url: targetUrl,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCamp, ...qrCampaigns];
    setQrCampaigns(updated);
    try {
      localStorage.setItem('pulsr_organizer_qr_campaigns', JSON.stringify(updated));
    } catch {}
    setShowQrModal(false);
    setQrName('');
    setQrPromoCode('');
  };

  const handleDeleteQrCampaign = (id: string) => {
    const updated = qrCampaigns.filter(q => q.id !== id);
    setQrCampaigns(updated);
    try {
      localStorage.setItem('pulsr_organizer_qr_campaigns', JSON.stringify(updated));
    } catch {}
  };

  const tabs: Array<{ key: MarketingTab; label: string }> = [
    { key: 'transactions',   label: 'Transactions' },
    { key: 'past_campaigns', label: 'Past Campaigns' },
    { key: 'whatsapp',       label: 'Custom WhatsApp Templates' },
    { key: 'qr_campaigns',   label: 'QR Campaigns' },
    { key: 'menu_qr',        label: 'Menu QR' },
  ];

  return (
    <DashboardLayout title="Marketing" subtitle="Credits wallet, campaigns, WhatsApp & QR marketing">
      <div className="space-y-6">

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* ── Top Cards Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Credits Wallet Card */}
          <div className="surface-card">
            <div className="surface-card-body">
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-3)', marginBottom: '8px' }}>Total Credits</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '40px', color: '#fff', letterSpacing: '-1px', marginBottom: '16px' }}>
                {(wallet?.balanceCredits ?? overview?.totalCredits ?? 0).toLocaleString('en-IN')}
              </p>
              <button type="button" onClick={() => setShowAddCredits(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  border: '1px solid var(--pink)', background: 'var(--pink-dim)', color: 'var(--pink)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--pink)', e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--pink-dim)', e.currentTarget.style.color = 'var(--pink)')}
              >
                Add Credits to Wallet
              </button>
            </div>
          </div>

          {/* Start A New Campaign Card */}
          <div className="surface-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '140px' }}>
            <div className="surface-card-body" style={{ width: '100%' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: '#fff', marginBottom: '6px' }}>Start A New Campaign</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '18px' }}>Begin marketing your event to reach your audience</p>
              <button type="button" onClick={() => setShowCampaignModal(true)}
                style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  border: '2px solid var(--pink)', background: 'var(--pink-dim)', color: 'var(--pink)',
                  fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', margin: '0 auto', transition: 'all 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--pink)', e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--pink-dim)', e.currentTarget.style.color = 'var(--pink)')}
              >+</button>
            </div>
          </div>
        </div>

        {/* ── Marketing Tabs ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
          {tabs.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              style={{
                padding: '9px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: 'none', background: 'none',
                color: activeTab === t.key ? 'var(--pink)' : 'var(--text-3)',
                borderBottom: activeTab === t.key ? '2px solid var(--pink)' : '2px solid transparent',
                transition: 'all 0.2s', marginBottom: '-1px',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ────────────────────────────────────────────────────── */}
        <div className="surface-card">
          <div className="surface-card-body">
            {activeTab === 'transactions' && (
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Transactions</p>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px' }}>Find all your past credit wallet transactions and GST invoices.</p>
                {(!wallet?.transactions || wallet.transactions.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: '13px' }}>
                    No transactions yet. Add credits to your wallet to get started.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-3)' }}>
                          <th style={{ padding: '10px' }}>Transaction ID</th>
                          <th style={{ padding: '10px' }}>Date</th>
                          <th style={{ padding: '10px' }}>Credits Added</th>
                          <th style={{ padding: '10px' }}>Amount Paid (incl. GST)</th>
                          <th style={{ padding: '10px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {wallet.transactions.map((tx) => (
                          <tr key={tx.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 10px', color: 'var(--text-1)', fontFamily: 'monospace' }}>{tx.id}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-2)' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--pink)', fontWeight: 600 }}>+{tx.credits}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-1)', fontWeight: 600 }}>₹{(tx.amountMinor / 100).toFixed(2)}</td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)', fontSize: '11px', fontWeight: 600 }}>
                                {(tx.status || 'completed').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'past_campaigns' && (
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Past Campaigns</p>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px' }}>All previously launched marketing campaigns and live sales conversions.</p>
                {campaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: '13px' }}>
                    No campaigns launched yet. Start your first campaign using the button above.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-3)' }}>
                          <th style={{ padding: '10px' }}>Campaign Name</th>
                          <th style={{ padding: '10px' }}>Promo Code</th>
                          <th style={{ padding: '10px' }}>Event</th>
                          <th style={{ padding: '10px' }}>Type</th>
                          <th style={{ padding: '10px' }}>Conversions</th>
                          <th style={{ padding: '10px' }}>Revenue Generated</th>
                          <th style={{ padding: '10px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 10px', color: 'var(--text-1)', fontWeight: 600 }}>{c.name}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--pink)', fontFamily: 'monospace', fontWeight: 700 }}>{c.code}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-2)' }}>{c.eventTitle}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-3)' }}>{c.campaignType}</td>
                            <td style={{ padding: '12px 10px', color: 'var(--text-1)', fontWeight: 600 }}>{c.ordersCount} orders</td>
                            <td style={{ padding: '12px 10px', color: 'var(--green)', fontWeight: 700 }}>₹{(c.grossSalesMinor / 100).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--green)', fontSize: '11px', fontWeight: 600 }}>
                                {c.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'whatsapp' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>Custom WhatsApp Broadcast Templates</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Create, manage, and dispatch verified WhatsApp Business broadcast templates.</p>
                  </div>
                  <button type="button" onClick={() => setShowWhatsAppModal(true)} style={{ padding: '8px 16px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--pink)', background: 'var(--pink-dim)', color: 'var(--pink)', cursor: 'pointer' }}>
                    + New Template
                  </button>
                </div>

                {whatsappTemplates.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', background: 'var(--surface-2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>No Broadcast Templates Created Yet</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '420px', margin: '0 auto 16px' }}>
                      Design custom notification, ticketing, and marketing broadcast templates to send verified WhatsApp updates to attendees.
                    </p>
                    <button type="button" onClick={() => setShowWhatsAppModal(true)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      + Create First WhatsApp Template
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {whatsappTemplates.map((t) => (
                      <div key={t.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', display: 'block' }}>{t.name}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase' }}>{t.category} • {t.language}</span>
                          </div>
                          <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: t.status === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(168,85,247,0.15)', color: t.status === 'approved' ? 'var(--green)' : '#c084fc' }}>
                            {t.status}
                          </span>
                        </div>

                        {t.headerText && (
                          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-1)' }}>
                            {t.headerText}
                          </div>
                        )}

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-line', border: '1px solid rgba(255,255,255,0.05)' }}>
                          {t.body}
                        </div>

                        {t.buttonUrl && (
                          <div style={{ fontSize: '11px', color: 'var(--pink)', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <span>🔗 CTA:</span> <a href={t.buttonUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--pink)', textDecoration: 'underline' }}>{t.buttonUrl}</a>
                          </div>
                        )}

                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                          Created: {new Date(t.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'qr_campaigns' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '2px' }}>QR Marketing Stands & Campaigns</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>Generate high-resolution tracked QR codes for physical posters, entrance turnstiles, flyers, and table stands.</p>
                  </div>
                  <button type="button" onClick={() => setShowQrModal(true)} style={{ padding: '8px 16px', borderRadius: '9px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--pink)', background: 'var(--pink-dim)', color: 'var(--pink)', cursor: 'pointer' }}>
                    + New QR Campaign
                  </button>
                </div>

                {qrCampaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', background: 'var(--surface-2)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>No QR Marketing Campaigns Yet</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', maxWidth: '420px', margin: '0 auto 16px' }}>
                      Deploy tracked QR code stands across partner venues, entrance gates, and printed collateral to drive direct mobile ticket sales.
                    </p>
                    <button type="button" onClick={() => setShowQrModal(true)} style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--pink)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      + Create First QR Stand
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {qrCampaigns.map((q) => (
                      <div key={q.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', display: 'block' }}>{q.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--pink)', fontWeight: 600 }}>{q.placement}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block' }}>{q.eventTitle}</span>
                          </div>
                          <button type="button" onClick={() => handleDeleteQrCampaign(q.id)} title="Delete Stand" style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '14px' }}>
                            🗑️
                          </button>
                        </div>

                        <div style={{ textAlign: 'center', padding: '14px', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(q.url)}&margin=6`}
                            alt={q.name}
                            style={{ width: '160px', height: '160px', display: 'inline-block' }}
                          />
                        </div>

                        {q.promoCode && (
                          <div style={{ fontSize: '11px', color: 'var(--green)', background: 'rgba(34,197,94,0.1)', padding: '6px 10px', borderRadius: '6px', textAlign: 'center', fontWeight: 600 }}>
                            Auto-Applies Promo: <span style={{ fontFamily: 'monospace' }}>{q.promoCode}</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(q.url);
                              setCopiedQrId(q.id);
                              setTimeout(() => setCopiedQrId(null), 2000);
                            }}
                            style={{ flex: 1, padding: '8px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-1)', cursor: 'pointer' }}
                          >
                            {copiedQrId === q.id ? '✓ Copied' : 'Copy URL'}
                          </button>
                          <a
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(q.url)}&margin=10`}
                            download={`${q.name.toLowerCase().replace(/\s+/g, '_')}_qr.png`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ flex: 1, padding: '8px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: 'var(--pink)', color: '#fff', textAlign: 'center', textDecoration: 'none' }}
                          >
                            Download High-Res
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'menu_qr' && (
              <div>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)', marginBottom: '4px' }}>Menu & Programme QR</p>
                <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '20px' }}>Generate and download high-resolution QR codes linked to your live event digital menu, schedule, or programme.</p>
                <div style={{ maxWidth: '480px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Select Event</label>
                  <select
                    value={selectedMenuEventId}
                    onChange={(e) => {
                      setSelectedMenuEventId(e.target.value);
                      setGeneratedMenuUrl(null);
                    }}
                    style={{ width: '100%', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', marginBottom: '12px' }}
                  >
                    <option value="">Choose Event</option>
                    {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!selectedMenuEventId}
                    onClick={() => {
                      if (!selectedMenuEventId) return;
                      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://eventflow.in';
                      setGeneratedMenuUrl(`${origin}/events/${selectedMenuEventId}#menu`);
                    }}
                    style={{ width: '100%', padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: 600, background: selectedMenuEventId ? 'var(--pink)' : 'var(--surface-3)', color: '#fff', border: 'none', cursor: selectedMenuEventId ? 'pointer' : 'not-allowed', opacity: selectedMenuEventId ? 1 : 0.6 }}
                  >
                    Generate Menu QR Code
                  </button>

                  {generatedMenuUrl && (
                    <div style={{ marginTop: '24px', padding: '20px', background: 'var(--surface-2)', borderRadius: '14px', border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', marginBottom: '16px' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generatedMenuUrl)}&margin=10`}
                          alt="Menu QR Code"
                          style={{ width: '180px', height: '180px', display: 'block' }}
                        />
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Public Event Link:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-3)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                            {generatedMenuUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedMenuUrl);
                              setCopiedMenuUrl(true);
                              setTimeout(() => setCopiedMenuUrl(false), 2000);
                            }}
                            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', background: 'var(--surface-1)', color: 'var(--text-1)', border: '1px solid var(--border)', cursor: 'pointer', whiteSpace: 'nowrap' }}
                          >
                            {copiedMenuUrl ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <a
                          href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(generatedMenuUrl)}&margin=10`}
                          download="event-menu-qr.png"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--pink)', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <span>📥</span> Download High-Res PNG
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Add Credits Modal ──────────────────────────────────────────────────── */}
      {showAddCredits && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>Add Credits</h3>
              <button type="button" onClick={() => setShowAddCredits(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topupMessage && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: topupMessage.includes('success') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: topupMessage.includes('success') ? 'var(--green)' : 'var(--red)', fontSize: '12px' }}>
                  {topupMessage}
                </div>
              )}

              {/* Billing type */}
              <div style={{ border: '1px solid var(--pink)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '10px' }}>Type</p>
                <div style={{ display: 'flex', gap: '16px' }}>
                  {(['individual', 'company', 'firm'] as const).map(t => (
                    <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-2)', cursor: 'pointer', textTransform: 'capitalize' }}>
                      <input type="radio" name="billingType" checked={billingType === t} onChange={() => setBillingType(t)} style={{ accentColor: 'var(--pink)' }} />
                      {t}
                    </label>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Firm Name</label>
                    <input value={firmName} onChange={e => setFirmName(e.target.value)}
                      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Email</label>
                    <input value={billingEmail} onChange={e => setBillingEmail(e.target.value)} type="email"
                      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Country</label>
                    <select value={country} onChange={e => setCountry(e.target.value)}
                      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}>
                      <option>India</option><option>USA</option><option>UK</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>State</label>
                    <input value={state} onChange={e => setState(e.target.value)}
                      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)}
                      style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '8px 10px', color: 'var(--text-1)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              {/* Credits input */}
              <div style={{ border: '1px solid var(--pink)', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', marginBottom: '4px' }}>Credits to be Added</p>
                <p style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '8px' }}>Minimum 100 Credits (1 Credit = ₹1.00)</p>
                <input value={creditsInput} onChange={e => setCreditsInput(e.target.value)} type="number" min="100"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '7px', padding: '10px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  placeholder="e.g. 500" />
              </div>

              {/* GST Breakdown */}
              <div style={{ border: '1px dashed var(--border)', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)' }}>
                  <span>Base Amount</span>
                  <span>{creditsNum > 0 ? `₹${creditsNum.toFixed(2)}` : '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-2)' }}>
                  <span>GST (18%)</span>
                  <span>{creditsNum > 0 ? `₹${gst.toFixed(2)}` : '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-1)', fontWeight: 700 }}>
                  <span>Net Amount Payable</span>
                  <span>{creditsNum > 0 ? `₹${netAmount.toFixed(2)}` : '-'}</span>
                </div>
              </div>

              <button type="button" onClick={handleAddCredits} disabled={creditsNum < 100 || submittingCredits}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                  background: creditsNum >= 100 && !submittingCredits ? 'var(--pink)' : 'var(--surface-3)',
                  color: creditsNum >= 100 && !submittingCredits ? '#fff' : 'var(--text-3)',
                  border: 'none', cursor: creditsNum >= 100 && !submittingCredits ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                }}>
                {submittingCredits ? 'Processing Top-up...' : 'Pay & Add Credits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Start Campaign Modal ───────────────────────────────────────────────── */}
      {showCampaignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '460px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>Start A New Campaign</h3>
              <button type="button" onClick={() => setShowCampaignModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '24px', border: '1px solid var(--pink)', margin: '20px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {campaignMessage && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: campaignMessage.includes('success') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: campaignMessage.includes('success') ? 'var(--green)' : 'var(--red)', fontSize: '12px' }}>
                  {campaignMessage}
                </div>
              )}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Campaign Name</label>
                <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="e.g. Early Bird Blast"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Promo / Campaign Code</label>
                <input value={campaignCode} onChange={e => setCampaignCode(e.target.value)} placeholder="e.g. EARLYBIRD20"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Select Type of Campaign</label>
                <select value={campaignType} onChange={e => setCampaignType(e.target.value)}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '11px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none' }}>
                  {CAMPAIGN_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Select Event for the Campaign</label>
                <select value={campaignEvent} onChange={e => setCampaignEvent(e.target.value)}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '11px 14px', color: campaignEvent ? 'var(--text-1)' : 'var(--text-3)', fontSize: '13px', outline: 'none' }}>
                  <option value="">Choose Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '8px' }}>Discount Percentage (%)</label>
                <input value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} type="number" min="1" max="100"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ padding: '0 24px 24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleCreateCampaign}
                disabled={!campaignType || !campaignEvent || !campaignName || !campaignCode || submittingCampaign}
                style={{ padding: '11px 28px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, background: (campaignType && campaignEvent && campaignName && campaignCode && !submittingCampaign) ? 'var(--pink)' : 'var(--surface-3)', color: (campaignType && campaignEvent && campaignName && campaignCode && !submittingCampaign) ? '#fff' : 'var(--text-3)', border: 'none', cursor: (campaignType && campaignEvent && campaignName && campaignCode && !submittingCampaign) ? 'pointer' : 'not-allowed' }}>
                {submittingCampaign ? 'Launching...' : 'Create Promo Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WhatsApp Template Modal ─────────────────────────────────────────── */}
      {showWhatsAppModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>New WhatsApp Broadcast Template</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>Submit reusable WhatsApp Business templates for verification.</p>
              </div>
              <button type="button" onClick={() => setShowWhatsAppModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateWhatsappTemplate} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {wtMessage && (
                <div style={{ padding: '10px 12px', borderRadius: '8px', background: wtMessage.includes('submitted') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: wtMessage.includes('submitted') ? 'var(--green)' : 'var(--red)', fontSize: '12px' }}>
                  {wtMessage}
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Template Name</label>
                <input value={wtName} onChange={e => setWtName(e.target.value)} required placeholder="e.g. ticket_pass_dispatch"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Category</label>
                  <select value={wtCategory} onChange={e => setWtCategory(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '12px', outline: 'none' }}>
                    <option value="marketing">Marketing Broadcast</option>
                    <option value="utility">Utility / Ticket Update</option>
                    <option value="authentication">Auth / Passcode</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Language</label>
                  <select value={wtLanguage} onChange={e => setWtLanguage(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '12px', outline: 'none' }}>
                    <option value="en">English (en)</option>
                    <option value="hi">Hindi (hi)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Header Title (Optional)</label>
                <input value={wtHeaderText} onChange={e => setWtHeaderText(e.target.value)} placeholder="e.g. 🎟️ Your Event Pass Is Confirmed"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>Message Body with Variables</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button type="button" onClick={() => setWtBody(b => `${b} {{1}}`)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>+ Name</button>
                    <button type="button" onClick={() => setWtBody(b => `${b} {{2}}`)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>+ Event</button>
                    <button type="button" onClick={() => setWtBody(b => `${b} {{3}}`)} style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>+ Link</button>
                  </div>
                </div>
                <textarea value={wtBody} onChange={e => setWtBody(e.target.value)} required rows={4}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Action Button URL</label>
                <input value={wtButtonUrl} onChange={e => setWtButtonUrl(e.target.value)} placeholder="https://..."
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* WhatsApp Live Bubble Mockup */}
              <div style={{ background: '#0b141a', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '10px', color: '#8696a0', display: 'block', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 700 }}>WhatsApp Preview</span>
                <div style={{ background: '#005c4b', padding: '12px 14px', borderRadius: '10px 10px 2px 10px', color: '#e9edef', fontSize: '12px', lineHeight: 1.4, maxWidth: '85%', marginLeft: 'auto', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                  {wtHeaderText && <div style={{ fontWeight: 700, marginBottom: '4px', color: '#fff' }}>{wtHeaderText}</div>}
                  <div style={{ whiteSpace: 'pre-line' }}>{wtBody || 'Template preview message body will render here...'}</div>
                  {wtButtonUrl && (
                    <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', color: '#53bdeb', fontWeight: 600, fontSize: '11px' }}>
                      🔗 View Event Pass
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowWhatsAppModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '12px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submittingWt} style={{ padding: '10px 22px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: 'var(--pink)', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  {submittingWt ? 'Submitting...' : 'Submit Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Stand Campaign Modal ─────────────────────────────────────────── */}
      {showQrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--surface-1)', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-1)' }}>New QR Stand Campaign</h3>
                <p style={{ fontSize: '11px', color: 'var(--text-3)' }}>Generate print-ready QR codes for physical event collateral.</p>
              </div>
              <button type="button" onClick={() => setShowQrModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateQrCampaign} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Campaign / Stand Name</label>
                <input value={qrName} onChange={e => setQrName(e.target.value)} required placeholder="e.g. VIP Entrance Rollup Banner"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Select Target Event</label>
                <select value={qrEventId} onChange={e => setQrEventId(e.target.value)} required
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: qrEventId ? 'var(--text-1)' : 'var(--text-3)', fontSize: '12px', outline: 'none' }}>
                  <option value="">Choose Event</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Placement Location</label>
                <select value={qrPlacement} onChange={e => setQrPlacement(e.target.value)}
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '12px', outline: 'none' }}>
                  <option value="Main Gate Poster">Main Gate Poster</option>
                  <option value="Bar & Dining Stand">Bar & Dining Table Stand</option>
                  <option value="Box Office Turnstile">Box Office Turnstile</option>
                  <option value="Partner Flyer Handout">Partner Flyer Handout</option>
                  <option value="Social Media Bio">Social Media Bio QR</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>Auto-Apply Discount Code (Optional)</label>
                <input value={qrPromoCode} onChange={e => setQrPromoCode(e.target.value)} placeholder="e.g. GATEPASS15"
                  style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '10px 14px', color: 'var(--text-1)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowQrModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', fontSize: '12px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={!qrName || !qrEventId} style={{ padding: '10px 22px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, background: (!qrName || !qrEventId) ? 'var(--surface-3)' : 'var(--pink)', border: 'none', color: '#fff', cursor: (!qrName || !qrEventId) ? 'not-allowed' : 'pointer' }}>
                  Generate QR Stand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
