import { useState, useEffect } from 'react';

export default function StatsCard({ icon, value, label, delay = 0, color }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (typeof value !== 'number') {
      setDisplayValue(value);
      return;
    }
    // Animated counter
    const duration = 1200;
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(eased * value));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className="glass-card stat-card animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-value" style={{ color: color || 'var(--text-primary)' }}>
        {displayValue}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
