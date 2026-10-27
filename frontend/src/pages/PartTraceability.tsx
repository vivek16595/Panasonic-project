import React, { useState } from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { Search, Barcode, CheckCircle2, FileSpreadsheet, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { api } from '../services/api';
import { CsvFileMetadata } from '../types';
import { CsvModal } from '../components/CsvModal';

export const PartTraceability: React.FC = () => {
  const { cells, activeCell } = useShopFloor();
  const [barcodeInput, setBarcodeInput] = useState('BC-CHASSIS-2026-9042');
  const [selectedCellId, setSelectedCellId] = useState(activeCell?.id || 'CELL-01');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [traceData, setTraceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [inspectFile, setInspectFile] = useState<CsvFileMetadata | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      setLoading(true);
      const res = await api.scanBarcode(selectedCellId, barcodeInput.trim());
      setScanResult(res);

      // Search traceability for related WorkSN
      const cell = cells.find((c) => c.id === selectedCellId);
      const currentWorkSN = cell?.fixtures[0]?.currentJobWorkSN || '1234567890';
      const trace = await api.getTraceability(currentWorkSN);
      setTraceData(trace);
    } catch (err: any) {
      alert(`Barcode Scan error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6">
        <div className="flex items-center gap-2 mb-1">
          <Barcode className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl font-bold text-white tracking-tight">Part Traceability & Barcode Terminal</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-xl">
          Simulate industrial barcode scans published over WAMP to <code className="text-cyan-300">/barcode</code> topic. Correlates workpieces with cell production runs and bead waveform telemetry without altering controller CSV formats.
        </p>

        {/* Scan Input Form */}
        <form onSubmit={handleScan} className="flex flex-col sm:flex-row items-center gap-3 mt-4 pt-4 border-t border-sky-950">
          <div className="w-full sm:w-48">
            <label className="block text-[11px] text-slate-400 mb-1">Target Active Cell</label>
            <select
              value={selectedCellId}
              onChange={(e) => setSelectedCellId(e.target.value)}
              className="w-full bg-[#070c18] border border-sky-900 rounded p-2 text-xs text-white outline-none font-mono"
            >
              {cells.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} ({c.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 w-full">
            <label className="block text-[11px] text-slate-400 mb-1">Workpiece Barcode Value</label>
            <div className="relative">
              <Barcode className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or type barcode (e.g. BC-CHASSIS-2026-9042)"
                className="w-full bg-[#070c18] border border-sky-900 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary text-xs py-2 px-5 self-end w-full sm:w-auto h-[35px]"
          >
            {loading ? 'Publishing...' : 'Publish Scan via WAMP'}
          </button>
        </form>
      </div>

      {/* Scan Results & Traceability Data */}
      {scanResult && (
        <div className="glass-panel p-6 border-cyan-500/40 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-sky-950">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">WAMP Publication Confirmed</h4>
                <div className="text-xs text-slate-400 font-mono">
                  Topic: <span className="text-cyan-300">/barcode</span> • Scan ID: {scanResult.id}
                </div>
              </div>
            </div>
            <span className="badge badge-ready font-mono text-[10px]">
              {scanResult.publishedSuccessfully ? 'DELIVERED (WAMP)' : 'LOCAL_FALLBACK'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-[#070c18] p-3 rounded-lg border border-sky-950">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Scanned Barcode</span>
              <span className="font-mono font-bold text-white text-sm">{scanResult.barcode}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Associated Cell</span>
              <span className="font-mono text-cyan-300">{scanResult.cellId}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase block">Publication Timestamp</span>
              <span className="font-mono text-slate-300">{new Date(scanResult.scannedAt).toLocaleTimeString()}</span>
            </div>
          </div>

          <div className="pt-2">
            <h5 className="text-xs font-semibold uppercase text-slate-300 mb-2 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" /> Associated Panasonic CSV Artifacts
            </h5>
            {traceData?.associatedCsvFiles && traceData.associatedCsvFiles.length > 0 ? (
              <div className="space-y-2">
                {traceData.associatedCsvFiles.map((f: CsvFileMetadata) => (
                  <div
                    key={f.id}
                    onClick={() => setInspectFile(f)}
                    className="p-2.5 rounded-lg border border-sky-900/40 bg-[#0c1427] hover:border-cyan-400 flex items-center justify-between cursor-pointer text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                      <span className="font-mono text-white font-medium">{f.fileName}</span>
                      <span className="badge badge-completed text-[9px]">{f.fileType}</span>
                    </div>
                    <span className="text-[11px] text-cyan-400 hover:underline">Inspect File &rarr;</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center rounded-lg border border-sky-950 text-slate-500 text-xs">
                No CSV files generated for this workpiece serial yet. Execute a cell to produce Panasonic WELDEVLOG and Waveform records.
              </div>
            )}
          </div>
        </div>
      )}

      {inspectFile && <CsvModal file={inspectFile} onClose={() => setInspectFile(null)} />}
    </div>
  );
};
