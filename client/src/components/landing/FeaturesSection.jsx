import React from 'react';
import { motion } from 'framer-motion';
import { Zap, ShieldCheck, QrCode, Cpu, WifiOff, Globe, Sparkles, HardDriveDownload } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard.jsx';

export function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: 'Direct Peer-to-Peer Speed',
      description: 'Files fly directly between your devices at full local Wi-Fi or high-speed internet capability, bypassing cloud upload bottlenecks.',
      accent: 'text-violet-400',
      badge: 'Unthrottled'
    },
    {
      icon: ShieldCheck,
      title: 'Zero Cloud Storage & 100% Privacy',
      description: 'Your files never touch a server disk or database. Transfers happen exclusively in-flight via encrypted WebRTC DTLS/SCTP channels.',
      accent: 'text-emerald-400',
      badge: 'Zero Knowledge'
    },
    {
      icon: QrCode,
      title: 'Seamless QR & Instant Links',
      description: 'Pair your phone to your computer in seconds by scanning a dynamic QR code or sharing a one-time cryptographic transfer link.',
      accent: 'text-cyan',
      badge: 'Frictionless'
    },
    {
      icon: Cpu,
      title: 'Intelligent Backpressure Streaming',
      description: 'Built-in flow control continuously monitors buffer drains, allowing reliable gigabyte transfers without freezing browser memory.',
      accent: 'text-blue-400',
      badge: 'Chunk-Engine'
    },
    {
      icon: Globe,
      title: 'Global NAT Traversal (STUN & TURN)',
      description: 'Engineered to puncture through restrictive residential Wi-Fi, mobile carrier CGNAT, and corporate firewalls seamlessly.',
      accent: 'text-amber-400',
      badge: 'Universal'
    },
    {
      icon: HardDriveDownload,
      title: 'No App Install or Registration',
      description: 'Works instantly in modern browsers across iOS, Android, macOS, Windows, and Linux. No passwords or software to download.',
      accent: 'text-purple-400',
      badge: '100% Web'
    }
  ];

  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan/10 border border-cyan/25 text-cyan text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architecture & Performance</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Engineered for pure speed and total sovereignty.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            DropLink eliminates third-party cloud servers entirely, connecting sender and receiver directly via peer-to-peer data pipes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
            >
              <GlassCard variant="interactive" className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-muted border border-surface-border flex items-center justify-center">
                      <feature.icon className={`w-6 h-6 ${feature.accent}`} />
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                      {feature.badge}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
