import React, { useState } from 'react';
import { Cell, EquipmentRegistryItem, Robot, Fixture, WeldingProgram } from '../types';
import { X, Plus, Cpu, Box, CheckCircle2, ShieldAlert, Sparkles, Layers } from 'lucide-react';
import { api } from '../services/api';

interface CreateCellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  availableEquipment: EquipmentRegistryItem[];
}

export const CreateCellModal: React.FC<CreateCellModalProps> = ({
  isOpen,
  onClose,
  onCreated,
  availableEquipment
}) => {
  const [mode, setMode] = useState<'SELECT_MODE' | 'OPTION_A' | 'OPTION_B'>('SELECT_MODE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Common Form Fields
  const [cellId, setCellId] = useState('');
  const [cellName, setCellName] = useState('');
  const [description, setDescription] = useState('');

  // Option A (New Equipment) State
  const [newRobotName, setNewRobotName] = useState('Panasonic TM-1400 New');
  const [newRobotSerial, setNewRobotSerial] = useState(`SN-NEW-${Math.floor(10000 + Math.random() * 90000)}`);
  const [newFixtureName, setNewFixtureName] = useState('Station Alpha Rotating Clamp');
  const [beadCount, setBeadCount] = useState<number>(2);

  // Option B (Reuse Equipment) State
  const [selectedRobotIds, setSelectedRobotIds] = useState<string[]>([]);
  const [selectedFixtureIds, setSelectedFixtureIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const resetState = () => {
    setMode('SELECT_MODE');
    setCellId('');
    setCellName('');
    setDescription('');
    setSelectedRobotIds([]);
    setSelectedFixtureIds([]);
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSaveOptionA = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      if (!cellId.trim() || !cellName.trim()) {
        throw new Error('Cell ID and Name are required.');
      }

      const generatedRobotId = `ROBOT-${cellId}-01`;
      const generatedFixtureId = `FIX-${cellId}-01`;

      const newRobot: Robot = {
        id: generatedRobotId,
        name: newRobotName,
        controllerSerialNumber: newRobotSerial,
        model: 'Panasonic TM-1400',
        cellId,
        status: 'Ready',
        arcOn: false
      };

      const newFixture: Fixture = {
        id: generatedFixtureId,
        name: newFixtureName,
        cellId,
        status: 'Ready',
        assignedRobotIds: [generatedRobotId],
        currentBeadIndex: 0,
        totalBeads: beadCount,
        progressPct: 0
      };

      const beads = Array.from({ length: beadCount }, (_, i) => ({
        beadNumber: i + 1,
        targetCurrent: 200 + i * 10,
        targetVoltage: 24.0 + i * 0.5,
        travelSpeed: 45,
        wireFeedRate: 8.5,
        gasFlowRate: 15.0,
        durationSeconds: 2.5,
        lengthMm: 120,
        status: 'Pending' as const
      }));

      const newProgram: WeldingProgram = {
        id: `PRG-${cellId}`,
        name: `${cellName} Standard Procedure`,
        workpieceType: 'Structural Component',
        subPrograms: [
          {
            id: 'SUB-01',
            name: 'Linear Seam Joint',
            description: 'Automated continuous weld sequence',
            beads
          }
        ]
      };

      const newCell: Cell = {
        id: cellId.trim().toUpperCase(),
        name: cellName.trim(),
        description: description.trim() || 'Custom automated welding cell',
        status: 'Ready',
        robots: [newRobot],
        fixtures: [newFixture],
        programs: [newProgram],
        assignments: [
          {
            fixtureId: generatedFixtureId,
            robotIds: [generatedRobotId],
            programId: newProgram.id
          }
        ],
        createdAt: new Date().toISOString()
      };

      // Also register this new physical equipment into EquipmentRegistry
      await api.registerEquipment({
        id: generatedRobotId,
        type: 'robot',
        name: newRobotName,
        model: 'Panasonic TM-1400',
        controllerSerialNumber: newRobotSerial,
        currentCellId: newCell.id,
        availability: 'Available'
      });

      await api.registerEquipment({
        id: generatedFixtureId,
        type: 'fixture',
        name: newFixtureName,
        model: 'Custom Tooling Fixture',
        currentCellId: newCell.id,
        availability: 'Available'
      });

      await api.createCell(newCell);
      onCreated();
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOptionB = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      if (!cellId.trim() || !cellName.trim()) {
        throw new Error('Cell ID and Name are required.');
      }

      if (selectedRobotIds.length === 0) {
        throw new Error('Please select at least one compatible existing robot.');
      }

      if (selectedFixtureIds.length === 0) {
        throw new Error('Please select at least one compatible existing fixture.');
      }

      // Map selected equipment
      const robots: Robot[] = selectedRobotIds.map((rId) => {
        const item = availableEquipment.find((e) => e.id === rId);
        return {
          id: rId,
          name: item?.name || rId,
          controllerSerialNumber: item?.controllerSerialNumber || `SN-${rId}`,
          model: item?.model || 'Panasonic Standard',
          cellId,
          status: 'Ready',
          arcOn: false
        };
      });

      const fixtures: Fixture[] = selectedFixtureIds.map((fId) => {
        const item = availableEquipment.find((e) => e.id === fId);
        return {
          id: fId,
          name: item?.name || fId,
          cellId,
          status: 'Ready',
          assignedRobotIds: selectedRobotIds,
          currentBeadIndex: 0,
          totalBeads: 2,
          progressPct: 0
        };
      });

      const program: WeldingProgram = {
        id: `PRG-REUSE-${cellId}`,
        name: `${cellName} Reusable Recipe`,
        workpieceType: 'Assembly Module',
        subPrograms: [
          {
            id: 'SUB-REUSE-01',
            name: 'Weld Pass A',
            description: 'Standard procedure pass',
            beads: [
              {
                beadNumber: 1,
                targetCurrent: 205,
                targetVoltage: 24.5,
                travelSpeed: 45,
                wireFeedRate: 8.5,
                gasFlowRate: 15.0,
                durationSeconds: 2.0,
                lengthMm: 100,
                status: 'Pending'
              },
              {
                beadNumber: 2,
                targetCurrent: 215,
                targetVoltage: 25.0,
                travelSpeed: 46,
                wireFeedRate: 8.8,
                gasFlowRate: 15.0,
                durationSeconds: 2.0,
                lengthMm: 110,
                status: 'Pending'
              }
            ]
          }
        ]
      };

      const newCell: Cell = {
        id: cellId.trim().toUpperCase(),
        name: cellName.trim(),
        description: description.trim() || 'Cell configured with reused equipment',
        status: 'Ready',
        robots,
        fixtures,
        programs: [program],
        assignments: [
          {
            fixtureId: fixtures[0].id,
            robotIds: selectedRobotIds,
            programId: program.id
          }
        ],
        createdAt: new Date().toISOString()
      };

      await api.createCell(newCell);
      onCreated();
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const availableRobots = availableEquipment.filter((e) => e.type === 'robot');
  const availableFixtures = availableEquipment.filter((e) => e.type === 'fixture');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-2xl border-cyan-500/40 p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-950/80">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5 text-cyan-400" />
          <h3 className="text-xl font-bold text-white tracking-tight">Create Welding Cell</h3>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Configure a new multi-robot welding cell with automated execution and Panasonic controller logging.
        </p>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: CHOICE OF TWO OPTIONS */}
        {mode === 'SELECT_MODE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
            <div
              onClick={() => {
                setCellId(`CELL-0${Math.floor(2 + Math.random() * 8)}`);
                setMode('OPTION_A');
              }}
              className="p-5 rounded-xl border border-sky-900/60 bg-[#0c1427]/90 hover:border-cyan-400 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/50 group"
            >
              <div className="w-12 h-12 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300">
                Create New Equipment
              </h4>
              <span className="text-[10px] uppercase font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                Option A
              </span>
              <p className="text-xs text-slate-400 mt-2">
                Instantiate brand-new dedicated robots, fixtures, and controllers with unique serial numbers.
              </p>
            </div>

            <div
              onClick={() => {
                setCellId(`CELL-0${Math.floor(2 + Math.random() * 8)}`);
                setMode('OPTION_B');
              }}
              className="p-5 rounded-xl border border-sky-900/60 bg-[#0c1427]/90 hover:border-cyan-400 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/50 group"
            >
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1 group-hover:text-cyan-300">
                Reuse Existing Equipment
              </h4>
              <span className="text-[10px] uppercase font-mono font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                Option B
              </span>
              <p className="text-xs text-slate-400 mt-2">
                Select available robots and fixtures from the physical shop-floor registry without duplicating hardware records.
              </p>
            </div>
          </div>
        )}

        {/* OPTION A FORM */}
        {mode === 'OPTION_A' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-sky-900/40">
              <span className="badge badge-ready">Option A: Create New Equipment</span>
              <button
                onClick={() => setMode('SELECT_MODE')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Change Option
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cell ID *</label>
                <input
                  type="text"
                  value={cellId}
                  onChange={(e) => setCellId(e.target.value)}
                  placeholder="e.g. CELL-02"
                  className="w-full bg-[#0a1020] border border-sky-900 rounded-lg p-2.5 text-sm text-white font-mono focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cell Name *</label>
                <input
                  type="text"
                  value={cellName}
                  onChange={(e) => setCellName(e.target.value)}
                  placeholder="e.g. Chassis Welding Cell 2"
                  className="w-full bg-[#0a1020] border border-sky-900 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Operational purpose & scope"
                className="w-full bg-[#0a1020] border border-sky-900 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>

            <div className="bg-[#0c1427] p-3.5 rounded-lg border border-sky-900/50 space-y-3">
              <h5 className="text-xs font-semibold uppercase text-cyan-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" /> New Robot & Controller
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Robot Name</label>
                  <input
                    type="text"
                    value={newRobotName}
                    onChange={(e) => setNewRobotName(e.target.value)}
                    className="w-full bg-[#0a1020] border border-sky-900 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Controller Serial No *</label>
                  <input
                    type="text"
                    value={newRobotSerial}
                    onChange={(e) => setNewRobotSerial(e.target.value)}
                    className="w-full bg-[#0a1020] border border-sky-900 rounded p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#0c1427] p-3.5 rounded-lg border border-sky-900/50 space-y-3">
              <h5 className="text-xs font-semibold uppercase text-amber-400 flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5" /> New Fixture & Program
              </h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Fixture Name</label>
                  <input
                    type="text"
                    value={newFixtureName}
                    onChange={(e) => setNewFixtureName(e.target.value)}
                    className="w-full bg-[#0a1020] border border-sky-900 rounded p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Total Weld Beads</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={beadCount}
                    onChange={(e) => setBeadCount(Number(e.target.value))}
                    className="w-full bg-[#0a1020] border border-sky-900 rounded p-2 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-sky-900/40">
              <button onClick={() => setMode('SELECT_MODE')} className="btn-secondary text-xs">
                Back
              </button>
              <button onClick={handleSaveOptionA} disabled={loading} className="btn-primary text-xs">
                {loading ? 'Creating...' : 'Save & Activate Cell'}
              </button>
            </div>
          </div>
        )}

        {/* OPTION B FORM */}
        {mode === 'OPTION_B' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-sky-900/40">
              <span className="badge badge-completed">Option B: Reuse Existing Equipment</span>
              <button
                onClick={() => setMode('SELECT_MODE')}
                className="text-xs text-cyan-400 hover:underline"
              >
                Change Option
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cell ID *</label>
                <input
                  type="text"
                  value={cellId}
                  onChange={(e) => setCellId(e.target.value)}
                  placeholder="e.g. CELL-03"
                  className="w-full bg-[#0a1020] border border-sky-900 rounded-lg p-2.5 text-sm text-white font-mono focus:border-cyan-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cell Name *</label>
                <input
                  type="text"
                  value={cellName}
                  onChange={(e) => setCellName(e.target.value)}
                  placeholder="e.g. Sub-Assembly Cell 3"
                  className="w-full bg-[#0a1020] border border-sky-900 rounded-lg p-2.5 text-sm text-white focus:border-cyan-400 outline-none"
                />
              </div>
            </div>

            {/* Robot Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Available Robots (from Equipment Registry):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {availableRobots.map((robot) => {
                  const isSelected = selectedRobotIds.includes(robot.id);
                  const isBusy = robot.availability === 'InUse' || robot.availability === 'Faulted';
                  return (
                    <div
                      key={robot.id}
                      onClick={() => {
                        if (isBusy) return;
                        setSelectedRobotIds((prev) =>
                          isSelected ? prev.filter((id) => id !== robot.id) : [...prev, robot.id]
                        );
                      }}
                      className={`p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-950/40 text-cyan-300'
                          : isBusy
                          ? 'opacity-40 border-slate-800 bg-slate-900/50 cursor-not-allowed'
                          : 'border-sky-900/40 bg-[#0c1427] hover:border-sky-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white">{robot.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {robot.controllerSerialNumber} • {robot.availability}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fixture Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Select Available Fixtures:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {availableFixtures.map((fix) => {
                  const isSelected = selectedFixtureIds.includes(fix.id);
                  const isBusy = fix.availability === 'InUse' || fix.availability === 'Faulted';
                  return (
                    <div
                      key={fix.id}
                      onClick={() => {
                        if (isBusy) return;
                        setSelectedFixtureIds((prev) =>
                          isSelected ? prev.filter((id) => id !== fix.id) : [...prev, fix.id]
                        );
                      }}
                      className={`p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-amber-950/40 text-amber-300'
                          : isBusy
                          ? 'opacity-40 border-slate-800 bg-slate-900/50 cursor-not-allowed'
                          : 'border-sky-900/40 bg-[#0c1427] hover:border-sky-700 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-white">{fix.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {fix.id} • {fix.availability}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-sky-900/40">
              <button onClick={() => setMode('SELECT_MODE')} className="btn-secondary text-xs">
                Back
              </button>
              <button onClick={handleSaveOptionB} disabled={loading} className="btn-primary text-xs">
                {loading ? 'Creating...' : 'Save & Link Reused Cell'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
