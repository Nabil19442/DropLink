import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Download, X, Laptop, Smartphone, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { GlassCard } from '../ui/GlassCard.jsx';
import { formatBytes, truncateFileName } from '../../utils/formatters.js';
import { getFileCategory, getCategoryBadgeStyle } from '../../utils/fileTypes.js';

export function ReceiverConsentModal({
  senderDevice,
  files = [],
  totalSize = 0,
  onAccept,
  onReject
}) {
  const DeviceIcon = senderDevice?.type === 'mobile' ? Smartphone : Laptop;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 15 }}
        className="w-full max-w-lg"
      >
        <GlassCard variant="glow" className="p-6 sm:p-8 border-violet-500/40">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
            <div className="w-12 h-12 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-glow-cyan">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-white">
                Incoming File Transfer
              </h3>
              <p className="text-xs text-slate-300">
                A device wants to send you files via direct peer-to-peer connection.
              </p>
            </div>
          </div>

          {/* Sender Device Card */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-muted/90 border border-white/10 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <DeviceIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white">
                  {senderDevice?.label || 'Remote Device'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {senderDevice?.os || 'Unknown OS'} • {senderDevice?.browser || 'Browser'}
                </div>
              </div>
            </div>

            <span className="text-xs font-mono text-cyan bg-cyan/10 px-2.5 py-1 rounded-full border border-cyan/25">
              {files.length} item{files.length !== 1 ? 's' : ''} • {formatBytes(totalSize)}
            </span>
          </div>

          {/* Incoming File List */}
          <div className="mb-6">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Files to be received:
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {files.map((file, idx) => {
                const category = getFileCategory(file.name, file.type);
                const style = getCategoryBadgeStyle(category);
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-surface/60 border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <FileText className={`w-3.5 h-3.5 ${style.text} shrink-0`} />
                      <span className="text-slate-200 truncate" title={file.name}>
                        {truncateFileName(file.name, 36)}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono shrink-0">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consent Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              icon={X}
              onClick={onReject}
              className="flex-1 text-slate-300 hover:text-rose-400"
            >
              Decline
            </Button>
            <Button
              variant="glow"
              size="md"
              icon={CheckCircle2}
              onClick={onAccept}
              className="flex-1"
            >
              Accept Transfer
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
