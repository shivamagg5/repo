'use client';

// =============================================================================
// PULSR — Interactive Arena & Seat Map Zone Visualizer
// Real-time SVG stadium layout with hover viewpoints, synced ticket tiers,
// audio micro-haptics, and live availability telemetry.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Eye, Sparkles, Compass } from 'lucide-react';
import type { TicketType } from '@platform/types';
import { soundFX } from '../../lib/soundEffects';

interface InteractiveSeatMapProps {
  ticketTypes: TicketType[];
  selectedTypeId: string;
  onSelectTier: (tierId: string) => void;
  venueName?: string;
}

interface ArenaZoneConfig {
  id: string;
  name: string;
  tierKeyword: string[];
  viewAngle: string;
  distance: string;
  accentColor: string;
  glowColor: string;
  polygonPoints: string;
  labelX: number;
  labelY: number;
}

const ARENA_ZONES: ArenaZoneConfig[] = [
  {
    id: 'zone-vip-pit',
    name: 'VIP Front Pit',
    tierKeyword: ['vip', 'pit', 'front', 'fan pit'],
    viewAngle: 'Direct Front Row (Center Stage)',
    distance: '5m — 15m from Headliner',
    accentColor: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.45)',
    polygonPoints: '170,120 430,120 410,185 190,185',
    labelX: 300,
    labelY: 155,
  },
  {
    id: 'zone-backstage',
    name: 'Backstage Deck & Lounge',
    tierKeyword: ['backstage', 'lounge', 'cabana', 'hospitality', 'platinum'],
    viewAngle: 'Elevated VIP Artist Balcony',
    distance: 'Side Stage Luxury Suite',
    accentColor: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    polygonPoints: '450,110 570,110 550,210 430,200',
    labelX: 495,
    labelY: 155,
  },
  {
    id: 'zone-ga-standing',
    name: 'General Admission Arena',
    tierKeyword: ['general', 'ga', 'phase', 'standing', 'floor', 'arena'],
    viewAngle: 'Main Festival Floor & Laser Zone',
    distance: '15m — 50m from Stage',
    accentColor: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.45)',
    polygonPoints: '150,205 450,205 470,300 130,300',
    labelX: 300,
    labelY: 250,
  },
  {
    id: 'zone-grandstand',
    name: 'Silver Grandstand',
    tierKeyword: ['silver', 'grandstand', 'seated', 'bleacher', 'tier 1', 'tier 2', 'balcony'],
    viewAngle: 'Tiered Amphitheater Seating',
    distance: 'Panoramic Stadium Overview',
    accentColor: '#06B6D4',
    glowColor: 'rgba(6, 182, 212, 0.45)',
    polygonPoints: '90,320 510,320 540,395 60,395',
    labelX: 300,
    labelY: 358,
  },
];

