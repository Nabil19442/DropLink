import React, { useState, useEffect } from 'react';
import { ArrowUpRight, Zap, Shield, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button.jsx';

export function Navbar({ onStartSharing }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-[#080B18]/85 backdrop-blur-xl border-b border-violet-500/15 py-3 shadow-lg shadow-black/40'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-accent via-blue-500 to-cyan flex items-center justify-center shadow-glow-violet group-hover:scale-105 transition-transform">
            <svg
              className="w-5 h-5 text-white transform -rotate-45"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-xl tracking-tight text-white flex items-center gap-1.5">
              DropLink
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-light border border-accent/30 font-semibold tracking-wider">
                P2P
              </span>
            </span>
          </div>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a
            href="#features"
            className="hover:text-cyan transition-colors"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="hover:text-cyan transition-colors"
          >
            How It Works
          </a>
          <a
            href="#security"
            className="hover:text-cyan transition-colors"
          >
            Security & Privacy
          </a>
          <a
            href="#faq"
            className="hover:text-cyan transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Signaling Live
          </div>

          <Button
            variant="glow"
            size="sm"
            onClick={onStartSharing}
            icon={ArrowUpRight}
            iconPosition="right"
          >
            Start Sharing
          </Button>
        </div>
      </div>
    </header>
  );
}

