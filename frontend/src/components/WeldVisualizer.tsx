import React, { useEffect, useRef } from 'react';
import { Cell } from '../types';
import { Zap, Gauge, Flame, Wind } from 'lucide-react';

interface WeldVisualizerProps {
  cell: Cell | null;
}

export const WeldVisualizer: React.FC<WeldVisualizerProps> = ({ cell }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isWelding = cell?.robots.some(r => r.arcOn) || cell?.status === 'Running';
  const primaryRobot = cell?.robots[0];
  const primaryFixture = cell?.fixtures[0];
  const telemetry = primaryRobot?.liveTelemetry || {
    current: isWelding ? 208.4 : 0,
    voltage: isWelding ? 24.2 : 0,
    wireFeed: isWelding ? 8.6 : 0,
    gasFlow: isWelding ? 15.1 : 0
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particleOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Background grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Tooling Fixture Table
      const tableX = 140;
      const tableY = 220;
      const tableW = 420;
      const tableH = 35;

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillRect(tableX, tableY, tableW, tableH);
      ctx.strokeRect(tableX, tableY, tableW, tableH);

      // Clamps
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(tableX + 30, tableY - 15, 20, 15);
      ctx.fillRect(tableX + tableW - 50, tableY - 15, 20, 15);

      // Workpiece
      const wpX = tableX + 60;
      const wpY = tableY - 18;
      const wpW = tableW - 120;
      const wpH = 18;
      ctx.fillStyle = '#334155';
      ctx.fillRect(wpX, wpY, wpW, wpH);
      ctx.strokeRect(wpX, wpY, wpW, wpH);

      // Weld Bead Progress
      const progress = (primaryFixture?.progressPct || 0) / 100;
      const beadLength = wpW * progress;

      if (beadLength > 0) {
        ctx.fillStyle = '#00e5ff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(wpX, wpY + 4, beadLength, 10);
        ctx.shadowBlur = 0;
      }

      // Robot Base & Joint Arm
      const base1X = 220;
      const base1Y = 80;
      const torchX = wpX + beadLength;
      const torchY = wpY;

      // Robot Arm Segments
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(base1X, base1Y);
      ctx.lineTo((base1X + torchX) / 2 - 30, (base1Y + torchY) / 2 - 20);
      ctx.lineTo(torchX, torchY - 20);
      ctx.stroke();

      // Joints
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(base1X, base1Y, 7, 0, Math.PI * 2);
      ctx.arc((base1X + torchX) / 2 - 30, (base1Y + torchY) / 2 - 20, 6, 0, Math.PI * 2);
      ctx.fill();

      // Torch Head
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(torchX - 4, torchY - 20, 8, 20);

      // Electric Welding Arc & Plasma Sparks
      if (isWelding) {
        // Bright Arc
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00e5ff';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(torchX, torchY, 6 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();

        // Secondary glow
        ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(torchX, torchY, 18 + Math.random() * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Spark particles
        particleOffset++;
        ctx.fillStyle = '#fef08a';
        for (let p = 0; p < 12; p++) {
          const angle = Math.random() * Math.PI - Math.PI;
          const dist = 10 + Math.random() * 35;
          const px = torchX + Math.cos(angle) * dist;
          const py = torchY + Math.sin(angle) * dist;
          ctx.beginPath();
          ctx.arc(px, py, 1.5 + Math.random(), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [isWelding, primaryFixture?.progressPct]);

  return (
    <div className="glass-panel p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-semibold text-white tracking-wide text-sm uppercase">
            Live Welding Telemetry & Motion Simulation
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-400">
            Workpiece: <span className="text-cyan-300">{primaryFixture?.currentJobWorkSN || 'STANDBY'}</span>
          </span>
          <span className={`badge ${isWelding ? 'badge-running' : 'badge-ready'}`}>
            {isWelding ? 'ARC ON (ACTIVE WELD)' : 'ARC OFF (IDLE)'}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative bg-[#050913] rounded-lg border border-sky-950 flex justify-center items-center overflow-hidden">
        <canvas ref={canvasRef} width={700} height={280} className="w-full h-auto max-h-[300px]" />
      </div>

      {/* Industrial Gauges & Meters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="bg-[#0c1427] border border-sky-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-cyan-400" /> Arc Current</span>
            <span className="font-mono text-[10px]">Amp</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {telemetry.current.toFixed(1)} <span className="text-xs font-normal text-cyan-400">A</span>
          </div>
        </div>

        <div className="bg-[#0c1427] border border-sky-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-blue-400" /> Arc Voltage</span>
            <span className="font-mono text-[10px]">Volt</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {telemetry.voltage.toFixed(1)} <span className="text-xs font-normal text-blue-400">V</span>
          </div>
        </div>

        <div className="bg-[#0c1427] border border-sky-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5"><Flame className="w-3.5 h-3.5 text-amber-400" /> Wire Feed</span>
            <span className="font-mono text-[10px]">Speed</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {telemetry.wireFeed.toFixed(1)} <span className="text-xs font-normal text-amber-400">m/min</span>
          </div>
        </div>

        <div className="bg-[#0c1427] border border-sky-900/40 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="flex items-center gap-1.5"><Wind className="w-3.5 h-3.5 text-emerald-400" /> Shielding Gas</span>
            <span className="font-mono text-[10px]">Flow</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tracking-tight">
            {telemetry.gasFlow.toFixed(1)} <span className="text-xs font-normal text-emerald-400">L/min</span>
          </div>
        </div>
      </div>
    </div>
  );
};
