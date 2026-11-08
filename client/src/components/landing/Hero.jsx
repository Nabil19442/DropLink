import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Zap, Layers, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { DeviceTransferGraphic } from './DeviceTransferGraphic.jsx';

export function Hero({ onStartSharing, onSeeHowItWorks }) {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-accent/20 via-blue-500/10 to-cyan/15 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Expressive Copy & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="lg:col-span-6 flex flex-col items-start text-left"
          >
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-accent-light text-xs font-semibold mb-6 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-cyan" />
              <span>Next-Generation Peer-to-Peer Transfer</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] mb-6">
              Your Files.{' '}
              <span className="block text-gradient-accent">Your Devices.</span>
              <span className="block text-gradient-primary">Anywhere.</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
              Transfer anything, anywhere. No cables, no accounts, no complicated setup. Just connect and send directly through encrypted WebRTC channels.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto mb-10">
              <Button
                variant="glow"
                size="lg"
                onClick={onStartSharing}
                icon={Zap}
                iconPosition="left"
                className="w-full sm:w-auto"
              >
                Start Sharing Now
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={onSeeHowItWorks}
                icon={ArrowRight}
                iconPosition="right"
                className="w-full sm:w-auto"
              >
                See How It Works
              </Button>
            </div>

            {/* Value Props Row */}
            <div className="pt-6 border-t border-white/10 w-full grid grid-cols-3 gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero Cloud Storage</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan shrink-0" />
                <span>Pure Wire Speeds</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400 shrink-0" />
                <span>Any File Size</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Animated Device Connection Scene */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-6 relative"
          >
            <DeviceTransferGraphic />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
