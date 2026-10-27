import React, { useState } from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { CreateCellModal } from '../components/CreateCellModal';
import { CellCard } from '../components/CellCard';
import { Plus, Search, Filter, Layers, CheckCircle2 } from 'lucide-react';

export const CellManagement: React.FC = () => {
  const { cells, equipment, refreshAll } = useShopFloor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredCells = cells.filter((c) => {
    const matchesStatus = filterStatus === 'ALL' || c.status === filterStatus;
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Cell Management</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Create, configure, and monitor multi-robot welding cells. Supports Option A (New Equipment) and Option B (Reusable Existing Equipment) with strict hardware lock safeguards.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary text-xs py-2.5 px-4 shadow-lg shadow-cyan-500/20 whitespace-nowrap self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Create Cell
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0c1427] p-3 rounded-xl border border-sky-900/40">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by Cell ID or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070c18] border border-sky-950 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
          {['ALL', 'Ready', 'Running', 'Draft', 'Faulted', 'Completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                filterStatus === status
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-white bg-slate-900/50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Cells */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCells.map((cell) => (
          <CellCard key={cell.id} cell={cell} onRefresh={refreshAll} />
        ))}
      </div>

      {filteredCells.length === 0 && (
        <div className="p-12 text-center border border-dashed border-sky-900/40 rounded-xl text-slate-500 text-xs">
          No cells found matching your criteria. Click &quot;Create Cell&quot; to add a new cell configuration.
        </div>
      )}

      {/* Create Cell Modal */}
      <CreateCellModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={refreshAll}
        availableEquipment={equipment}
      />
    </div>
  );
};
