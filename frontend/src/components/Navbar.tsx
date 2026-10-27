import React from 'react';
import {
  Activity, Layers, ListOrdered, Cpu, History,
  AlertTriangle, FileSpreadsheet, Search, Wifi, WifiOff, Zap
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isConnected: boolean;
}

const NAV_ITEMS = [
  { id: 'dashboard',    label: 'Dashboard',          icon: Activity,        accent: '#00f5ff' },
  { id: 'cells',        label: 'Cell Mgmt',           icon: Layers,          accent: '#00f5ff' },
  { id: 'queue',        label: 'Prod Queue',          icon: ListOrdered,     accent: '#ffab00' },
  { id: 'equipment',    label: 'Equipment',           icon: Cpu,             accent: '#82b1ff' },
  { id: 'traceability', label: 'Traceability',        icon: Search,          accent: '#00e676' },
  { id: 'history',      label: 'History',             icon: History,         accent: '#82b1ff' },
  { id: 'faults',       label: 'Faults',              icon: AlertTriangle,   accent: '#ff6090' },
  { id: 'csv',          label: 'CSV',                 icon: FileSpreadsheet, accent: '#00e676' },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isConnected }) => {
  return (
    <header
      style={{
        background: 'rgba(3,6,15,0.95)',
        borderBottom: '1px solid rgba(0,245,255,0.1)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 40,
      }}
    >
      {/* Top strip with brand + status */}
      <div
        style={{
          maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '60px',
        }}
      >
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Logo icon */}
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #00f5ff 0%, #0070f3 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0,245,255,0.4)',
          }}>
            <Zap size={20} color="#000" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
                fontSize: '1.05rem', letterSpacing: '0.08em', color: '#f0f8ff',
              }}>
                WELDING SIM
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: '0.58rem',
                background: 'rgba(0,245,255,0.08)', color: 'var(--cyan)',
                border: '1px solid rgba(0,245,255,0.2)', borderRadius: 4,
                padding: '0.1rem 0.4rem', fontWeight: 600, letterSpacing: '0.06em',
              }}>
                v2.4
              </span>
            </div>
            <p style={{
              fontFamily: "'Rajdhani', sans-serif", fontSize: '0.62rem',
              color: 'var(--text-muted)', letterSpacing: '0.08em', marginTop: 1,
            }}>
              MULTI-CELL SEQUENTIAL PRODUCTION
            </p>
          </div>
        </div>

        {/* Right side: clock + connection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LiveClock />
          <ConnectionPill connected={isConnected} />
        </div>
      </div>

      {/* Nav tabs */}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1.5rem' }}>
        <nav style={{ display: 'flex', gap: '2px', overflowX: 'auto', paddingBottom: '8px' }}>
          {NAV_ITEMS.map(({ id, label, icon: Icon, accent }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.42rem 0.85rem', borderRadius: 8, border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s ease',
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: active ? 700 : 500,
                  letterSpacing: '0.06em', fontSize: '0.78rem',
                  background: active ? `rgba(0,245,255,0.08)` : 'transparent',
                  color: active ? accent : 'var(--text-muted)',
                  boxShadow: active ? `0 0 0 1px rgba(0,245,255,0.25) inset` : 'none',
                  borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
                  marginBottom: -2,
                }}
              >
                <Icon
                  size={14}
                  color={active ? accent : 'currentColor'}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

/* ── Live clock ── */
const LiveClock: React.FC = () => {
  const [time, setTime] = React.useState(() => new Date());
  React.useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem',
      color: 'var(--text-muted)', letterSpacing: '0.05em',
    }}>
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </span>
  );
};

/* ── Connection pill ── */
const ConnectionPill: React.FC<{ connected: boolean }> = ({ connected }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.28rem 0.75rem', borderRadius: 999,
    border: `1px solid ${connected ? 'rgba(0,230,118,0.3)' : 'rgba(255,23,68,0.3)'}`,
    background: connected ? 'rgba(0,230,118,0.07)' : 'rgba(255,23,68,0.07)',
    fontFamily: "'JetBrains Mono', monospace", fontSize: '0.65rem', fontWeight: 600,
    letterSpacing: '0.06em', color: connected ? 'var(--emerald)' : '#ff6090',
  }}>
    {connected
      ? <Wifi size={11} color="var(--emerald)" />
      : <WifiOff size={11} color="#ff6090" style={{ animation: 'dot-blink 0.8s infinite' }} />}
    {connected ? 'LIVE' : 'OFFLINE'}
  </div>
);
