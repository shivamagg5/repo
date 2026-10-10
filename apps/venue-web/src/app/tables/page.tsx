// =============================================================================
// venue-web — Interactive VIP Tables & Bottle Service Floorplan
// Production-grade floor management, minimum spends, bottle service and reservation states.
// =============================================================================
'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { VenueLayout } from '../../components/VenueLayout';
import { apiClient } from '../../lib/api';

export type TableStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';
export type TableZone = 'STAGE_VIP' | 'DANCEFLOOR' | 'MEZZANINE' | 'TERRACE';

export interface VIPTable {
  id: string;
  tableNumber: string;
  zone: TableZone;
  capacity: number;
  minSpend: number; // in INR
  currentSpend: number; // in INR
  status: TableStatus;
  guestName?: string;
  guestPhone?: string;
  partySize?: number;
  serverName?: string;
  reservedTime?: string;
  bottleOrders: string[];
  x: number; // percentage coordinate for floor map
  y: number;
}

const INITIAL_TABLES: VIPTable[] = [
  // Stage VIP
  {
    id: 'tbl-stage-01',
    tableNumber: 'VIP 1',
    zone: 'STAGE_VIP',
    capacity: 10,
    minSpend: 150000,
    currentSpend: 165000,
    status: 'OCCUPIED',
    guestName: 'Arjun Singhania',
    guestPhone: '+91 98201 11223',
    partySize: 8,
    serverName: 'Vikram (Lead Host)',
    reservedTime: '10:30 PM',
    bottleOrders: ['Dom Pérignon Luminous x 2', 'Clase Azul Reposado x 1', 'Belvedere 1.5L x 1'],
    x: 22,
    y: 18,
  },
  {
    id: 'tbl-stage-02',
    tableNumber: 'VIP 2',
    zone: 'STAGE_VIP',
    capacity: 12,
    minSpend: 200000,
    currentSpend: 185000,
    status: 'OCCUPIED',
    guestName: 'Kabir Oberoi',
    guestPhone: '+91 98110 33445',
    partySize: 11,
    serverName: 'Neha (VIP Host)',
    reservedTime: '11:00 PM',
    bottleOrders: ['Ace of Spades Gold x 2', 'Macallan 18yr x 1'],
    x: 50,
    y: 14,
  },
  {
    id: 'tbl-stage-03',
    tableNumber: 'VIP 3',
    zone: 'STAGE_VIP',
    capacity: 10,
    minSpend: 150000,
    currentSpend: 0,
    status: 'RESERVED',
    guestName: 'Dr. Rohan Mehta',
    guestPhone: '+91 98212 99887',
    partySize: 6,
    serverName: 'Vikram (Lead Host)',
    reservedTime: '11:30 PM',
    bottleOrders: ['Pre-ordered: Don Julio 1942 x 1'],
    x: 78,
    y: 18,
  },

  // Dancefloor Ring
  {
    id: 'tbl-df-01',
    tableNumber: 'DF 1',
    zone: 'DANCEFLOOR',
    capacity: 6,
    minSpend: 60000,
    currentSpend: 72000,
    status: 'OCCUPIED',
    guestName: 'Ananya Roy',
    guestPhone: '+91 99201 44556',
    partySize: 6,
    serverName: 'Rahul',
    reservedTime: '10:00 PM',
    bottleOrders: ['Grey Goose 750ml x 2', 'Moët & Chandon x 1'],
    x: 20,
    y: 45,
  },
  {
    id: 'tbl-df-02',
    tableNumber: 'DF 2',
    zone: 'DANCEFLOOR',
    capacity: 6,
    minSpend: 60000,
    currentSpend: 0,
    status: 'AVAILABLE',
    serverName: 'Rahul',
    bottleOrders: [],
    x: 38,
    y: 48,
  },
  {
    id: 'tbl-df-03',
    tableNumber: 'DF 3',
    zone: 'DANCEFLOOR',
    capacity: 6,
    minSpend: 60000,
    currentSpend: 60000,
    status: 'RESERVED',
    guestName: 'Siddharth V.',
    guestPhone: '+91 97690 12345',
    partySize: 5,
    serverName: 'Kunal',
    reservedTime: '11:15 PM',
    bottleOrders: ['Pre-ordered: Hendrick’s Gin x 1', 'Jagermeister x 1'],
    x: 62,
    y: 48,
  },
  {
    id: 'tbl-df-04',
    tableNumber: 'DF 4',
    zone: 'DANCEFLOOR',
    capacity: 6,
    minSpend: 60000,
    currentSpend: 0,
    status: 'AVAILABLE',
    serverName: 'Kunal',
    bottleOrders: [],
    x: 80,
    y: 45,
  },

  // Elevated Mezzanine
  {
    id: 'tbl-mez-01',
    tableNumber: 'M 1',
    zone: 'MEZZANINE',
    capacity: 8,
    minSpend: 80000,
    currentSpend: 95000,
    status: 'OCCUPIED',
    guestName: 'Tanvi Khanna',
    guestPhone: '+91 98205 66778',
    partySize: 7,
    serverName: 'Rhea',
    reservedTime: '10:15 PM',
    bottleOrders: ['Veuve Clicquot x 2', 'Tequila Casamigos x 1'],
    x: 18,
    y: 72,
  },
  {
    id: 'tbl-mez-02',
    tableNumber: 'M 2',
    zone: 'MEZZANINE',
    capacity: 8,
    minSpend: 80000,
    currentSpend: 0,
    status: 'AVAILABLE',
    serverName: 'Rhea',
    bottleOrders: [],
    x: 40,
    y: 74,
  },
  {
    id: 'tbl-mez-03',
    tableNumber: 'M 3',
    zone: 'MEZZANINE',
    capacity: 8,
    minSpend: 80000,
    currentSpend: 82000,
    status: 'OCCUPIED',
    guestName: 'Deepak Chopra',
    guestPhone: '+91 98209 11111',
    partySize: 8,
    serverName: 'Sameer',
    reservedTime: '10:45 PM',
    bottleOrders: ['Blue Label x 1', 'Moët Rosé x 1'],
    x: 60,
    y: 74,
  },
  {
    id: 'tbl-mez-04',
    tableNumber: 'M 4',
    zone: 'MEZZANINE',
    capacity: 8,
    minSpend: 80000,
    currentSpend: 0,
    status: 'RESERVED',
    guestName: 'Priya Malhotra',
    guestPhone: '+91 98190 22334',
    partySize: 6,
    serverName: 'Sameer',
    reservedTime: '11:45 PM',
    bottleOrders: ['Pre-ordered: Grey Goose 1L x 1'],
    x: 82,
    y: 72,
  },

  // Outdoor Terrace Lounge
  {
    id: 'tbl-ter-01',
    tableNumber: 'T 1',
    zone: 'TERRACE',
    capacity: 4,
    minSpend: 35000,
    currentSpend: 42000,
    status: 'OCCUPIED',
    guestName: 'Zoya Akhtar',
    guestPhone: '+91 98200 44332',
    partySize: 4,
    serverName: 'Farhan',
    reservedTime: '09:45 PM',
    bottleOrders: ['Chandon Brut x 2', 'Bombay Sapphire x 1'],
    x: 30,
    y: 92,
  },
  {
    id: 'tbl-ter-02',
    tableNumber: 'T 2',
    zone: 'TERRACE',
    capacity: 4,
    minSpend: 35000,
    currentSpend: 0,
    status: 'AVAILABLE',
    serverName: 'Farhan',
    bottleOrders: [],
    x: 50,
    y: 92,
  },
  {
    id: 'tbl-ter-03',
    tableNumber: 'T 3',
    zone: 'TERRACE',
    capacity: 4,
    minSpend: 35000,
    currentSpend: 0,
    status: 'AVAILABLE',
    serverName: 'Farhan',
    bottleOrders: [],
    x: 70,
    y: 92,
  },
];

