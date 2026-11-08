import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, HardDrive, X, ArrowUpRight, ArrowDownLeft, FileText, Activity } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { GlassCard } from '../ui/GlassCard.jsx';
import { formatBytes, formatSpeed, formatDuration, truncateFileName } from '../../utils/formatters.js';

export function TransferProgressCard({
  role = 'sender',
  transferredBytes = 0,
  totalBytes = 0,
  currentSpeed = 0,
  estimatedSecondsRemaining = 0,
  currentFileName = '',
  currentFileBytes = 0,
  currentFileTotalBytes = 0,
  currentFileIndex = 0,
  totalFiles = 1,
  fileProgress = {},
  onCancel
}) {
  const [speedHistory, setSpeedHistory] = useState([0, 0, 0, 0, 0]);

  // Track speed samples over time for real-time SVG sparkline
  useEffect(() => {
    if (currentSpeed > 0) {
      setSpeedHistory(prev => {
        const next = [...prev.slice(-19), currentSpeed];
        return next;
      });
    }
  }, [currentSpeed]);

  const overallPercent = totalBytes > 0
    ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100))
    : 0;

  const currentFilePercent = currentFileTotalBytes > 0
    ? Math.min(100, Math.round((currentFileBytes / currentFileTotalBytes) * 100))
    : 0;

  const isSender = role === 'sender' || (role !== 'receiver' && totalFiles > 0);

  // Compute SVG sparkline path
  const maxSpeed = Math.max(...speedHistory, 1024 * 500); // at least 500 KB/s scale
  const points = speedHistory.map((val, idx) => {
    const x = (idx / (speedHistory.length - 1 || 1)) * 100;
    const y = 35 - (val / maxSpeed) * 30;
    return `${x},${Math.max(4, Math.min(35, y))}`;
  }).join(' ');

  const areaPoints = `0,35 ${points} 100,35`;

  return (
    <GlassCard variant="glow" className="w-full max-w-xl mx-auto p-6 sm:p-8">
      {/* Header with live activity badges */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-accent to-cyan flex items-center justify-center text-white shadow-glow-cyan animate-pulse">
            {isSender ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
              {isSender ? 'Streaming Files to Peer' : 'Receiving Direct Stream'}
            </h3>
            <span className="text-xs text-cyan flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
              Direct Encrypted WebRTC DataChannel
            </span>
          </div>
        </div>

        <Button
          variant="danger"
          size="sm"
          icon={X}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>

      {/* Main Overall Progress Display */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
              Overall Progress
            </div>
            <div className="font-mono text-2xl font-bold text-white">
              {overallPercent}%
            </div>
          </div>

          <div className="text-right">
            <span className="text-sm font-mono text-cyan font-semibold">
              {formatBytes(transferredBytes)}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {' '}/ {formatBytes(totalBytes)}
            </span>
          </div>
        </div>

        {/* Outer glowing progress track */}
        <div className="relative w-full h-3.5 bg-slate-900/90 rounded-full overflow-hidden p-0.5 border border-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-accent via-blue-500 to-cyan rounded-full relative"
            style={{ width: `${overallPercent}%` }}
            transition={{ type: 'spring', damping: 25, stiffness: 120 }}
          >
            {/* Moving light shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[pulse_1.5s_infinite]" />
          </motion.div>
        </div>
      </div>

      {/* Metrics Row (Speed, ETA, Active File) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-surface-muted/70 border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan/15 flex items-center justify-center text-cyan shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Speed</div>
            <div className="text-xs font-semibold text-white font-mono truncate">
              {formatSpeed(currentSpeed)}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-muted/70 border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Time Remaining</div>
            <div className="text-xs font-semibold text-white font-mono truncate">
              {formatDuration(estimatedSecondsRemaining)}
            </div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-surface-muted/70 border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-accent-light shrink-0">
            <HardDrive className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Batch Progress</div>
            <div className="text-xs font-semibold text-white font-mono truncate">
              File {Math.min(totalFiles, currentFileIndex + 1)} of {totalFiles}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time SVG Bandwidth Sparkline */}
      <div className="mb-6 p-3 rounded-xl bg-[#090C1A] border border-white/5">
        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 text-cyan font-medium">
            <Activity className="w-3.5 h-3.5" /> Live Throughput Graph
          </span>
          <span className="font-mono">Peak: {formatSpeed(maxSpeed)}</span>
        </div>
        <div className="w-full h-10 relative overflow-hidden">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 35" preserveAspectRatio="none">
            <defs>
              <linearGradient id="speedArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={areaPoints} fill="url(#speedArea)" />
            <polyline
              points={points}
              fill="none"
              stroke="#22D3EE"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Current File Sub-Progress */}
      {currentFileName && (
        <div className="p-3.5 rounded-xl bg-[#090C1B] border border-white/5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-2 truncate pr-2">
              <FileText className="w-3.5 h-3.5 text-cyan shrink-0" />
              <span className="text-slate-300 font-medium truncate" title={currentFileName}>
                {truncateFileName(currentFileName, 34)}
              </span>
            </div>
            <span className="font-mono text-slate-400 shrink-0 text-[11px]">
              {formatBytes(currentFileBytes)} / {formatBytes(currentFileTotalBytes)}
            </span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan transition-all duration-150 rounded-full"
              style={{ width: `${currentFilePercent}%` }}
            />
          </div>
        </div>
      )}
    </GlassCard>
  );
}
