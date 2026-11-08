import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import JSZip from 'jszip';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, RefreshCw, FileText, Sparkles, Archive, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { GlassCard } from '../ui/GlassCard.jsx';
import { formatBytes, truncateFileName } from '../../utils/formatters.js';
import { getFileCategory, getCategoryBadgeStyle } from '../../utils/fileTypes.js';
import { sounds } from '../../utils/soundEffects.js';

export function TransferSuccessView({
  role = 'receiver',
  files = [], // receivedFiles or sentFiles
  totalBytes = 0,
  onDownloadFile,
  onDownloadAll,
  onReset
}) {
  const isReceiver = role === 'receiver';
  const [isZipping, setIsZipping] = useState(false);

  // Fire celebratory confetti on mount
  useEffect(() => {
    try {
      sounds.success();
      confetti({
        particleCount: 85,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#8B5CF6', '#22D3EE', '#60A5FA', '#34D399']
      });
    } catch (e) {
      console.warn('Confetti error', e);
    }
  }, []);

  // Download all files as a single ZIP archive
  const handleDownloadAsZip = async () => {
    if (!files || files.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const file of files) {
        if (file.blob) {
          zip.file(file.name, file.blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DropLink_Batch_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
      // Fallback to sequential download
      onDownloadAll();
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <GlassCard variant="glow" className="w-full max-w-xl mx-auto p-6 sm:p-8 text-center">
      {/* Animated Checkmark Circle */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 12, stiffness: 200 }}
        className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white mx-auto mb-5 shadow-2xl shadow-emerald-950/60"
      >
        <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
      </motion.div>

      <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">
        {isReceiver ? 'Files Received Successfully!' : 'Transfer Completed!'}
      </h3>
      <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
        {isReceiver
          ? 'All files were transferred directly to your browser memory via encrypted WebRTC. Save them below.'
          : 'Your files have been safely delivered to the peer device.'}
      </p>

      {/* Summary Tag */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        <span>{files.length} file{files.length !== 1 ? 's' : ''} • {formatBytes(totalBytes)} transferred</span>
      </div>

      {/* File List */}
      <div className="text-left mb-6 max-h-56 overflow-y-auto space-y-2 pr-1">
        {files.map((file, idx) => {
          const category = getFileCategory(file.name, file.type);
          const style = getCategoryBadgeStyle(category);

          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-muted/80 border border-white/5 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate">
                <FileText className={`w-4 h-4 ${style.text} shrink-0`} />
                <div className="truncate">
                  <div className="text-xs font-medium text-white truncate" title={file.name}>
                    {truncateFileName(file.name, 34)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {formatBytes(file.size)}
                  </div>
                </div>
              </div>

              {isReceiver && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  onClick={() => onDownloadFile(file)}
                  className="shrink-0 text-cyan hover:text-white"
                >
                  Save
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {isReceiver && files.length > 1 && (
          <Button
            variant="glow"
            size="md"
            icon={isZipping ? Loader2 : Archive}
            loading={isZipping}
            onClick={handleDownloadAsZip}
            className="flex-1 sm:flex-none"
          >
            Download ZIP Archive
          </Button>
        )}

        {isReceiver && files.length === 1 && (
          <Button
            variant="glow"
            size="md"
            icon={Download}
            onClick={() => onDownloadFile(files[0])}
            className="flex-1 sm:flex-none"
          >
            Download File
          </Button>
        )}

        <Button
          variant="secondary"
          size="md"
          icon={RefreshCw}
          onClick={onReset}
          className="flex-1 sm:flex-none"
        >
          Transfer More Files
        </Button>
      </div>
    </GlassCard>
  );
}
