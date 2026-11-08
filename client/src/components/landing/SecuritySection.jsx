import React from 'react';
import { ShieldCheck, Lock, EyeOff, KeyRound, ServerOff, Clock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard.jsx';

export function SecuritySection() {
  const securityPillars = [
    {
      icon: ServerOff,
      title: 'Zero Storage Architecture',
      description: 'Files are read as binary streams in the sender browser and reconstructed in the receiver browser. The signaling server never receives file bytes.'
    },
    {
      icon: Lock,
      title: 'End-to-End DTLS / SCTP Encryption',
      description: 'All data transmitted over WebRTC DataChannels is natively encrypted using DTLS (Datagram Transport Layer Security), standard in secure browser communications.'
    },
    {
      icon: EyeOff,
      title: 'Strict Consent Verification',
      description: 'No files are ever automatically pushed to a receiving device. The receiver must view the sender identity and explicitly authorize the transfer.'
    },
    {
      icon: KeyRound,
      title: 'Cryptographic Room Identifiers',
      description: 'Rooms use unguessable, high-entropy cryptographic tokens. Brute-force guessing is blocked by server-side rate limiters.'
    },
    {
      icon: Clock,
      title: 'Automatic Ephemeral Expiration',
      description: 'Transfer rooms are held in volatile server memory with auto-expiration timers. If an transfer is completed or abandoned, room state is purged.'
    },
    {
      icon: ShieldCheck,
      title: 'No Accounts, No Tracking',
      description: 'No email addresses, no tracking cookies, and no personal telemetry. DropLink delivers sovereign utility without surveillance.'
    }
  ];

  return (
    <section id="security" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero-Trust Privacy</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Privacy by design, not by promise.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            DropLink operates on a strict zero-knowledge model. We don't store your files because we architecturally cannot access them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map((pillar, idx) => (
            <GlassCard key={idx} variant="subtle" className="p-6 border-white/10 hover:border-emerald-500/30 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <pillar.icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-base font-semibold text-white mb-2">
                {pillar.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {pillar.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
