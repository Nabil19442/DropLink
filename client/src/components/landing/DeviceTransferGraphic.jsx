import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Video, Archive, Image, Music, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

export function DeviceTransferGraphic() {
  const [isHovered, setIsHovered] = useState(false);

  // Floating file badges
  const floatingFiles = [
    { name: '4K_Drone_Footage.mp4', icon: Video, color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', x: '18%', y: '12%', delay: 0 },
    { name: 'Financial_Model.pdf', icon: FileText, color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40', x: '58%', y: '8%', delay: 0.8 },
    { name: 'Design_System.zip', icon: Archive, color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', x: '42%', y: '82%', delay: 1.4 },
    { name: 'Hero_Visual.raw', icon: Image, color: 'text-cyan', bg: 'bg-cyan/20', border: 'border-cyan/40', x: '78%', y: '75%', delay: 0.4 },
  ];

  return (
    <div 
      className="relative w-full max-w-xl mx-auto h-[440px] flex items-center justify-center select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background ambient glow circles */}
      <div className="absolute w-72 h-72 rounded-full bg-accent/20 blur-[90px] -top-10 left-10 pointer-events-none" />
      <div className="absolute w-72 h-72 rounded-full bg-cyan/15 blur-[90px] -bottom-10 right-10 pointer-events-none" />

      {/* Orbital connection rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[380px] h-[380px] rounded-full border border-violet-500/10 animate-[spin_40s_linear_infinite]" />
        <div className="absolute w-[460px] h-[460px] rounded-full border border-cyan-500/10 border-dashed animate-[spin_55s_linear_infinite_reverse]" />
      </div>

      {/* Central SVG Connection Beam & Particle Flow */}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-10" viewBox="0 0 600 400">
        <defs>
          <linearGradient id="beamGradient" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.8" />
          </linearGradient>

          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer ambient glow path */}
        <path
          d="M 170 210 C 260 170, 340 170, 430 210"
          fill="none"
          stroke="url(#beamGradient)"
          strokeWidth="6"
          filter="url(#glowFilter)"
          opacity={isHovered ? "0.9" : "0.6"}
        />

        {/* Sharp core beam */}
        <path
          d="M 170 210 C 260 170, 340 170, 430 210"
          fill="none"
          stroke="url(#beamGradient)"
          strokeWidth="2.5"
          strokeDasharray="6 6"
          className="animate-[pulse_2s_ease-in-out_infinite]"
        />

        {/* Animated Particles flowing along path */}
        {[0, 0.25, 0.5, 0.75].map((offset, i) => (
          <circle key={i} r="4" fill="#22D3EE" filter="url(#glowFilter)">
            <animateMotion
              path="M 170 210 C 260 170, 340 170, 430 210"
              dur={isHovered ? "1.5s" : "2.6s"}
              begin={`${offset * 2.6}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {[0.12, 0.38, 0.62, 0.88].map((offset, i) => (
          <circle key={`v-${i}`} r="3" fill="#A78BFA" filter="url(#glowFilter)">
            <animateMotion
              path="M 430 210 C 340 170, 260 170, 170 210"
              dur={isHovered ? "1.8s" : "3.2s"}
              begin={`${offset * 3.2}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>

      {/* DEVICE 1: SMARTPHONE (Left) */}
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute left-6 sm:left-10 z-20"
      >
        <div className="relative w-36 h-64 sm:w-40 sm:h-72 rounded-[28px] p-2 bg-gradient-to-b from-[#1E2548] via-[#11152B] to-[#0A0D1F] border border-violet-500/30 shadow-2xl shadow-violet-950/50">
          {/* Phone Speaker Notch / Island */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-3.5 bg-black/80 rounded-full flex items-center justify-center gap-1.5 z-30">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80 animate-pulse" />
            <div className="w-2.5 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Phone Screen Display */}
          <div className="w-full h-full rounded-[20px] bg-[#090C1A] overflow-hidden flex flex-col justify-between p-3 border border-white/5 relative">
            <div className="pt-5 flex justify-between items-center text-[10px] text-slate-400">
              <span className="font-semibold text-white">DropLink</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                P2P
              </span>
            </div>

            {/* Inner Phone Transfer Card */}
            <div className="bg-surface/90 border border-violet-500/25 rounded-xl p-2.5 shadow-lg my-auto">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-lg bg-violet-600/30 flex items-center justify-center text-violet-400">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-white truncate">Sending Files</div>
                  <div className="text-[9px] text-slate-400">4 items • 128 MB</div>
                </div>
              </div>
              {/* Animated Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 rounded-full"
                  animate={{ width: ['20%', '85%', '20%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Phone Bottom Pill */}
            <div className="w-12 h-1 bg-slate-600 rounded-full mx-auto" />
          </div>
        </div>
      </motion.div>

      {/* DEVICE 2: LAPTOP (Right) */}
      <motion.div
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute right-4 sm:right-8 z-20"
      >
        {/* Laptop Display */}
        <div className="relative w-56 sm:w-64 h-36 sm:h-40 rounded-t-xl p-2 bg-[#1A1F3B] border-t border-x border-cyan-500/30 shadow-2xl shadow-cyan-950/40">
          {/* Laptop Webcam */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/90" />

          {/* Screen Content */}
          <div className="w-full h-full rounded-t-lg bg-[#090C1A] border border-white/5 p-3 flex flex-col justify-between overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-white/5 pb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500/80" />
                <div className="w-2 h-2 rounded-full bg-amber-500/80" />
                <div className="w-2 h-2 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-[9px] text-cyan-300 font-mono">192.168.1.42 ➔ WebRTC</span>
            </div>

            {/* Laptop UI Transfer Widget */}
            <div className="bg-surface/80 border border-cyan-500/25 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-white">Receiving Data</span>
                <span className="text-[9px] text-cyan font-mono">32.4 MB/s</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan to-blue-400 rounded-full"
                  animate={{ width: ['15%', '92%', '15%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[9px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3 h-3" /> Encrypted P2P
              </span>
              <span>ETA: 4s</span>
            </div>
          </div>
        </div>

        {/* Laptop Keyboard Base & Trackpad */}
        <div className="w-64 sm:w-72 -ml-4 h-3.5 bg-gradient-to-b from-[#252C52] to-[#12162E] rounded-b-xl border-b border-x border-slate-700 shadow-xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-slate-500/40 rounded-b" />
        </div>
      </motion.div>

      {/* FLOATING FILE BADGES */}
      {floatingFiles.map((file, i) => (
        <motion.div
          key={i}
          style={{ left: file.x, top: file.y }}
          animate={{
            y: [0, -8, 0],
            rotate: [0, i % 2 === 0 ? 2 : -2, 0]
          }}
          transition={{
            duration: 3.5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: file.delay
          }}
          className={`absolute z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl ${file.bg} backdrop-blur-md border ${file.border} shadow-lg`}
        >
          <file.icon className={`w-3.5 h-3.5 ${file.color}`} />
          <span className="text-[11px] font-medium text-slate-200">{file.name}</span>
        </motion.div>
      ))}

      {/* Central Transfer Badge */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute z-25 px-3 py-1 rounded-full bg-gradient-to-r from-violet-600/30 to-cyan-500/30 border border-white/20 backdrop-blur-md text-[11px] font-medium text-white flex items-center gap-1.5 shadow-glow-mixed"
      >
        <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
        <span>Direct WebRTC DataChannel</span>
      </motion.div>
    </div>
  );
}

