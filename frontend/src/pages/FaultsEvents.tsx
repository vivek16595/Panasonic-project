import React, { useState } from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { AlertTriangle, AlertOctagon, CheckCircle2, ShieldAlert, RotateCcw, Flame } from 'lucide-react';
import { api } from '../services/api';

export const FaultsEvents: React.FC = () => {
  const { events, cells, refreshAll } = useShopFloor();
  const [targetCellId, setTargetCellId] = useState(cells[0]?.id || 'CELL-01');
  const [faultReason, setFaultReason] = useState('Arc Extinguishment & Shielding Gas Pressure Loss');
  const [loading, setLoading] = useState(false);

  const handleInject = async () => {
    try {
      setLoading(true);
      await api.injectFault(targetCellId, undefined, faultReason);
      refreshAll();
    } catch (err: any) {
      alert(`Fault Injection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview & Fault Injection Tool */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Faults & Operational Alarm Events</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xl">
          Industrial alarm log viewer and safety interlock validation terminal. Test queue safety behavior by injecting simulated robot faults.
        </p>

        {/* Fault Injection Panel */}
        <div className="mt-4 pt-4 border-t border-sky-950 bg-[#070c18] p-4 rounded-xl border border-sky-900/40">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
            <AlertOctagon className="w-4 h-4" /> Safety Interlock Fault Injection Tester
          </h4>
          <p className="text-[11px] text-slate-400 mb-3">
            Injecting a fault into an active cell will stop its weld arc, record the failure into Panasonic OPREVLOG, and block subsequent queued cells until an operator confirms a retry.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-48">
              <label className="block text-[10px] text-slate-400 mb-1">Target Cell</label>
              <select
                value={targetCellId}
                onChange={(e) => setTargetCellId(e.target.value)}
                className="w-full bg-[#0c1427] border border-sky-900 rounded p-2 text-xs text-white outline-none font-mono"
              >
                {cells.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} ({c.name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 w-full">
              <label className="block text-[10px] text-slate-400 mb-1">Fault Description / Alarm Code</label>
              <input
                type="text"
                value={faultReason}
                onChange={(e) => setFaultReason(e.target.value)}
                className="w-full bg-[#0c1427] border border-sky-900 rounded p-2 text-xs text-white font-mono outline-none"
              />
            </div>

            <button
              onClick={handleInject}
              disabled={loading}
              className="btn-danger text-xs py-2 px-4 self-end w-full sm:w-auto h-[35px]"
            >
              Inject Interlock Fault
            </button>
          </div>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-sky-950 font-semibold text-xs text-slate-300 uppercase tracking-wider">
          Recorded Operational Alarms & Events Stream
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070c18] border-b border-sky-950 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Level</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Associated Cell</th>
                <th className="py-3 px-4">Alarm Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-950/60 font-sans">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No alarms or events logged.
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">{evt.id}</td>
                    <td className="py-3 px-4">
                      <span className={`badge ${
                        evt.level === 'error' ? 'badge-faulted' :
                        evt.level === 'warn' ? 'badge-draft' : 'badge-ready'
                      }`}>
                        {evt.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 font-mono text-cyan-300">
                      {evt.cellId || 'GLOBAL'}
                    </td>
                    <td className="py-3 px-4 text-slate-200">{evt.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
