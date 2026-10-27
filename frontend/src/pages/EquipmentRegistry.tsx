import React, { useState } from 'react';
import { useShopFloor } from '../context/ShopFloorContext';
import { Cpu, Box, Shield, Plus, CheckCircle2, Lock, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export const EquipmentRegistry: React.FC = () => {
  const { equipment, refreshAll } = useShopFloor();
  const [filterType, setFilterType] = useState<'ALL' | 'robot' | 'fixture'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newType, setNewType] = useState<'robot' | 'fixture'>('robot');
  const [newName, setNewName] = useState('');
  const [newModel, setNewModel] = useState('Panasonic TL-1800');
  const [newSerial, setNewSerial] = useState(`SN-CTRL-${Math.floor(10000 + Math.random() * 90000)}`);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filtered = equipment.filter((e) => filterType === 'ALL' || e.type === filterType);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErrorMsg(null);
      const generatedId = `${newType.toUpperCase()}-${Date.now().toString().slice(-4)}`;
      await api.registerEquipment({
        id: generatedId,
        type: newType,
        name: newName || (newType === 'robot' ? 'Panasonic Welding Robot' : 'Tooling Bed Station'),
        model: newModel,
        controllerSerialNumber: newType === 'robot' ? newSerial : undefined,
        currentCellId: null,
        availability: 'Available'
      });
      setShowAddModal(false);
      refreshAll();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Equipment Registry</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Central registry of physical articulated robots, welding controllers, and tooling fixtures. Enforces hardware reservation locks to prevent conflicting simultaneous execution.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-center"
        >
          <Plus className="w-4 h-4" /> Register Equipment
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-sky-950 pb-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterType === 'ALL' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          All Equipment ({equipment.length})
        </button>
        <button
          onClick={() => setFilterType('robot')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterType === 'robot' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          Robots ({equipment.filter((e) => e.type === 'robot').length})
        </button>
        <button
          onClick={() => setFilterType('fixture')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filterType === 'fixture' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          Fixtures ({equipment.filter((e) => e.type === 'fixture').length})
        </button>
      </div>

      {/* Equipment Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070c18] border-b border-sky-950 font-mono text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4">Equipment ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Name & Model</th>
                <th className="py-3 px-4">Controller Serial Number</th>
                <th className="py-3 px-4">Current Cell Assignment</th>
                <th className="py-3 px-4">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-950/60 font-sans">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {item.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="flex items-center gap-1.5 font-medium">
                      {item.type === 'robot' ? (
                        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Box className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="capitalize">{item.type}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{item.model || 'Standard'}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-300">
                    {item.controllerSerialNumber || 'N/A (Tooling Table)'}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {item.currentCellId ? (
                      <span className="text-white bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                        {item.currentCellId}
                      </span>
                    ) : (
                      <span className="text-slate-500">Unassigned (Pool)</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`badge ${
                        item.availability === 'Available'
                          ? 'badge-ready'
                          : item.availability === 'InUse'
                          ? 'badge-running'
                          : 'badge-faulted'
                      }`}
                    >
                      {item.availability === 'InUse' && <Lock className="w-3 h-3" />}
                      {item.availability}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Equipment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md border-cyan-500/40 p-6 relative shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Register Hardware Item</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add a new physical robot or fixture to the shop-floor equipment pool.
            </p>

            {errorMsg && (
              <div className="p-2.5 mb-3 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Equipment Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="w-full bg-[#070c18] border border-sky-900 rounded p-2 text-white outline-none"
                >
                  <option value="robot">Robotic Articulated Arm</option>
                  <option value="fixture">Tooling Fixture / Positioner</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Panasonic TM-1400 Secondary"
                  className="w-full bg-[#070c18] border border-sky-900 rounded p-2 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Model Specification</label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full bg-[#070c18] border border-sky-900 rounded p-2 text-white outline-none"
                />
              </div>

              {newType === 'robot' && (
                <div>
                  <label className="block text-slate-300 mb-1">Controller Serial Number *</label>
                  <input
                    type="text"
                    value={newSerial}
                    onChange={(e) => setNewSerial(e.target.value)}
                    className="w-full bg-[#070c18] border border-sky-900 rounded p-2 text-white font-mono outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-sky-950">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-xs">
                  {loading ? 'Registering...' : 'Register Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