export default function TablesFloorplanPage() {
  const [tables, setTables] = useState<VIPTable[]>(INITIAL_TABLES);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeTable, setActiveTable] = useState<VIPTable | null>(null);
  const [newBottle, setNewBottle] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch tables on mount from backend API or localStorage
  const loadTables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.getVenueTables<VIPTable[]>();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        setTables(res.data);
        if (typeof window !== 'undefined') {
          localStorage.setItem('venue_vip_tables', JSON.stringify(res.data));
        }
        return;
      }
    } catch {
      // Fallback to localStorage cache
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('venue_vip_tables');
        if (cached) {
          try {
            setTables(JSON.parse(cached));
            return;
          } catch {}
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  // Save changes to localStorage
  const persistTables = (updatedList: VIPTable[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('venue_vip_tables', JSON.stringify(updatedList));
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = tables.length;
    const occupied = tables.filter((t) => t.status === 'OCCUPIED').length;
    const reserved = tables.filter((t) => t.status === 'RESERVED').length;
    const available = tables.filter((t) => t.status === 'AVAILABLE').length;
    const totalMinSpendRevenue = tables.reduce((acc, t) => {
      if (t.status === 'OCCUPIED' || t.status === 'RESERVED') {
        return acc + Math.max(t.minSpend, t.currentSpend);
      }
      return acc;
    }, 0);
    const totalCapacity = tables.reduce((acc, t) => acc + t.capacity, 0);
    const seatedGuests = tables.reduce((acc, t) => acc + (t.partySize || 0), 0);

    return { total, occupied, reserved, available, totalMinSpendRevenue, totalCapacity, seatedGuests };
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchZone = selectedZone === 'ALL' || t.zone === selectedZone;
      const matchStatus = selectedStatus === 'ALL' || t.status === selectedStatus;
      return matchZone && matchStatus;
    });
  }, [tables, selectedZone, selectedStatus]);

  // Update table status wired to backend
  const handleStatusChange = async (tableId: string, newStatus: TableStatus) => {
    const nextList = tables.map((t) => {
      if (t.id === tableId) {
        const updated = { ...t, status: newStatus };
        if (newStatus === 'AVAILABLE') {
          updated.guestName = undefined;
          updated.guestPhone = undefined;
          updated.partySize = undefined;
          updated.currentSpend = 0;
          updated.bottleOrders = [];
        }
        if (activeTable?.id === tableId) {
          setActiveTable(updated);
        }
        return updated;
      }
      return t;
    });

    setTables(nextList);
    persistTables(nextList);

    try {
      await apiClient.updateVenueTable(tableId, { status: newStatus });
    } catch {
      // Local optimistic update kept
    }
  };

  // Add bottle service order wired to backend
  const handleAddBottle = async (tableId: string) => {
    if (!newBottle.trim()) return;
    const bottleName = newBottle.trim();
    const addedPrice = 25000; // estimated bottle value

    const nextList = tables.map((t) => {
      if (t.id === tableId) {
        const updatedOrders = [...t.bottleOrders, bottleName];
        const updated = {
          ...t,
          bottleOrders: updatedOrders,
          currentSpend: t.currentSpend + addedPrice,
          status: (t.status === 'AVAILABLE' ? 'OCCUPIED' : t.status) as TableStatus,
        };
        if (activeTable?.id === tableId) {
          setActiveTable(updated);
        }
        return updated;
      }
      return t;
    });

    setTables(nextList);
    persistTables(nextList);
    setNewBottle('');

    try {
      await apiClient.addVenueTableOrder(tableId, bottleName, addedPrice);
    } catch {
      // Local update kept
    }
  };

  const handleResetFloor = async () => {
    setTables(INITIAL_TABLES);
    persistTables(INITIAL_TABLES);
    try {
      for (const t of INITIAL_TABLES) {
        await apiClient.updateVenueTable(t.id, t);
      }
    } catch {}
  };

  const getStatusColor = (status: TableStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return '#1AFF7A';
      case 'RESERVED':
        return '#FFB800';
      case 'OCCUPIED':
        return '#FF2D78';
    }
  };

  return (
    <VenueLayout
      title="Floor & VIP Tables"
      subtitle="Interactive table floorplan, live bottle service tabs & minimum spend tracking"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            Floor Status: 100% OPERATIONAL
          </span>
          <button
            type="button"
            onClick={handleResetFloor}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 700,
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              cursor: 'pointer',
            }}
          >
            Reset Demo Floor
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Top Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {/* Card 1: VIP Occupancy */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-card-label">VIP Floor Occupancy</span>
              <span className="badge badge-pink" style={{ fontSize: '10px' }}>
                {Math.round(((stats.occupied + stats.reserved) / stats.total) * 100)}% Booked
              </span>
            </div>
            <p className="stat-card-value text-white mt-1" style={{ fontSize: '28px', fontWeight: 800 }}>
              {stats.occupied + stats.reserved} / {stats.total}
            </p>
            <div className="stat-card-delta up" style={{ marginTop: '8px' }}>
              <span className="metric-dot pink" />
              <span>{stats.occupied} Seated • {stats.reserved} Incoming Reservations</span>
            </div>
          </div>

          {/* Card 2: Minimum Spend Tab Revenue */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-card-label">Committed Table Revenue</span>
              <span className="badge badge-green" style={{ fontSize: '10px' }}>Tonight</span>
            </div>
            <p className="stat-card-value text-white mt-1" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--green)' }}>
              ₹{(stats.totalMinSpendRevenue / 100000).toFixed(2)}L
            </p>
            <div className="stat-card-delta up" style={{ marginTop: '8px' }}>
              <span className="metric-dot green" />
              <span>Bottle tabs & minimum commitments</span>
            </div>
          </div>

          {/* Card 3: Seated Guests Headcount */}
          <div className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-card-label">VIP Seated Headcount</span>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>Capacity</span>
            </div>
            <p className="stat-card-value text-white mt-1" style={{ fontSize: '28px', fontWeight: 800 }}>
              {stats.seatedGuests} / {stats.totalCapacity}
            </p>
            <div className="stat-card-delta up" style={{ marginTop: '8px' }}>
              <span className="metric-dot cyan" />
              <span>{stats.available} VIP booths open for walk-ins</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--surface-1)',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          {/* Zone tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {[
              { id: 'ALL', label: 'All Floor Zones' },
              { id: 'STAGE_VIP', label: 'Stage VIP Booths' },
              { id: 'DANCEFLOOR', label: 'Dancefloor Ring' },
              { id: 'MEZZANINE', label: 'Elevated Mezzanine' },
              { id: 'TERRACE', label: 'Terrace Lounge' },
            ].map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZone(z.id)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: selectedZone === z.id ? 700 : 500,
                  background: selectedZone === z.id ? 'var(--pink)' : 'var(--surface-2)',
                  color: selectedZone === z.id ? '#fff' : 'var(--text-2)',
                  border: '1px solid',
                  borderColor: selectedZone === z.id ? 'var(--pink)' : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Status filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>STATUS:</span>
            {[
              { id: 'ALL', label: 'All', color: 'var(--text-1)' },
              { id: 'OCCUPIED', label: 'Occupied', color: '#FF2D78' },
              { id: 'RESERVED', label: 'Reserved', color: '#FFB800' },
              { id: 'AVAILABLE', label: 'Available', color: '#1AFF7A' },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStatus(s.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: selectedStatus === s.id ? 'var(--surface-3)' : 'transparent',
                  color: s.color,
                  border: '1px solid',
                  borderColor: selectedStatus === s.id ? s.color : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Floorplan & Inspector Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
          {/* Visual Floor Map Canvas */}
          <div
            style={{
              background: 'radial-gradient(circle at 50% 20%, rgba(255,45,120,0.06), transparent 70%), var(--surface-0)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '24px',
              position: 'relative',
              minHeight: '520px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {/* Stage / DJ Deck Visual Representation */}
            <div
              style={{
                width: '60%',
                margin: '0 auto 30px',
                padding: '10px 0',
                background: 'linear-gradient(90deg, rgba(255,45,120,0.2), rgba(0,240,255,0.2))',
                borderRadius: '100px',
                border: '1px solid rgba(255,255,255,0.2)',
                textAlign: 'center',
                boxShadow: '0 0 24px rgba(255,45,120,0.2)',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '0.12em',
                  fontSize: '13px',
                  color: '#fff',
                }}
              >
                🎧 MAIN STAGE / DJ CONSOLE RIG
              </span>
            </div>

            {/* Interactive Tables Placement Container */}
            <div style={{ position: 'relative', flex: 1, minHeight: '380px' }}>
              {filteredTables.map((t) => {
                const isSelected = activeTable?.id === t.id;
                const statusColor = getStatusColor(t.status);

                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTable(t)}
                    style={{
                      position: 'absolute',
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'pointer',
                      zIndex: isSelected ? 10 : 1,
                    }}
                  >
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: isSelected ? 'var(--surface-3)' : 'var(--surface-1)',
                        border: `2px solid ${isSelected ? statusColor : 'var(--border)'}`,
                        boxShadow: isSelected
                          ? `0 0 20px ${statusColor}66`
                          : '0 4px 12px rgba(0,0,0,0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '88px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: statusColor,
                            boxShadow: `0 0 8px ${statusColor}`,
                          }}
                        />
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#fff' }}>
                          {t.tableNumber}
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 600 }}>
                        {t.capacity} GUESTS
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-2)',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                        }}
                      >
                        ₹{(t.minSpend / 1000).toFixed(0)}k min
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Map Legend Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '24px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border)',
                fontSize: '11px',
                color: 'var(--text-2)',
                fontWeight: 600,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF2D78' }} />
                <span>OCCUPIED / SEATED</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFB800' }} />
                <span>RESERVED</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#1AFF7A' }} />
                <span>AVAILABLE (WALK-IN)</span>
              </div>
            </div>
          </div>

          {/* Right Inspector Drawer */}
          <div
            style={{
              background: 'var(--surface-1)',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {activeTable ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.1em' }}>
                      TABLE INSPECTION
                    </span>
                    <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '2px' }}>
                      {activeTable.tableNumber}
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: `${getStatusColor(activeTable.status)}22`,
                      color: getStatusColor(activeTable.status),
                      border: `1px solid ${getStatusColor(activeTable.status)}66`,
                    }}
                  >
                    {activeTable.status}
                  </span>
                </div>

                {/* Table specs */}
                <div
                  style={{
                    background: 'var(--surface-2)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px',
                    fontSize: '11px',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Zone</span>
                    <p style={{ fontWeight: 700, color: '#fff' }}>{activeTable.zone.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Max Seating</span>
                    <p style={{ fontWeight: 700, color: '#fff' }}>{activeTable.capacity} Attendees</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Min Spend</span>
                    <p style={{ fontWeight: 700, color: 'var(--green)' }}>₹{activeTable.minSpend.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-3)' }}>Lead Host</span>
                    <p style={{ fontWeight: 700, color: '#fff' }}>{activeTable.serverName || 'Unassigned'}</p>
                  </div>
                </div>

                {/* Reservation & Guest Party details */}
                {activeTable.guestName ? (
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '12px',
                      background: 'var(--surface-0)',
                    }}
                  >
                    <span style={{ fontSize: '10px', color: 'var(--pink)', fontWeight: 800, letterSpacing: '0.08em' }}>
                      GUEST RESERVATION
                    </span>
                    <p style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginTop: '4px' }}>
                      {activeTable.guestName}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                      {activeTable.guestPhone}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '11px' }}>
                      <span style={{ color: 'var(--text-3)' }}>Party: {activeTable.partySize} Guests</span>
                      <span style={{ color: 'var(--text-3)' }}>Arrival: {activeTable.reservedTime}</span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      border: '1px dashed var(--border)',
                      borderRadius: '10px',
                      padding: '14px',
                      textAlign: 'center',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      No active reservation. Table is available for walk-in VIP guests.
                    </span>
                  </div>
                )}

                {/* Bottle Service Tab */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-2)' }}>
                      BOTTLE SERVICE ORDERS ({activeTable.bottleOrders.length})
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--green)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                      Tab: ₹{activeTable.currentSpend.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div
                    style={{
                      maxHeight: '140px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {activeTable.bottleOrders.length > 0 ? (
                      activeTable.bottleOrders.map((bottle, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--surface-2)',
                            borderRadius: '6px',
                            fontSize: '11px',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>🍾</span>
                          <span>{bottle}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 0' }}>
                        No bottles ordered yet.
                      </span>
                    )}
                  </div>

                  {/* Add Bottle Input */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                    <input
                      type="text"
                      placeholder="Add bottle (e.g. Dom Pérignon)..."
                      value={newBottle}
                      onChange={(e) => setNewBottle(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '11px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddBottle(activeTable.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--pink)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      + Order
                    </button>
                  </div>
                </div>

                {/* State Update Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-3)', fontWeight: 700 }}>QUICK ACTIONS</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(activeTable.id, 'OCCUPIED')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: activeTable.status === 'OCCUPIED' ? '#FF2D78' : 'var(--surface-2)',
                        color: '#fff',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      Seat Table
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(activeTable.id, 'AVAILABLE')}
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: activeTable.status === 'AVAILABLE' ? '#1AFF7A' : 'var(--surface-2)',
                        color: activeTable.status === 'AVAILABLE' ? '#000' : '#fff',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                      }}
                    >
                      Clear & Release
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  minHeight: '360px',
                  color: 'var(--text-3)',
                  textAlign: 'center',
                  padding: '20px',
                }}
              >
                <span style={{ fontSize: '32px', marginBottom: '12px' }}>🍾</span>
                <p style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: '14px' }}>Select a Table</p>
                <p style={{ fontSize: '11px', marginTop: '4px', maxWidth: '200px' }}>
                  Tap any booth on the floorplan to inspect party orders, min spend progress, and guest details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </VenueLayout>
  );
}
