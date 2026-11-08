import React from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Link as LinkIcon, CheckCircle2, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard.jsx';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Select Your Files',
      description: 'Pick single or multiple files of any size on your phone or laptop. DropLink prepares them into in-memory binary slices without uploading to any server.',
      icon: UploadCloud,
      color: 'from-violet-500 to-purple-600',
    },
    {
      step: '02',
      title: 'Share Room Link or QR',
      description: 'DropLink generates a private room ID, secure share URL, and dynamic QR code. Scan it with your phone or open the link on your laptop.',
      icon: LinkIcon,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      step: '03',
      title: 'Consent & Direct Transfer',
      description: 'The receiving device reviews file names and sizes before clicking Accept. Devices establish a direct WebRTC pipe and stream data instantly.',
      icon: CheckCircle2,
      color: 'from-cyan-400 to-emerald-400',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 relative bg-surface-muted/30 border-y border-violet-500/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-accent-light text-xs font-semibold uppercase tracking-wider mb-4">
            <span>Workflow</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Three simple steps. No friction.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Transferring files between different ecosystems shouldn't require third-party accounts, cloud waiting times, or email file size limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className="relative"
            >
              <GlassCard className="h-full flex flex-col justify-between p-8 border-violet-500/20">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-display font-bold text-3xl text-gradient-accent">
                      {item.step}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white shadow-lg`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-white mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.description}
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
