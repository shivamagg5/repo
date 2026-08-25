import Link from 'next/link';

export function Footer() {
  return (
    <footer style={{
      background: 'var(--surface-1)',
      borderTop: '1px solid var(--border)',
      padding: '40px 24px',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '32px', marginBottom: '40px',
        }}>
          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--pink)' }}>✳</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: '#fff', letterSpacing: '0.1em' }}>EVENTPLATFORM</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.6, maxWidth: '200px' }}>
              Real tickets. Real nights. No bots, no fakes.
            </p>
          </div>

          {/* Events */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>
              Events
            </h4>
            {['Music & Concerts', 'Standup Comedy', 'Festivals', 'Sports', 'Arts & Culture'].map(item => (
              <Link
                key={item}
                href={`/events?category=${item.toLowerCase().replace(/\s+/g, '-')}`}
                style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '8px', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
              >
                {item}
              </Link>
            ))}
          </div>

          {/* Cities */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>
              Cities
            </h4>
            {['Mumbai', 'Bengaluru', 'Delhi', 'Goa', 'Hyderabad'].map(city => (
              <Link
                key={city}
                href={`/events?city=${city}`}
                style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '8px', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
              >
                {city}
              </Link>
            ))}
          </div>

          {/* Company */}
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '14px' }}>
              Company
            </h4>
            {['About', 'Blog', 'Careers', 'Press', 'Contact'].map(item => (
              <Link
                key={item}
                href={`/${item.toLowerCase()}`}
                style={{ display: 'block', fontSize: '13px', color: 'var(--text-2)', marginBottom: '8px', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-2)'; }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '24px',
          display: 'flex', flexWrap: 'wrap', gap: '12px',
          alignItems: 'center', justifyContent: 'space-between',
        }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            © 2026 EventPlatform. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(item => (
              <Link
                key={item}
                href="/"
                style={{ fontSize: '12px', color: 'var(--text-3)', textDecoration: 'none', transition: 'color 150ms' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
