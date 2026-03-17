import React from 'react';

/**
 * Shared background glow blobs + grid overlay.
 * Matches the HomeScreen aesthetic across all apps.
 */
const AppBackground: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute rounded-full blur-[120px] opacity-20" style={{ width: '700px', height: '700px', background: 'radial-gradient(circle, #FF9500 0%, transparent 70%)', top: '-250px', left: '-200px' }} />
    <div className="absolute rounded-full blur-[100px] opacity-10" style={{ width: '500px', height: '500px', background: 'radial-gradient(circle, #FF6B00 0%, transparent 70%)', bottom: '-150px', right: '-150px' }} />
    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#FF9500 1px, transparent 1px), linear-gradient(90deg, #FF9500 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
  </div>
);

export default AppBackground;
