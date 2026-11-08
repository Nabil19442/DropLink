import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard.jsx';

export function FaqSection() {
  const faqs = [
    {
      q: 'Is there any file size limit?',
      a: 'Because DropLink streams binary chunks directly between peers using browser memory buffers, there are virtually no artificial file limits. You can transfer hundreds of megabytes or multiple gigabytes. Total transfer capability depends on your browser and RAM.'
    },
    {
      q: 'Do both devices need to be on the same Wi-Fi network?',
      a: 'No! If devices are on the same Wi-Fi, WebRTC connects locally over high-speed LAN. If devices are in different cities or on cellular data (4G/5G), DropLink uses STUN and TURN relay traversal to establish global connectivity.'
    },
    {
      q: 'Are files saved on any server before downloading?',
      a: 'Never. DropLink runs an ephemeral signaling server solely to exchange connection handshakes (SDP and ICE candidates). File contents travel exclusively between the two peers.'
    },
    {
      q: 'Can anyone else intercept my files?',
      a: 'No. WebRTC DataChannels are cryptographically secured using DTLS and SCTP encryption. Even the DropLink signaling server cannot read your file packets.'
    },
    {
      q: 'Does it work between iPhone and Windows PC?',
      a: 'Yes! DropLink is 100% browser-based. You can transfer files freely between iOS (Safari/Chrome), Android (Chrome/Firefox/Samsung), Windows, macOS, and Linux.'
    }
  ];

  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <section id="faq" className="py-24 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm">
            Everything you need to know about peer-to-peer transfers with DropLink.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <GlassCard
                key={idx}
                variant="subtle"
                className="p-5 border-white/10 cursor-pointer transition-colors hover:border-violet-500/30"
                onClick={() => toggle(idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-base font-semibold text-white">
                    {faq.q}
                  </h3>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-slate-400"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="pt-3 text-sm text-slate-300 leading-relaxed border-t border-white/5 mt-3">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

