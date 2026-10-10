// =============================================================================
// venue-web — Live Door Headcount, Connected Gate Scanners & Promoter Guestlist
// Real-time capacity counter, fire safety compliance, SSE telemetry & bouncer door check-in.
// =============================================================================
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { VenueLayout } from '../../components/VenueLayout';
import { apiClient, ApiError } from '../../lib/api';
import type { TurnstileTelemetryDto, ScannerDeviceHeartbeatDto } from '@platform/types';

export interface GuestlistEntry {
  id: string;
  guestName: string;
  phone: string;
  plusOnes: number;
  admittedCount: number;
  promoterName: string;
  entryTier: 'VIP_COMP' | 'FREE_BEFORE_11' | 'COVER_PAYABLE' | 'TABLE_HOST';
  coverFee?: number;
  status: 'PENDING' | 'CHECKED_IN';
  checkInTime?: string;
}

const FALLBACK_GUESTLIST: GuestlistEntry[] = [
  {
    id: 'gst-01',
    guestName: 'Aarav Singhania',
    phone: '+91 98200 11223',
    plusOnes: 2,
    admittedCount: 3,
    promoterName: 'DJ Rishi (Resident)',
    entryTier: 'VIP_COMP',
    status: 'CHECKED_IN',
    checkInTime: '10:14 PM',
  },
  {
    id: 'gst-02',
    guestName: 'Ananya Mehra',
    phone: '+91 98190 44556',
    plusOnes: 1,
    admittedCount: 2,
    promoterName: 'Bombay Nights Collective',
    entryTier: 'FREE_BEFORE_11',
    status: 'CHECKED_IN',
    checkInTime: '10:42 PM',
  },
  {
    id: 'gst-03',
    guestName: 'Devansh Kapur',
    phone: '+91 97690 99887',
    plusOnes: 3,
    admittedCount: 0,
    promoterName: 'Submerge Events',
    entryTier: 'COVER_PAYABLE',
    coverFee: 2000,
    status: 'PENDING',
  },
  {
    id: 'gst-04',
    guestName: 'Ishaani Sen',
    phone: '+91 98205 33221',
    plusOnes: 1,
    admittedCount: 0,
    promoterName: 'DJ Rishi (Resident)',
    entryTier: 'VIP_COMP',
    status: 'PENDING',
  },
  {
    id: 'gst-05',
    guestName: 'Vikramaditya Rao',
    phone: '+91 98111 77889',
    plusOnes: 0,
    admittedCount: 1,
    promoterName: 'Table Host (VIP 2)',
    entryTier: 'TABLE_HOST',
    status: 'CHECKED_IN',
    checkInTime: '11:02 PM',
  },
  {
    id: 'gst-06',
    guestName: 'Rhea Bhasin',
    phone: '+91 99200 66554',
    plusOnes: 2,
    admittedCount: 0,
    promoterName: 'Bombay Nights Collective',
    entryTier: 'FREE_BEFORE_11',
    status: 'PENDING',
  },
  {
    id: 'gst-07',
    guestName: 'Nikhil Advani',
    phone: '+91 98202 88441',
    plusOnes: 1,
    admittedCount: 0,
    promoterName: 'Submerge Events',
    entryTier: 'COVER_PAYABLE',
    coverFee: 2000,
    status: 'PENDING',
  },
];

