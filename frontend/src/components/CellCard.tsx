import React, { useState } from 'react';
import { Cell } from '../types';
import { Play, Square, AlertOctagon, Trash2, Cpu, Box, FileText, Zap } from 'lucide-react';
import { api } from '../services/api';

interface CellCardProps {
  cell: Cell;
  onRefresh: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

const STATUS_CONFIG: Record<string, { dot: string; badge: string }> = {
  Ready:     { dot: 'green', badge: 'badge-ready' },
  Running:   { dot: 'cyan',  badge: 'badge-running' },
  Completed: { dot: 'grey',  badge: 'badge-completed' },
  Faulted:   { dot: 'red',   badge: 'badge-faulted' },
  Stopped:   { dot: 'grey',  badge: 'badge-stopped' },
  Draft:     { dot: 'amber', badge: 'badge-draft' },
};

export const CellCard: React.FC<CellCardProps> = ({ cell, onRefresh, onSelect, isSelected }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cfg = STATUS_CONFIG[cell.status] || { dot: 'grey', badge: 'badge-waiting' };
  const primaryFixture = cell.fixtures[0];
  const progressPct = primaryFixture?.progressPct || 0;
  const isRunning = cell.status === 'Running';

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await fn();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const borderColor = isSelected
    ? 'rgba(0,245,255,0.7)'
    : isRunning
      ? 'rgba(0,245,255,0.3)'
      : 'rgba(0,245,255,0.1)';

  return (
    <div
      onClick={onSelect}
      style={{
        background: 'linear-gradient(145deg, rgba(14,30,54,0.92) 0%, rgba(6,13,26,0.97) 100%)',
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: '1.1rem 1.25rem',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.22s ease',
        boxShadow: isSelected
          ? '0 0 0 2px rgba(0,245,255,0.18), 0 0 24px rgba(0,245,255,0.15)'
          : isRunning
            ? '0 0 12px rgba(0,245,255,0.08)'
            : 'none',
      }}
    >
      {/* Top row: ID, Status badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
            color: 'var(--cyan)', fontFamily: "'Rajdhani', monospace",
          }}>
            {cell.id}
          </span>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.65rem' }}>•</span>
          <span className={`badge ${cfg.badge}`}>
            {cell.status}
          </span>
        </div>
        {isRunning && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.65rem', color: 'var(--cyan)', fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)',
              animation: 'beacon-pulse 1.4s ease-in-out infinite',
            }} />
            ARC ACTIVE
          </span>
        )}
      </div>

      {/* Name and description */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.85rem' }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
          <h4 style={{
            fontSize: '0.95rem', fontWeight: 700, margin: 0,
            color: 'var(--text-bright)', letterSpacing: '0.02em', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cell.name}
          </h4>
          <p style={{
            fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cell.description}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); run(() => api.deleteCell(cell.id)); }}
          disabled={isRunning || cell.status === 'Queued'}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-dim)', padding: '0.25rem', borderRadius: 6,
            display: 'flex', transition: 'all 0.15s ease', flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#ff6090')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Metrics strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '0.5rem', padding: '0.65rem 0.75rem',
        background: 'rgba(3,6,15,0.6)',
        border: '1px solid rgba(0,245,255,0.07)',
        borderRadius: 8, marginBottom: '0.85rem',
      }}>
        {[
          { Icon: Cpu,      label: 'ROBOTS',   value: cell.robots.length,   color: 'var(--cyan)' },
          { Icon: Box,      label: 'FIXTURES',  value: cell.fixtures.length, color: 'var(--amber-hot)' },
          { Icon: FileText, label: 'PROGRAMS',  value: cell.programs.length, color: '#82b1ff' },
        ].map(({ Icon, label, value, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Icon size={13} color={color} />
            <div>
              <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', letterSpacing: '0.08em', fontFamily: "'Rajdhani', sans-serif", fontWeight: 700 }}>
                {label}
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-bright)', fontFamily: "'Rajdhani', monospace", lineHeight: 1 }}>
                {value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar (if running) */}
      {isRunning && (
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '0.35rem',
          }}>
            <span style={{
              fontSize: '0.65rem', color: 'var(--cyan)',
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 500,
            }}>
              <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
              {progressPct}% complete
            </span>
            <span style={{ fontSize: '0.63rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              Bead {primaryFixture?.currentBeadIndex || 0}/{primaryFixture?.totalBeads || 0}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div style={{
          padding: '0.45rem 0.65rem', marginBottom: '0.7rem', borderRadius: 6,
          background: 'rgba(255,23,68,0.08)', border: '1px solid rgba(255,23,68,0.25)',
          color: '#ff6090', fontSize: '0.72rem',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Action row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: '0.65rem',
        borderTop: '1px solid rgba(0,245,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isRunning ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); run(() => api.stopCell(cell.id)); }}
                disabled={loading}
                className="btn-danger"
                style={{ padding: '0.38rem 0.85rem', fontSize: '0.75rem' }}
              >
                <Square size={11} style={{ fill: 'currentColor' }} /> Stop
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); run(() => api.injectFault(cell.id, primaryFixture?.id, 'Manual E-STOP')); }}
                disabled={loading}
                style={{
                  padding: '0.38rem 0.65rem', fontSize: '0.73rem',
                  background: 'rgba(255,23,68,0.06)', color: '#ff6090',
                  border: '1px solid rgba(255,23,68,0.25)', borderRadius: 7,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem',
                  fontFamily: "'Rajdhani', sans-serif", fontWeight: 600, letterSpacing: '0.04em',
                  transition: 'all 0.15s ease',
                }}
              >
                <AlertOctagon size={11} /> E-STOP
              </button>
            </>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); run(() => api.startManualWeld(cell.id)); }}
              disabled={loading || cell.status === 'Draft' || cell.status === 'Faulted'}
              className="btn-primary"
              style={{ padding: '0.38rem 0.85rem', fontSize: '0.75rem' }}
            >
              <Play size={11} style={{ fill: 'currentColor' }} /> Start Weld
            </button>
          )}
        </div>
        <span style={{
          fontSize: '0.65rem', color: 'var(--text-dim)',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {cell.createdAt ? new Date(cell.createdAt).toLocaleDateString() : '—'}
        </span>
      </div>
    </div>
  );
};
