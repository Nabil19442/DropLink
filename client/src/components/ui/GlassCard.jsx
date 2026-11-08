import React from 'react';
import { motion } from 'framer-motion';

export function GlassCard({
  children,
  variant = 'default', // 'default' | 'subtle' | 'glow' | 'interactive'
  className = '',
  ...props
}) {
  const variantStyles = {
    default: 'glass-panel',
    subtle: 'glass-panel-subtle',
    glow: 'glass-panel-glow',
    interactive: 'glass-panel glass-interactive cursor-pointer',
  }[variant];

  return (
    <div
      className={`rounded-2xl p-6 relative overflow-hidden ${variantStyles} ${className}`}
      {...props}
    >
      {/* Ambient background highlight */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
