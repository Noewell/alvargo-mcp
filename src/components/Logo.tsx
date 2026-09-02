import React from 'react';

interface LogoProps {
  className?: string;
  compact?: boolean;
}

/**
 * Uses the approved Alvargo artwork supplied by the brand owner. The compact
 * variant is the original emblem crop for navigation-sized placements; the
 * default lock-up preserves the complete official wordmark.
 */
export function Logo({ className = 'h-9 w-auto', compact = false }: LogoProps) {
  return (
    <img
      src={compact ? '/brand/alvargo-icon-mark.png' : '/brand/alvargo-logo-trimmed.png'}
      className={`block object-contain ${className}`}
      alt="Alvargo"
      draggable={false}
    />
  );
}
