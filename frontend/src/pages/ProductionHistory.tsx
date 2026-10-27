import React, { useEffect, useState } from 'react';
import { ProductionHistoryRecord } from '../types';
import { History, CheckCircle2, XCircle, Clock, FileSpreadsheet } from 'lucide-react';
import { api } from '../services/api';

export const ProductionHistoryPage: React.FC = () => {
  const [history, setHistory] = useState<ProductionHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getProductionHistory()
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Production History</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xl">
          Historical record of completed, stopped, and faulted cell production runs.
        </p>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070c18] border-b border-sky-950 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Run ID</th>
                <th className="py-3 px-4">Cell</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Start Time</th>
                <th className="py-3 px-4">Completion Time</th>
                <th className="py-3 px-4">Beads Welded</th>
                <th className="py-3 px-4">CSV Artifacts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-950/60 font-sans">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No completed production runs recorded yet. Start the production queue or run a manual cell weld to populate history.
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">{record.id}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {record.cellName} <span className="font-mono text-[10px] text-slate-400">({record.cellId})</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`badge ${record.status === 'Completed' ? 'badge-completed' : 'badge-faulted'}`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(record.startedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(record.completedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300">
                      {record.completedBeads} / {record.totalBeads}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" /> {record.csvFilesCount} files
                    </td>
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
