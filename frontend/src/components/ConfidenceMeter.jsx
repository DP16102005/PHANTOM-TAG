export default function ConfidenceMeter({ confidence = 0, size = 90 }) {
  const pct = Math.round(confidence * 100);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (confidence * circumference);

  let color = 'var(--accent-green)';
  if (pct < 50) color = 'var(--accent-red)';
  else if (pct < 80) color = 'var(--accent-amber)';

  return (
    <div className="confidence-ring" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="ring-bg"
          cx={size / 2} cy={size / 2} r={radius}
        />
        <circle
          className="ring-fill"
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="confidence-value" style={{ color }}>
        {pct}%
      </div>
    </div>
  );
}