export function InteractiveSeatMap({
  ticketTypes,
  selectedTypeId,
  onSelectTier,
  venueName,
}: InteractiveSeatMapProps) {
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(soundFX.muted);

  const toggleSound = () => {
    const next = soundFX.toggleMute();
    setIsMuted(next);
  };

  // Map each arena zone to a matching ticket tier in props
  const zoneTierMap = useMemo(() => {
    const map = new Map<string, TicketType | undefined>();

    ARENA_ZONES.forEach((zone) => {
      const match = ticketTypes.find((t) => {
        const lowerName = t.name.toLowerCase();
        return zone.tierKeyword.some((keyword) => lowerName.includes(keyword));
      });
      // Fallback: match by index if no keyword matches
      map.set(zone.id, match ?? ticketTypes[0]);
    });

    return map;
  }, [ticketTypes]);

  // Which zone is currently active based on selectedTypeId
  const activeZoneId = useMemo(() => {
    for (const zone of ARENA_ZONES) {
      const tier = zoneTierMap.get(zone.id);
      if (tier && tier.id === selectedTypeId) {
        return zone.id;
      }
    }
    return null;
  }, [selectedTypeId, zoneTierMap]);

  const activeZoneInfo = hoveredZoneId
    ? ARENA_ZONES.find((z) => z.id === hoveredZoneId)
    : ARENA_ZONES.find((z) => z.id === activeZoneId);

  const activeZoneTier = activeZoneInfo ? zoneTierMap.get(activeZoneInfo.id) : null;

  const handleZoneClick = (zone: ArenaZoneConfig) => {
    const tier = zoneTierMap.get(zone.id);
    if (tier) {
      soundFX.playSelect();
      onSelectTier(tier.id);
    }
  };

  const handleZoneHover = (zoneId: string) => {
    setHoveredZoneId(zoneId);
    soundFX.playHover();
  };

  return (
    <div className="relative rounded-3xl bg-[#0B0F19]/90 border border-purple-500/20 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span className="text-xs font-black uppercase tracking-wider text-purple-300 font-['Outfit']">
              Live Interactive Arena Map
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {venueName ? `Venue: ${venueName}` : 'Select a zone to preview viewpoint & tier'}
          </p>
        </div>

        <button
          type="button"
          onClick={toggleSound}
          title={isMuted ? 'Unmute Audio Micro-Haptics' : 'Mute Audio Micro-Haptics'}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all active:scale-90"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-gray-500" /> : <Volume2 className="w-4 h-4 text-purple-400" />}
        </button>
      </div>

      {/* SVG Arena Stadium Stage & Zones */}
      <div className="relative w-full aspect-[4/3] max-h-[380px] bg-gradient-to-b from-[#131726]/60 via-[#0B0F19] to-[#070A12] rounded-2xl border border-white/5 flex items-center justify-center p-2 select-none">
        {/* Ambient Stage Lights Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-28 bg-gradient-to-b from-purple-500/20 via-pink-500/10 to-transparent blur-2xl pointer-events-none" />

        <svg
          viewBox="0 0 600 420"
          className="w-full h-full drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Stage Laser Beam Linear Gradients */}
            <linearGradient id="stageGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            <linearGradient id="laserLeft" x1="0%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="rgba(236, 72, 153, 0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            <linearGradient id="laserRight" x1="100%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            {/* Pattern Grid for Stadium Flooring */}
            <pattern id="arenaGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Background Grid Floor */}
          <rect x="0" y="0" width="600" height="420" fill="url(#arenaGrid)" />

          {/* Laser Beams from Stage */}
          <polygon points="200,60 120,400 150,400" fill="url(#laserLeft)" />
          <polygon points="400,60 480,400 450,400" fill="url(#laserRight)" />
          <polygon points="300,60 270,410 330,410" fill="rgba(139, 92, 246, 0.12)" />

          {/* --- MAIN STAGE RIG --- */}
          <g className="cursor-default">
            {/* Stage Arch Floor */}
            <polygon
              points="180,65 420,65 390,30 210,30"
              fill="url(#stageGlow)"
              className="drop-shadow-[0_0_15px_rgba(139,92,246,0.8)]"
            />
            {/* Stage Deck Platform */}
            <polygon
              points="200,65 400,65 385,45 215,45"
              fill="#0F172A"
              stroke="#A855F7"
              strokeWidth="2"
            />
            {/* Sound Wave Neon Equalizer on Stage */}
            <line x1="260" y1="52" x2="260" y2="40" stroke="#EC4899" strokeWidth="3" strokeLinecap="round" />
            <line x1="280" y1="55" x2="280" y2="35" stroke="#F43F5E" strokeWidth="3" strokeLinecap="round" />
            <line x1="300" y1="58" x2="300" y2="32" stroke="#A855F7" strokeWidth="4" strokeLinecap="round" />
            <line x1="320" y1="55" x2="320" y2="35" stroke="#3B82F6" strokeWidth="3" strokeLinecap="round" />
            <line x1="340" y1="52" x2="340" y2="40" stroke="#06B6D4" strokeWidth="3" strokeLinecap="round" />

            <text
              x="300"
              y="60"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="900"
              letterSpacing="2"
              className="font-['Outfit'] select-none pointer-events-none"
            >
              ★ MAIN STAGE / DJ DECK ★
            </text>
          </g>

          {/* --- INTERACTIVE ARENA ZONES --- */}
          {ARENA_ZONES.map((zone) => {
            const isHovered = hoveredZoneId === zone.id;
            const isSelected = activeZoneId === zone.id;
            const tier = zoneTierMap.get(zone.id);
            const isAvailable = tier
              ? tier.quantity - tier.soldQuantity - tier.reservedQuantity > 0
              : true;

            return (
              <g
                key={zone.id}
                onMouseEnter={() => handleZoneHover(zone.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                onClick={() => handleZoneClick(zone)}
                className="cursor-pointer transition-transform duration-200"
                tabIndex={0}
                role="button"
                aria-label={`${zone.name}: ${tier?.name ?? 'Tier'}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleZoneClick(zone);
                  }
                }}
              >
                {/* Zone Polygon */}
                <polygon
                  points={zone.polygonPoints}
                  fill={
                    isSelected
                      ? zone.glowColor
                      : isHovered
                      ? 'rgba(255, 255, 255, 0.12)'
                      : 'rgba(255, 255, 255, 0.04)'
                  }
                  stroke={isSelected ? zone.accentColor : isHovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)'}
                  strokeWidth={isSelected ? '3' : isHovered ? '2' : '1.2'}
                  strokeDasharray={isAvailable ? 'none' : '4,4'}
                  className="transition-all duration-300 hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 14px ${zone.accentColor})` : undefined,
                  }}
                />

                {/* Zone Label Badge */}
                <rect
                  x={zone.labelX - 70}
                  y={zone.labelY - 14}
                  width="140"
                  height="26"
                  rx="6"
                  fill="rgba(9, 12, 21, 0.88)"
                  stroke={isSelected ? zone.accentColor : 'rgba(255, 255, 255, 0.15)'}
                  strokeWidth="1"
                  className="pointer-events-none"
                />

                <text
                  x={zone.labelX}
                  y={zone.labelY + 3}
                  textAnchor="middle"
                  fill={isSelected ? zone.accentColor : '#F8FAFC'}
                  fontSize="10"
                  fontWeight="800"
                  className="font-['Outfit'] select-none pointer-events-none tracking-wide"
                >
                  {zone.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating Viewpoint & Zone Telemetry Dock */}
      <AnimatePresence mode="wait">
        {activeZoneInfo && (
          <motion.div
            key={activeZoneInfo.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="mt-3 p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeZoneInfo.accentColor }}
                />
                <span className="font-extrabold text-white font-['Outfit'] text-sm">
                  {activeZoneInfo.name}
                </span>
                {activeZoneTier && (
                  <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-md border border-purple-500/30">
                    {activeZoneTier.name}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-gray-400 text-[11px]">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  {activeZoneInfo.viewAngle}
                </span>
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-gray-400" />
                  {activeZoneInfo.distance}
                </span>
              </div>
            </div>

            {/* Quick Select Button if not active */}
            {activeZoneTier && (
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <div className="text-right mr-1">
                  <span className="text-sm font-black text-white font-['Outfit'] block">
                    ₹{(activeZoneTier.priceMinor / 100).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-gray-400 block">per pass</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleZoneClick(activeZoneInfo)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    activeZoneId === activeZoneInfo.id
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.5)]'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {activeZoneId === activeZoneInfo.id ? 'Selected' : 'Pick Zone'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
