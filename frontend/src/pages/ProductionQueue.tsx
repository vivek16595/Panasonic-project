import React from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { QueueControlPanel } from '../components/QueueControlPanel';
import { ListOrdered, CheckCircle2, AlertOctagon, Clock, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export const ProductionQueuePage: React.FC = () => {
  const { queue, cells, refreshAll } = useShopFloor();

  return (
    <div className="space-y-6">
      {/* Overview Info Banner */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <ListOrdered className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Production Queue Execution</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl">
          Sequential multi-cell dispatcher. Validates complete readiness, locks assigned physical robots and fixtures, verifies completion of all required weld passes, and ensures Panasonic CSV logs are written to disk before initiating subsequent cells.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-sky-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-slate-300">Authoritative Backend Completion Verification</span>
          </div>
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-xs text-slate-300">Automatic Fault Interlock & Queue Pause</span>
          </div>
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-300">Synchronous Panasonic CSV Write Handshake</span>
          </div>
        </div>
      </div>

      {/* Main Queue Control Panel */}
      <QueueControlPanel queue={queue} cells={cells} onRefresh={refreshAll} />
    </div>
  );
};
