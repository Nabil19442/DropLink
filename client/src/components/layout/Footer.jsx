import React from 'react';
import { ShieldCheck, HardDrive, Wifi, Zap, Globe, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-violet-500/15 bg-[#060814] text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-accent to-cyan flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-white">DropLink</span>
          </div>
          <p className="text-sm text-slate-400 max-w-sm mb-4 leading-relaxed">
            Direct WebRTC peer-to-peer file transfer engine. Zero cloud storage, zero logins, zero speed throttling.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan" /> End-to-End Encrypted (DTLS)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> 0-Byte Server Storage
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300">
              <Wifi className="w-3.5 h-3.5 text-violet-400" /> Direct NAT / STUN / TURN
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Protocol</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#how-it-works" className="hover:text-cyan transition-colors">WebRTC DataChannel</a></li>
            <li><a href="#security" className="hover:text-cyan transition-colors">Ephemeral Signaling</a></li>
            <li><a href="#security" className="hover:text-cyan transition-colors">Chunked Backpressure</a></li>
            <li><a href="#security" className="hover:text-cyan transition-colors">Peer Consent Model</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Guarantees</h4>
          <ul className="space-y-2 text-sm">
            <li className="text-slate-300">No account required</li>
            <li className="text-slate-300">No tracking cookies</li>
            <li className="text-slate-300">In-memory room expiry</li>
            <li className="text-slate-300">Direct binary array streaming</li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
        <p>© {new Date().getFullYear()} DropLink. Engineered for private, decentralized file sharing.</p>
        <p className="flex items-center gap-1">
          Made for high-speed device-to-device transfers worldwide
        </p>
      </div>
    </footer>
  );
}
