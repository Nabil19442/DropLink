import React from 'react';
import { motion } from 'framer-motion';

export function Button({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'glow' | 'ghost' | 'danger' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:ring-offset-2 focus:ring-offset-background';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3.5 gap-2.5 font-semibold',
  }[size];

  const variantStyles = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/25 hover:shadow-accent/40 active:scale-[0.98]',
    glow: 'bg-gradient-to-r from-accent via-blue-500 to-cyan text-white shadow-glow-violet hover:shadow-glow-cyan active:scale-[0.98]',
    secondary: 'bg-surface-muted text-slate-base hover:bg-surface-hover border border-surface-border hover:border-accent/40 active:scale-[0.98]',
    ghost: 'bg-transparent text-slate-muted hover:text-white hover:bg-white/5 active:scale-[0.98]',
    outline: 'bg-transparent border border-surface-border text-slate-base hover:border-accent hover:text-white active:scale-[0.98]',
    danger: 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 active:scale-[0.98]',
  }[variant];

  return (
    <motion.button
      type={type}
      whileHover={disabled || loading ? {} : { scale: 1.02 }}
      whileTap={disabled || loading ? {} : { scale: 0.98 }}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />}
        </>
      )}
    </motion.button>
  );
}
