import React, { useState } from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { CsvFileMetadata } from '../types';
import { CsvModal } from '../components/CsvModal';
import { FileSpreadsheet, Eye, Download, Search, Filter, Cpu, Layers } from 'lucide-react';

export const CsvOutputs: React.FC = () => {
  const { csvFiles, cells } = useShopFloor();
  const [inspectFile, setInspectFile] = useState<CsvFileMetadata | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = csvFiles.filter((f) => {
    const matchesType = filterType === 'ALL' || f.fileType === filterType;
    const matchesSearch =
      f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.controllerSN.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.cellId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Panasonic Controller CSV Outputs</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl">
          Directory root: <code className="text-cyan-300 font-mono">backend/data/csv-output/&lt;controllerSN&gt;/</code>.
          Preserves original Panasonic byte layouts, daily append logs (WELDEVLOG, OPREVLOG), and exact 8-line header Waveform files (100 ms sampling).
        </p>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-sky-950">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by file name or controller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#070c18] border border-sky-900 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {['ALL', 'WELDEVLOG', 'OPREVLOG', 'WAVEFORM'].map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  filterType === t
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                    : 'text-slate-400 hover:text-white bg-slate-900/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CSV Files Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070c18] border-b border-sky-950 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Generated File Name</th>
                <th className="py-3 px-4">Log Format</th>
                <th className="py-3 px-4">Controller SN</th>
                <th className="py-3 px-4">Cell Context</th>
                <th className="py-3 px-4">WorkSN / Bead</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-950/60 font-sans">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No CSV output files recorded yet. Run a cell weld to generate Panasonic controller files.
                  </td>
                </tr>
              ) : (
                filtered.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
                      {file.fileName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`badge ${
                          file.fileType === 'WAVEFORM'
                            ? 'badge-ready'
                            : file.fileType === 'WELDEVLOG'
                            ? 'badge-completed'
                            : 'badge-draft'
                        }`}
                      >
                        {file.fileType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-cyan-300">{file.controllerSN}</td>
                    <td className="py-3.5 px-4 font-mono text-white">{file.cellId}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {file.workSN ? `${file.workSN} (Bead #${file.beadNumber || 1})` : 'Controller Event'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {(file.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(file.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setInspectFile(file)}
                        className="btn-secondary text-xs py-1 px-2.5 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" /> View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {inspectFile && <CsvModal file={inspectFile} onClose={() => setInspectFile(null)} />}
    </div>
  );
};
