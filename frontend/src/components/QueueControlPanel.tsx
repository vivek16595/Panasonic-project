import React, { useState } from 'react';
import { ProductionQueue, Cell } from '../types';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  ChevronUp, 
  ChevronDown, 
  FileSpreadsheet, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface QueueControlPanelProps {
  queue: ProductionQueue | null;
  cells: Cell[];
  onRefresh: () => void;
}

export const QueueControlPanel: React.FC<QueueControlPanelProps> = ({ queue, cells, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!queue) {
    return (
      <div className="glass-panel p-6 text-center text-xs text-slate-400">
        <div style={{
          width: 20, height: 20, border: '2px solid rgba(0,245,255,0.2)',
          borderTopColor: 'var(--cyan)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem'
        }} />
        Connecting to Sequential Production Queue Engine...
      </div>
    );
  }

  const handleStart = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await api.startQueue();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setLoading(true);
      await api.pauseQueue();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setLoading(true);
      await api.resumeQueue();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    try {
      setLoading(true);
      await api.stopQueue();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (cellId: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await api.retryCell(cellId);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveItem = async (index: number, direction: 'UP' | 'DOWN') => {
    if (queue.status === 'Running') return;
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= queue.items.length) return;

    const newItems = [...queue.items];
    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    const orderedIds = newItems.map((it) => it.queueItemId);
    try {
      setLoading(true);
      await api.reorderQueue(orderedIds);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCell = async (cellId: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      await api.addCellToQueue(cellId);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentItem = queue.items[queue.currentItemIndex] || queue.items.find(it => it.status === 'Running');
  const availableToAdd = cells.filter(
    (c) => !queue.items.some((it) => it.cellId === c.id && it.status !== 'Completed')
  );

  return (
    <div className="glass-panel p-6 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-sky-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-base text-white tracking-tight uppercase">
              Sequential Multi-Cell Production Queue
            </span>
            <span className={`badge ${
              queue.status === 'Running' ? 'badge-running' : 
              queue.status === 'Paused' ? 'badge-draft' : 
              queue.status === 'Faulted' ? 'badge-faulted' : 
              queue.status === 'Completed' ? 'badge-completed' : 'badge-ready'
            }`}>
              {queue.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Executes cells sequentially: Cell B starts strictly after Cell A completes all beads & CSV writes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {queue.status !== 'Running' && queue.status !== 'Paused' ? (
            <button
              onClick={handleStart}
              disabled={loading || queue.items.length === 0}
              className="btn-primary text-xs py-2 px-4 shadow-lg shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Start Queue
            </button>
          ) : queue.status === 'Running' ? (
            <button
              onClick={handlePause}
              disabled={loading}
              className="btn-secondary text-xs py-2 px-4"
            >
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
          ) : (
            <button
              onClick={handleResume}
              disabled={loading}
              className="btn-primary text-xs py-2 px-4"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Resume
            </button>
          )}

          {(queue.status === 'Running' || queue.status === 'Paused') && (
            <button
              onClick={handleStop}
              disabled={loading}
              className="btn-danger text-xs py-2 px-4"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Stop Queue
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 my-4 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Currently Executing Cell Banner */}
      {currentItem && (
        <div className="my-4 p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-cyan-400">
                ACTIVE QUEUE EXECUTION
              </div>
              <div className="text-sm font-bold text-white font-mono">
                Position #{currentItem.order}: {currentItem.cellName} ({currentItem.cellId})
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">CSV Status:</span>
            <span className={`badge ${
              currentItem.csvStatus === 'Writing' ? 'badge-running' :
              currentItem.csvStatus === 'Completed' ? 'badge-completed' :
              currentItem.csvStatus === 'Failed' ? 'badge-faulted' : 'badge-waiting'
            }`}>
              {currentItem.csvStatus}
            </span>
          </div>
        </div>
      )}

      {/* Queue Items Table */}
      <div className="mt-4 space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between mb-2">
          <span>Scheduled Execution Sequence ({queue.items.length})</span>
          {availableToAdd.length > 0 && queue.status !== 'Running' && (
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400">Queue Cell:</span>
              {availableToAdd.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAddCell(c.id)}
                  disabled={loading}
                  className="px-2 py-0.5 rounded bg-sky-950 border border-sky-800/80 text-[10px] text-cyan-300 hover:bg-sky-900 font-mono"
                >
                  + {c.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {queue.items.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-sky-900/40 rounded-xl text-slate-500 text-xs">
            Queue is currently empty. Add cells to construct the sequential execution schedule.
          </div>
        ) : (
          queue.items.map((item, index) => {
            const isRunning = item.status === 'Running';
            const isFaulted = item.status === 'Faulted';
            return (
              <div
                key={item.queueItemId}
                className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                  isRunning
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-lg shadow-cyan-950/40'
                    : isFaulted
                    ? 'border-rose-700 bg-rose-950/30'
                    : 'border-sky-900/30 bg-[#0c1427]/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Position number */}
                  <div className="w-7 h-7 rounded-lg bg-[#070c18] border border-sky-900/60 font-mono text-xs font-bold text-cyan-400 flex items-center justify-center">
                    {index + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">{item.cellName}</span>
                      <span className="font-mono text-[10px] text-slate-400">({item.cellId})</span>
                      <span className={`badge ${
                        item.status === 'Ready' ? 'badge-ready' :
                        item.status === 'Running' ? 'badge-running' :
                        item.status === 'Completed' ? 'badge-completed' :
                        item.status === 'Faulted' ? 'badge-faulted' :
                        item.status === 'Blocked' ? 'badge-blocked' : 'badge-waiting'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    {item.error && (
                      <div className="text-[11px] text-rose-400 mt-0.5">
                        Failure reason: {item.error}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* CSV File Counter */}
                  {item.generatedCsvFiles.length > 0 && (
                    <span className="text-xs font-mono text-cyan-300 flex items-center gap-1 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/40">
                      <FileSpreadsheet className="w-3.5 h-3.5" /> {item.generatedCsvFiles.length} files
                    </span>
                  )}

                  {/* Retry Action */}
                  {isFaulted && (
                    <button
                      onClick={() => handleRetry(item.cellId)}
                      disabled={loading}
                      className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs flex items-center gap-1 hover:bg-amber-500/30"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Cell
                    </button>
                  )}

                  {/* Reorder Buttons */}
                  {queue.status !== 'Running' && (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveItem(index, 'UP')}
                        disabled={index === 0 || loading}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveItem(index, 'DOWN')}
                        disabled={index === queue.items.length - 1 || loading}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
