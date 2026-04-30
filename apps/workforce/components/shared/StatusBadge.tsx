import React from 'react';

interface StatusBadgeProps {
  status: string;
  labels: Record<string, string>;
  colors: Record<string, string>;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, labels, colors, size = 'sm' }) => {
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';
  return (
    <span className={`${textSize} font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${colors[status] || ''}`}>
      {labels[status] || status}
    </span>
  );
};
