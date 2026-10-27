import React from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { WeldVisualizer } from '../components/WeldVisualizer';
import { CellCard } from '../components/CellCard';
import { QueueControlPanel } from '../components/QueueControlPanel';
import { Layers, Cpu, CheckCircle2, ShieldCheck, TrendingUp, AlertOctagon, RefreshCw } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { cells, queue, equipment, events, activeCell, selectCell, refreshAll } = useShopFloor();

  const totalCells    = cells.length;
  const runningCells  = cells.filter((c) => c.status === 'Running').length;
  const faultedCells  = cells.filter((c) => c.status === 'Faulted').length;
  const activeRobots  = equipment.filter((e) => e.type === 'robot' && e.availability === 'InUse').length;
  const totalRobots   = equipment.filter((e) => e.type === 'robot').length;
  const completedBeads = cells.reduce((sum, c) => sum + (c.fixtures[0]?.currentBeadIndex || 0), 0);
  const queueStatus   = queue?.status || 'IDLE';

  const stats = [
    {
      label: 'Configured Cells',
      value: totalCells,
      sub: `${runningCells} running · ${faultedCells} faulted`,
      iconClass: 'cyan',
      Icon: Layers,
      accent: 'accent-cyan',
    },
    {
      label: 'Active Robots',
      value: `${activeRobots}/${totalRobots}`,
      sub: `${totalRobots - activeRobots} available`,
      iconClass: 'blue',
      Icon: Cpu,
      accent: 'accent-blue',
    },
    {
      label: 'Beads Welded',
      value: completedBeads,
      sub: 'total cumulative',
      iconClass: 'green',
      Icon: CheckCircle2,
      accent: 'accent-green',
    },
    {
      label: 'Queue State',
      value: queueStatus,
      sub: `${queue?.queueEntries?.length || 0} entries queued`,
      iconClass: faultedCells > 0 ? 'rose' : 'amber',
      Icon: faultedCells > 0 ? AlertOctagon : ShieldCheck,
      accent: 'accent-amber',
    },
  ];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
        {stats.map(({ label, value, sub, iconClass, Icon, accent }, i) => (
          <div
            key={label}
            className={`stat-card ${accent} animate-fade-in-up stagger-${i + 1}`}
          >
            <div className="corner-accent" />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
              <div className={`stat-icon ${iconClass}`}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="stat-label">{label}</div>
                <div className="stat-value">{String(value)}</div>
                <div style={{
                  fontSize: '0.68rem', color: 'var(--text-muted)',
                  marginTop: '0.2rem', fontFamily: "'Rajdhani', sans-serif",
                  letterSpacing: '0.04em',
                }}>
                  {sub}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Live Visualizer ── */}
      <div className="animate-fade-in-up stagger-2">
        <WeldVisualizer cell={activeCell} />
      </div>

      {/* ── Queue + Cells split ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>

        {/* Queue panel */}
        <div className="animate-fade-in-up stagger-3">
          <QueueControlPanel queue={queue} cells={cells} onRefresh={refreshAll} />
        </div>

        {/* Cells grid */}
        <div className="animate-fade-in-up stagger-4">
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span className="live-dot cyan" />
              <span className="section-title">Shop-Floor Robotic Cells</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                Click card → focus live telemetry
              </span>
              <button
                onClick={refreshAll}
                className="btn-ghost"
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            </div>
          </div>

          {cells.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '3rem 2rem',
              background: 'rgba(10,22,40,0.5)', border: '1px dashed var(--border-subtle)',
              borderRadius: 12,
            }}>
              <TrendingUp size={32} color="var(--text-dim)" style={{ margin: '0 auto 0.75rem' }} />
              <p style={{ color: 'var(--text-muted)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em', fontSize: '0.85rem' }}>
                No cells configured yet
              </p>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginTop: '0.35rem' }}>
                Go to Cell Management → Create Cell
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.85rem' }}>
              {cells.map((cell) => (
                <CellCard
                  key={cell.id}
                  cell={cell}
                  onRefresh={refreshAll}
                  onSelect={() => selectCell(cell.id)}
                  isSelected={activeCell?.id === cell.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