export default function DoorOperationsPage() {
  // Hosted Events
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Headcount & Telemetry state
  const [legalCapacity, setLegalCapacity] = useState(1200);
  const [currentInside, setCurrentInside] = useState(842);
  const [totalEntries, setTotalEntries] = useState(964);
  const [totalExits, setTotalExits] = useState(122);
  const [entryVelocity, setEntryVelocity] = useState(18);
  const [telemetry, setTelemetry] = useState<TurnstileTelemetryDto | null>(null);
  const [isSseConnected, setIsSseConnected] = useState(false);

  // Connected Scanner Hardware Terminals
  const [scannerDevices, setScannerDevices] = useState<ScannerDeviceHeartbeatDto[]>([]);

  // Guestlist state
  const [guestlist, setGuestlist] = useState<GuestlistEntry[]>(FALLBACK_GUESTLIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'PENDING' | 'CHECKED_IN' | 'VIP'>('ALL');

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [walkInPlus, setWalkInPlus] = useState('0');
  const [walkInPromoter, setWalkInPromoter] = useState('Door Walk-in');
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  // Fetch hosted events & venue profile
  useEffect(() => {
    let mounted = true;
    async function loadInitial() {
      try {
        setLoadingEvents(true);
        const [evtsRes, profRes] = await Promise.allSettled([
          apiClient.getVenueEvents<any>(),
          apiClient.getVenueProfile<any>(),
        ]);

        if (!mounted) return;
        const evts = evtsRes.status === 'fulfilled' ? evtsRes.value.data : [];
        const evtsList = Array.isArray(evts) ? evts : (evts?.items ?? []);
        setEvents(evtsList);

        if (evtsList.length > 0) {
          const firstId = evtsList[0].id || evtsList[0].eventId;
          setSelectedEventId(firstId);
        }

        if (profRes.status === 'fulfilled' && profRes.value.data?.capacity) {
          setLegalCapacity(profRes.value.data.capacity);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (mounted) setLoadingEvents(false);
      }
    }
    loadInitial();
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch telemetry, guestlists & scanner devices when selected event changes
  const refreshEventData = useCallback(async (eventId: string) => {
    if (!eventId) return;

    try {
      const [telemetryRes, devicesRes, guestlistRes] = await Promise.allSettled([
        apiClient.getTurnstileTelemetry<TurnstileTelemetryDto>(eventId),
        apiClient.getEventDevices<ScannerDeviceHeartbeatDto[]>(eventId),
        apiClient.getEventGuestlists<any[]>(eventId),
      ]);

      if (telemetryRes.status === 'fulfilled' && telemetryRes.value.data) {
        const t = telemetryRes.value.data;
        setTelemetry(t);
        if (t.totalAdmitted !== undefined) {
          setCurrentInside(t.totalAdmitted);
          setTotalEntries(t.totalAdmitted);
        }
        if (t.totalCapacity) {
          setLegalCapacity(t.totalCapacity);
        }
        if (t.ingressVelocityPerMin !== undefined) {
          setEntryVelocity(t.ingressVelocityPerMin);
        }
      }

      if (devicesRes.status === 'fulfilled' && devicesRes.value.data) {
        const list = Array.isArray(devicesRes.value.data) ? devicesRes.value.data : [];
        setScannerDevices(list);
      }

      if (guestlistRes.status === 'fulfilled' && guestlistRes.value.data) {
        const rawList = Array.isArray(guestlistRes.value.data) ? guestlistRes.value.data : [];
        if (rawList.length > 0) {
          const mapped: GuestlistEntry[] = rawList.map((g: any) => ({
            id: g.id,
            guestName: g.guestName,
            phone: g.guestPhone || 'N/A',
            plusOnes: Math.max(0, (g.allowedCount || 1) - 1),
            admittedCount: g.admittedCount || 0,
            promoterName: g.promoterName || 'Promoter Pass',
            entryTier: g.entryType === 'vip' ? 'VIP_COMP' : g.entryType === 'table' ? 'TABLE_HOST' : 'FREE_BEFORE_11',
            status: g.status === 'admitted' || g.admittedCount > 0 ? 'CHECKED_IN' : 'PENDING',
            checkInTime: g.checkedInAt ? new Date(g.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
          }));
          setGuestlist(mapped);
        }
      }
    } catch {
      // Keep existing data on transient network issues
    }
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      refreshEventData(selectedEventId);
    }
  }, [selectedEventId, refreshEventData]);

  // Connect live SSE stream for real-time turnstile telemetry
  useEffect(() => {
    if (!selectedEventId) return;

    let es: EventSource | null = null;
    try {
      const streamUrl = apiClient.getTurnstileTelemetryStreamUrl(selectedEventId);
      es = new EventSource(streamUrl);

      es.onopen = () => {
        setIsSseConnected(true);
      };

      es.addEventListener('turnstile_telemetry', (e: MessageEvent) => {
        try {
          const payload: TurnstileTelemetryDto = JSON.parse(e.data);
          setTelemetry(payload);
          if (payload.totalAdmitted !== undefined) {
            setCurrentInside(payload.totalAdmitted);
            setTotalEntries(payload.totalAdmitted);
          }
          if (payload.totalCapacity) {
            setLegalCapacity(payload.totalCapacity);
          }
          if (payload.ingressVelocityPerMin !== undefined) {
            setEntryVelocity(payload.ingressVelocityPerMin);
          }
        } catch {
          // ignore parse errors
        }
      });

      es.onerror = () => {
        setIsSseConnected(false);
      };
    } catch {
      setIsSseConnected(false);
    }

    // Polling fallback every 12 seconds
    const interval = setInterval(() => {
      refreshEventData(selectedEventId);
    }, 12000);

    return () => {
      if (es) {
        es.close();
      }
      clearInterval(interval);
    };
  }, [selectedEventId, refreshEventData]);

  // Capacity calculations
  const occupancyPercent = Math.round((currentInside / (legalCapacity || 1)) * 100);

  const getCapacityStatus = () => {
    if (occupancyPercent >= 95) {
      return {
        label: 'ONE-IN-ONE-OUT STRICT',
        color: 'var(--pink)',
        bg: 'var(--pink-dim)',
        desc: 'Capacity critical. Stop general entry until patrons exit.',
      };
    }
    if (occupancyPercent >= 80) {
      return {
        label: 'NEARING MAXIMUM LIMIT',
        color: '#FFB800',
        bg: 'rgba(255, 184, 0, 0.15)',
        desc: 'Approaching 85% capacity threshold. Slow down walk-ins.',
      };
    }
    return {
      label: 'SAFE OPERATIONAL OCCUPANCY',
      color: 'var(--green)',
      bg: 'var(--green-dim)',
      desc: 'Normal door flow. Fire safety compliance fully satisfied.',
    };
  };

  const status = getCapacityStatus();

  // Clicker handlers wired to backend recordDoorClicker
  const handleAdmit = async (count = 1) => {
    setCurrentInside((prev) => Math.min(legalCapacity, prev + count));
    setTotalEntries((prev) => prev + count);

    if (selectedEventId) {
      try {
        await apiClient.recordDoorClicker(selectedEventId, {
          delta: count,
          direction: 'admit',
          gate: 'Turnstile Door Gate',
        });
      } catch {
        // Optimistic state remains in place
      }
    }
  };

  const handleExit = async (count = 1) => {
    setCurrentInside((prev) => Math.max(0, prev - count));
    setTotalExits((prev) => prev + count);

    if (selectedEventId) {
      try {
        await apiClient.recordDoorClicker(selectedEventId, {
          delta: count,
          direction: 'exit',
          gate: 'Departing Gate',
        });
      } catch {
        // Optimistic state remains in place
      }
    }
  };

  // Keyboard shortcut listener for bouncers on tablet/desktop keyboards (+ / -)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === '+' || e.key === '=') {
        handleAdmit(1);
      } else if (e.key === '-' || e.key === '_') {
        handleExit(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAdmit, handleExit]);

  // Check-in guestlist entry wired to backend checkInGuestlistEntry
  const handleCheckInGuest = async (id: string, plusOnes: number) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const count = 1 + plusOnes;

    // Optimistic local update
    setGuestlist((prev) =>
      prev.map((g) => {
        if (g.id === id) {
          return {
            ...g,
            status: 'CHECKED_IN',
            admittedCount: count,
            checkInTime: timeStr,
          };
        }
        return g;
      })
    );
    handleAdmit(count);

    try {
      await apiClient.checkInGuestlistEntry(id, count);
    } catch {
      // Backend error fallback
    }
  };

  // Filtered guestlist
  const filteredList = useMemo(() => {
    return guestlist.filter((g) => {
      const matchSearch =
        g.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.phone.includes(searchQuery) ||
        g.promoterName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (filterTab === 'PENDING') return g.status === 'PENDING';
      if (filterTab === 'CHECKED_IN') return g.status === 'CHECKED_IN';
      if (filterTab === 'VIP') return g.entryTier === 'VIP_COMP' || g.entryTier === 'TABLE_HOST';
      return true;
    });
  }, [guestlist, searchQuery, filterTab]);

  // Add Walk-in wired to backend admitDoorWalkIn
  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInName.trim()) return;

    setSubmittingWalkIn(true);
    const plusCount = parseInt(walkInPlus, 10) || 0;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newEntry: GuestlistEntry = {
      id: `gst-walkin-${Date.now()}`,
      guestName: walkInName.trim(),
      phone: walkInPhone.trim() || 'N/A',
      plusOnes: plusCount,
      admittedCount: 1 + plusCount,
      promoterName: walkInPromoter,
      entryTier: 'COVER_PAYABLE',
      coverFee: 2500,
      status: 'CHECKED_IN',
      checkInTime: timeStr,
    };

    setGuestlist((prev) => [newEntry, ...prev]);
    handleAdmit(1 + plusCount);

    if (selectedEventId) {
      try {
        await apiClient.admitDoorWalkIn(selectedEventId, {
          guestName: walkInName.trim(),
          phone: walkInPhone.trim() || undefined,
          plusOnes: plusCount,
          coverFee: 2500,
          promoterName: walkInPromoter,
        });
      } catch {
        // Handled optimistically
      }
    }

    setSubmittingWalkIn(false);
    setShowWalkInModal(false);
    setWalkInName('');
    setWalkInPhone('');
    setWalkInPlus('0');
  };

  return (
    <VenueLayout
      title="Door & Capacity Operations"
      subtitle="Live venue occupancy counter, fire safety adherence & door promoter guestlist"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Active Event Selector */}
          {events.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>EVENT:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  background: 'var(--surface-2)',
                  color: '#fff',
                  border: '1px solid var(--border)',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  maxWidth: '220px',
                }}
              >
                {events.map((evt) => (
                  <option key={evt.id || evt.eventId} value={evt.id || evt.eventId}>
                    {evt.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SSE Live Status Indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '20px',
              background: isSseConnected ? 'var(--green-dim)' : 'rgba(255,184,0,0.15)',
              border: `1px solid ${isSseConnected ? 'var(--green)' : '#FFB800'}44`,
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: isSseConnected ? 'var(--green)' : '#FFB800',
                boxShadow: isSseConnected ? '0 0 8px var(--green)' : 'none',
              }}
            />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: isSseConnected ? 'var(--green)' : '#FFB800',
              }}
            >
              {isSseConnected ? 'LIVE SSE' : 'POLLING'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowWalkInModal(true)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              background: 'var(--pink)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Admit Walk-in
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Headcount Dashboard & Big Clicker Widget */}
        <div
          style={{
            background: 'var(--surface-1)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '24px',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '24px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Left: Occupancy Gauge & Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.12em' }}>
                  REAL-TIME VENUE HEADCOUNT
                </span>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '100px',
                    fontSize: '10px',
                    fontWeight: 800,
                    background: status.bg,
                    color: status.color,
                    border: `1px solid ${status.color}44`,
                  }}
                >
                  {status.label}
                </span>
              </div>

              {/* Huge Counter */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginTop: '12px' }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '64px',
                    color: status.color,
                    lineHeight: 1,
                  }}
                >
                  {currentInside}
                </span>
                <span style={{ fontSize: '20px', color: 'var(--text-3)', fontWeight: 600 }}>
                  / {legalCapacity} MAX LEGAL LIMIT
                </span>
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: '10px',
                  background: 'var(--surface-3)',
                  borderRadius: '100px',
                  overflow: 'hidden',
                  marginTop: '16px',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, occupancyPercent)}%`,
                    background: status.color,
                    borderRadius: '100px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <p style={{ fontSize: '11px', color: 'var(--text-2)', marginTop: '8px' }}>
                {status.desc} ({occupancyPercent}% filled)
              </p>
            </div>

            {/* Entry / Exit metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                paddingTop: '16px',
                marginTop: '16px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>TOTAL ADMITTED</span>
                <p style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>{totalEntries}</p>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>TOTAL EXITED</span>
                <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-2)' }}>{totalExits}</p>
              </div>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>ENTRY VELOCITY</span>
                <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cyan)' }}>+{entryVelocity} / min</p>
              </div>
            </div>
          </div>

          {/* Right: Big Interactive Door Clicker */}
          <div
            style={{
              background: 'var(--surface-2)',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-2)', fontWeight: 700 }}>
                BOUNCER TURNSTILE CLICKER
              </span>
              <span style={{ fontSize: '10px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                Keys: [+] Admit / [-] Exit
              </span>
            </div>

            {/* Primary Big Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              {/* Admit +1 */}
              <button
                type="button"
                onClick={() => handleAdmit(1)}
                style={{
                  height: '110px',
                  borderRadius: '12px',
                  background: 'var(--green)',
                  color: '#080808',
                  border: 'none',
                  fontSize: '22px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  boxShadow: '0 8px 24px rgba(26,255,122,0.3)',
                  transition: 'transform 0.1s ease',
                }}
              >
                <span>+1 ADMIT</span>
                <span style={{ fontSize: '11px', fontWeight: 700, opacity: 0.8 }}>Turnstile Entry</span>
              </button>

              {/* Exit -1 */}
              <button
                type="button"
                onClick={() => handleExit(1)}
                style={{
                  height: '110px',
                  borderRadius: '12px',
                  background: 'var(--surface-3)',
                  color: '#fff',
                  border: '1px solid var(--border)',
                  fontSize: '22px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  transition: 'transform 0.1s ease',
                }}
              >
                <span>-1 EXIT</span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-3)' }}>Departing Gate</span>
              </button>
            </div>

            {/* Group Admit Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleAdmit(2)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +2 (Couple)
              </button>
              <button
                type="button"
                onClick={() => handleAdmit(5)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +5 (Group)
              </button>
              <button
                type="button"
                onClick={() => handleAdmit(10)}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                +10 (VIP Entourage)
              </button>
            </div>
          </div>
        </div>

        {/* Connected Scanner Hardware Terminals HUD */}
        <div
          style={{
            background: 'var(--surface-1)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>
                Connected Scanner Hardware Terminals ({scannerDevices.length})
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                Real-time telemetry and battery status from physical turnstile scanners and bouncer handhelds
              </p>
            </div>
            <span
              style={{
                fontSize: '11px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: scannerDevices.length > 0 ? 'var(--green-dim)' : 'var(--surface-2)',
                color: scannerDevices.length > 0 ? 'var(--green)' : 'var(--text-3)',
                fontWeight: 700,
              }}
            >
              {scannerDevices.length > 0 ? `${scannerDevices.length} Gates Online` : 'Gate Terminals Ready'}
            </span>
          </div>

          {scannerDevices.length === 0 ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                background: 'var(--surface-2)',
                borderRadius: '10px',
                border: '1px dashed var(--border)',
              }}
            >
              <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                No physical Android turnstile scanners actively paired for this event yet.
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>
                Scanners reporting heartbeats via the Scanner Android app will automatically appear here with battery and sync metrics.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {scannerDevices.map((dev) => (
                <div
                  key={dev.deviceId}
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>
                      {dev.deviceIdentifier || `Scanner ${dev.deviceId.slice(0, 6)}`}
                    </span>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--green-dim)',
                        color: 'var(--green)',
                        fontSize: '9px',
                        fontWeight: 800,
                      }}
                    >
                      ONLINE
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>BATTERY</span>
                      <p style={{ fontWeight: 700, color: dev.batteryLevel && dev.batteryLevel < 20 ? 'var(--pink)' : '#fff' }}>
                        {dev.batteryLevel ?? 100}% {dev.isCharging ? '⚡' : ''}
                      </p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>LATENCY</span>
                      <p style={{ fontWeight: 700, color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>
                        {dev.networkLatencyMs ?? 24}ms
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-3)' }}>
                    <span>Queue: {dev.offlineQueueDepth ?? 0}</span>
                    <span>App: v{dev.appVersion ?? '1.0.0'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Promoter Guestlist & Door List */}
        <div
          style={{
            background: 'var(--surface-1)',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            padding: '20px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Header & Filter Controls */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff' }}>
                Promoter Guestlist & Door Sheet
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-2)' }}>
                Fast check-in for promoter allocations, VIP attendees, and table reservations.
              </p>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', gap: '8px', width: '320px' }}>
              <input
                type="text"
                placeholder="Search guest, phone, promoter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[
              { id: 'ALL', label: `All Guests (${guestlist.length})` },
              { id: 'PENDING', label: `Pending Arrival (${guestlist.filter((g) => g.status === 'PENDING').length})` },
              { id: 'CHECKED_IN', label: `Checked In (${guestlist.filter((g) => g.status === 'CHECKED_IN').length})` },
              { id: 'VIP', label: 'VIP & Table Hosts Only' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: filterTab === tab.id ? 700 : 500,
                  background: filterTab === tab.id ? 'var(--pink)' : 'var(--surface-2)',
                  color: filterTab === tab.id ? '#fff' : 'var(--text-2)',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Guestlist Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>GUEST & PARTY</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>CONTACT</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>PROMOTER / ATTRIBUTION</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>ENTRY TIER</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((entry) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#fff' }}>{entry.guestName}</span>
                        {entry.plusOnes > 0 && (
                          <span
                            style={{
                              background: 'var(--surface-3)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              color: 'var(--cyan)',
                            }}
                          >
                            +{entry.plusOnes} Pluses
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                      {entry.phone}
                    </td>

                    <td style={{ padding: '12px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{entry.promoterName}</span>
                    </td>

                    <td style={{ padding: '12px' }}>
                      {entry.entryTier === 'VIP_COMP' && (
                        <span style={{ color: 'var(--pink)', fontWeight: 700, fontSize: '11px' }}>VIP COMPLIMENTARY</span>
                      )}
                      {entry.entryTier === 'FREE_BEFORE_11' && (
                        <span style={{ color: 'var(--green)', fontWeight: 600, fontSize: '11px' }}>FREE BEFORE 11 PM</span>
                      )}
                      {entry.entryTier === 'COVER_PAYABLE' && (
                        <span style={{ color: '#FFB800', fontWeight: 600, fontSize: '11px' }}>
                          COVER: ₹{entry.coverFee}
                        </span>
                      )}
                      {entry.entryTier === 'TABLE_HOST' && (
                        <span style={{ color: 'var(--cyan)', fontWeight: 700, fontSize: '11px' }}>TABLE RESERVATION</span>
                      )}
                    </td>

                    <td style={{ padding: '12px' }}>
                      {entry.status === 'CHECKED_IN' ? (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--green-dim)',
                            color: 'var(--green)',
                            fontWeight: 700,
                            fontSize: '10px',
                          }}
                        >
                          ARRIVED {entry.checkInTime ? `(${entry.checkInTime})` : ''}
                        </span>
                      ) : (
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--surface-2)',
                            color: 'var(--text-3)',
                            fontWeight: 600,
                            fontSize: '10px',
                          }}
                        >
                          PENDING ARRIVAL
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      {entry.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => handleCheckInGuest(entry.id, entry.plusOnes)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'var(--green)',
                            color: '#080808',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Admit ({1 + entry.plusOnes})
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                          Admitted {entry.admittedCount || 1 + entry.plusOnes} Pax
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Walk-in Admission Modal */}
      {showWalkInModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--surface-1)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>Admit Walk-in Guest</h3>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWalkIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                  Guest Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="+91 ..."
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                    Additional Pluses
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={walkInPlus}
                    onChange={(e) => setWalkInPlus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                    Promoter Ref
                  </label>
                  <input
                    type="text"
                    value={walkInPromoter}
                    onChange={(e) => setWalkInPromoter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--surface-2)',
                    color: 'var(--text-2)',
                    border: '1px solid var(--border)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingWalkIn}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    background: 'var(--pink)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {submittingWalkIn ? 'Admitting...' : 'Admit & Charge Cover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </VenueLayout>
  );
}
