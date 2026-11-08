import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Plus, FolderUp, File, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { formatBytes } from '../../utils/formatters.js';
import { sounds } from '../../utils/soundEffects.js';

export function FileSelector({ onFilesSelected, disabled = false }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
      // Reset input value so re-selecting same file triggers change
      e.target.value = '';
    }
  };

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      <motion.div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        whileHover={disabled ? {} : { scale: 1.005 }}
        whileTap={disabled ? {} : { scale: 0.995 }}
        className={`relative border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[220px] overflow-hidden ${
          isDragOver
            ? 'border-cyan bg-cyan/10 shadow-glow-cyan'
            : 'border-violet-500/25 bg-[#11152B]/60 hover:border-violet-500/60 hover:bg-[#11152B]/85'
        }`}
      >
        {/* Ambient subtle light */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none opacity-40" />

        {/* Animated Upload Icon Circle */}
        <motion.div
          animate={isDragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
          className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-accent to-cyan flex items-center justify-center text-white shadow-glow-violet mb-4"
        >
          <Upload className="w-8 h-8" />
        </motion.div>

        <h3 className="font-display text-lg sm:text-xl font-semibold text-white mb-2">
          {isDragOver ? 'Drop files here to send' : 'Drag & drop files or browse'}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mb-5">
          Select videos, photos, documents, archives or any files. No account or storage limits.
        </p>

        <Button
          variant="secondary"
          size="md"
          icon={Plus}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          disabled={disabled}
        >
          Choose Files
        </Button>

        {/* Supported badges */}
        <div className="flex flex-wrap justify-center gap-2 mt-6 text-[11px] text-slate-400">
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Any format</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Multi-file</span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Direct P2P</span>
        </div>
      </motion.div>
    </div>
  );
}

