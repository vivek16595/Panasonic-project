import React, { useEffect, useState } from 'react';
import { CsvFileMetadata } from '../types';
import { X, Download, FileSpreadsheet, Eye, Check } from 'lucide-react';
import { api } from '../services/api';

interface CsvModalProps {
  file: CsvFileMetadata | null;
  onClose: () => void;
}

export const CsvModal: React.FC<CsvModalProps> = ({ file, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!file) return;
    setLoading(true);
    api.getCsvFileContent(file.path)
      .then((res) => setContent(res.content))
      .catch((err) => setContent(`Error loading file: ${err.message}`))
      .finally(() => setLoading(false));
  }, [file]);

  if (!file) return null;

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = content.split(/\r?\n/).slice(0, 50);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-4xl border-cyan-500/40 p-6 relative max-h-[85vh] flex flex-col shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono tracking-tight">{file.fileName}</h3>
            <p className="text-xs text-slate-400">
              Controller: <span className="font-mono text-cyan-300">{file.controllerSN}</span> • Format: <span className="font-semibold text-slate-300">{file.fileType}</span> • Size: {(file.sizeBytes / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-[#050913] border border-sky-950 rounded-lg p-3 font-mono text-xs text-slate-300 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading CSV file content...</div>
          ) : (
            <pre className="whitespace-pre overflow-x-auto leading-relaxed">
              {lines.join('\n')}
              {lines.length >= 50 && '\n\n... (preview truncated to first 50 lines)'}
            </pre>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-sky-900/40">
          <span className="text-xs text-slate-400">
            Path: <span className="font-mono text-[11px] text-slate-300">{file.path}</span>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
