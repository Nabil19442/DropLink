import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, FileText, Image, Video, Music, Archive, Code, File, X } from 'lucide-react';
import { formatBytes, truncateFileName } from '../../utils/formatters.js';
import { getFileCategory, getCategoryBadgeStyle } from '../../utils/fileTypes.js';

export function FileList({ files = [], onRemoveFile, onClearAll, disabled = false }) {
  if (!files || files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const getIconForCategory = (category) => {
    switch (category) {
      case 'image': return Image;
      case 'video': return Video;
      case 'audio': return Music;
      case 'archive': return Archive;
      case 'code': return Code;
      default: return FileText;
    }
  };

  return (
    <div className="w-full mt-6 bg-[#0E1226]/80 rounded-2xl p-4 sm:p-5 border border-violet-500/15">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
        <div className="flex items-center gap-2">
          <span className="font-display font-semibold text-white text-sm">
            Selected Files ({files.length})
          </span>
          <span className="text-xs text-cyan font-mono bg-cyan/10 px-2 py-0.5 rounded-full border border-cyan/25">
            {formatBytes(totalSize)}
          </span>
        </div>

        {!disabled && (
          <button
            onClick={onClearAll}
            className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Scrollable list */}
      <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
        <AnimatePresence>
          {files.map((file, idx) => {
            const category = getFileCategory(file.name, file.type);
            const CategoryIcon = getIconForCategory(category);
            const style = getCategoryBadgeStyle(category);

            return (
              <motion.div
                key={`${file.name}-${file.size}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-surface-muted/60 border border-white/5 hover:border-violet-500/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg ${style.bg} border ${style.border} flex items-center justify-center shrink-0`}>
                    <CategoryIcon className={`w-4 h-4 ${style.text}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-white truncate max-w-[200px] sm:max-w-xs" title={file.name}>
                      {truncateFileName(file.name, 32)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {formatBytes(file.size)}
                    </div>
                  </div>
                </div>

                {!disabled && (
                  <button
                    onClick={() => onRemoveFile(file.name)}
                    className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
