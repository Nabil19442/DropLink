import React from 'react';

export function Badge({
  children,
  variant = 'default', // 'default' | 'success' | 'warning' | 'info' | 'purple' | 'cyan'
  pulse = false,
  size = 'md',
  className = '',
  icon: Icon
}) {
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5',
    md: 'text-xs px-3 py-1 font-medium',
    lg: 'text-sm px-3.5 py-1.5 font-medium'
  }[size];

  const variantStyles = {
    default: 'bg-surface-muted text-slate-300 border border-surface-border',
    success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    danger: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    info: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    purple: 'bg-accent/15 text-accent-light border border-accent/30',
    cyan: 'bg-cyan/15 text-cyan border border-cyan/30'
  }[variant];

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-rose-400',
    info: 'bg-blue-400',
    purple: 'bg-accent',
    cyan: 'bg-cyan'
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeStyles} ${variantStyles} ${className}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColors}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColors}`}></span>
        </span>
      )}
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <span>{children}</span>
    </span>
  );
}
