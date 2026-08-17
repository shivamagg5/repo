import React from 'react';

export interface FooterProps {
  appName?: string;
  onNavigate?: (href: string) => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  appName = 'EventPlatform',
  onNavigate,
  className,
}) => {
  return (
    <footer
      className={className}
      style={{
        backgroundColor: 'var(--color-bg-surface, #111625)',
        borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
        padding: '48px 24px 32px 24px',
        color: 'var(--color-text-secondary, #94A3B8)',
        fontSize: 'var(--text-body-small, 14px)',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '32px',
          marginBottom: '32px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--color-brand, #7C3AED) 0%, #EC4899 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: '900',
                fontSize: '14px',
              }}
            >
              E
            </div>
            <span style={{ fontWeight: '800', fontFamily: 'var(--font-display, Outfit, sans-serif)', fontSize: '18px', color: '#FFFFFF' }}>
              {appName}
            </span>
          </div>
          <p style={{ fontSize: '13px', lineHeight: '1.6', margin: 0, color: 'var(--color-text-muted, #64748B)' }}>
            The next-generation live event discovery, cryptographic ticketing, and venue marketplace.
          </p>
        </div>

        <div>
          <h4 style={{ color: '#FFFFFF', fontWeight: '700', margin: '0 0 12px 0', fontSize: '14px' }}>Discover</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><button type="button" onClick={() => onNavigate?.('/events')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>All Live Events</button></li>
            <li><button type="button" onClick={() => onNavigate?.('/venues')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>Venues & Arenas</button></li>
            <li><button type="button" onClick={() => onNavigate?.('/search')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>Search Experiences</button></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#FFFFFF', fontWeight: '700', margin: '0 0 12px 0', fontSize: '14px' }}>Partners & B2B</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><a href="http://localhost:3002" style={{ color: 'inherit', textDecoration: 'none' }}>Organizer Console</a></li>
            <li><a href="http://localhost:3003" style={{ color: 'inherit', textDecoration: 'none' }}>Venue Portal</a></li>
            <li><a href="http://localhost:3004" style={{ color: 'inherit', textDecoration: 'none' }}>Promoter Affiliate</a></li>
          </ul>
        </div>

        <div>
          <h4 style={{ color: '#FFFFFF', fontWeight: '700', margin: '0 0 12px 0', fontSize: '14px' }}>Trust & Legal</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li><span style={{ color: 'var(--color-text-muted, #64748B)' }}>100% Guaranteed Tickets</span></li>
            <li><span style={{ color: 'var(--color-text-muted, #64748B)' }}>Encrypted Payments</span></li>
            <li><span style={{ color: 'var(--color-text-muted, #64748B)' }}>Privacy & Terms</span></li>
          </ul>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          paddingTop: '24px',
          borderTop: '1px solid var(--color-border, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--color-text-muted, #64748B)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span>Terms of Service</span>
          <span>Privacy Policy</span>
          <span>Security</span>
        </div>
      </div>
    </footer>
  );
};
