import { useNavigate } from 'react-router-dom';

export default function ViolationFeed({ violations }) {
  const navigate = useNavigate();

  if (!violations || violations.length === 0) {
    return (
      <div className="glass-card-static" style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>🛡️</div>
        <p className="text-secondary">No violations detected yet</p>
        <p className="text-xs text-muted mt-1">
          Use the Scout to analyze suspect videos
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 stagger-children">
      {violations.map((v, i) => (
        <div
          key={v.id || i}
          className="violation-item animate-fade-in-up"
          style={{ opacity: 0 }}
          onClick={() => navigate(`/violation/${v.id || v.violation_id}`)}
        >
          <div className="violation-icon">🚨</div>
          <div className="violation-info">
            <div className="violation-title">
              {v.matched_asset_title || `Asset ${v.matched_asset_id}`}
            </div>
            <div className="violation-meta">
              Leaked from <strong style={{ color: 'var(--accent-red)' }}>
                {v.matched_channel_name || 'Unknown Channel'}
              </strong>
              {' · '}
              {v.confidence ? `${(v.confidence * 100).toFixed(0)}% confidence` : ''}
              {' · '}
              {v.detected_at ? new Date(v.detected_at).toLocaleString() : ''}
            </div>
          </div>
          <div>
            <span className={`badge ${
              v.enforcement_status === 'dmca_sent' ? 'badge-success' :
              v.enforcement_status === 'pending' ? 'badge-warning' : 'badge-danger'
            }`}>
              <span className={`status-dot ${
                v.enforcement_status === 'dmca_sent' ? 'active' :
                v.enforcement_status === 'pending' ? 'pending' : 'error'
              }`}></span>
              {v.enforcement_status === 'dmca_sent' ? 'DMCA Sent' :
               v.enforcement_status === 'pending' ? 'Pending' : v.enforcement_status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
