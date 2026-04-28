import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';

export default function ViolationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [violation, setViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enforcing, setEnforcing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'violations', id), (snap) => {
      if (snap.exists()) {
        setViolation({ id: snap.id, ...snap.data() });
      }
      setLoading(false);
    });
    return unsub;
  }, [id]);

  const handleEnforce = async () => {
    setEnforcing(true);
    try {
      const res = await fetch('/api/enforce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ violation_id: id }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert('⚡ DMCA Takedown executed successfully!');
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
    setEnforcing(false);
  };

  if (loading) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '5rem' }}>
        <div className="skeleton" style={{ width: '200px', height: '24px', margin: '0 auto 1rem' }}></div>
        <div className="skeleton" style={{ width: '300px', height: '16px', margin: '0 auto' }}></div>
      </div>
    );
  }

  if (!violation) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '5rem' }}>
        <h2>Violation not found</h2>
        <p className="text-muted mt-1">ID: {id}</p>
        <button className="btn btn-primary mt-3" onClick={() => navigate('/')}>Back to Dashboard</button>
      </div>
    );
  }

  const v = violation;

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <button className="btn btn-ghost btn-sm mb-2" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1><span className="text-gradient">Violation Report</span></h1>
            <p className="font-mono text-sm text-muted">{v.violation_id || id}</p>
          </div>
          <span className={`badge ${
            v.enforcement_status === 'dmca_sent' ? 'badge-success' : 'badge-warning'
          }`} style={{ fontSize: '0.85rem', padding: '0.4rem 1rem' }}>
            {v.enforcement_status === 'dmca_sent' ? '✅ DMCA Sent' : '⏳ Pending Enforcement'}
          </span>
        </div>
      </div>

      <div className="grid-2 animate-fade-in-up delay-100" style={{ opacity: 0 }}>
        {/* Left Column: Attribution */}
        <div>
          <div className="glass-card-static" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <ConfidenceMeter confidence={v.confidence || 0} size={80} />
              <div>
                <h3 style={{ color: 'var(--accent-red)' }}>Confirmed Infringement</h3>
                <p className="text-sm text-secondary">{v.interpretation}</p>
              </div>
            </div>

            <div className="section-divider"></div>

            <div className="flex flex-col gap-2 mt-2">
              <InfoRow label="Matched Asset" value={v.matched_asset_title} highlight />
              <InfoRow label="Asset ID" value={v.matched_asset_id} mono />
              <InfoRow label="Leak Source Channel" value={v.matched_channel_name} color="var(--accent-red)" />
              <InfoRow label="Channel ID" value={v.matched_channel_id} mono />
              <InfoRow label="Suspect URL" value={v.suspect_url} mono />
              <InfoRow label="Detected At" value={v.detected_at ? new Date(v.detected_at).toLocaleString() : 'N/A'} />
              <InfoRow label="Owner" value={v.owner_org} />
            </div>
          </div>

          {v.enforcement_status !== 'dmca_sent' && (
            <button className="btn btn-danger btn-lg w-full mt-2" onClick={handleEnforce} disabled={enforcing}>
              {enforcing ? '⏳ Processing...' : '⚡ Execute DMCA Takedown'}
            </button>
          )}
        </div>

        {/* Right Column: Evidence */}
        <div>
          <div className="glass-card-static">
            <h3 className="mb-2">📊 Forensic Evidence</h3>

            <div className="grid-2 gap-2">
              <EvidenceCard label="Watermark Distance" value={`${v.watermark_hamming_distance} / 80`}
                subtitle="bits flipped" color="var(--accent-purple)" />
              <EvidenceCard label="Confidence" value={`${((v.confidence || 0) * 100).toFixed(1)}%`}
                subtitle="match confidence" color="var(--accent-green)" />
            </div>

            <div className="mt-2">
              <div className="input-label">Evidence Hash</div>
              <div className="font-mono text-sm" style={{
                padding: '0.8rem', background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)', wordBreak: 'break-all',
                color: 'var(--accent-cyan)', border: '1px solid var(--border-subtle)'
              }}>
                {v.evidence_hash || 'N/A'}
              </div>
            </div>
          </div>

          {/* Enforcement Timeline */}
          <div className="glass-card-static mt-2">
            <h3 className="mb-2">⏱️ Enforcement Timeline</h3>
            <div className="flex flex-col gap-2">
              <TimelineItem icon="🔍" title="Violation Detected" time={v.detected_at} active />
              <TimelineItem icon="📄"
                title={v.enforcement_status === 'dmca_sent' ? 'DMCA PDF Generated' : 'Awaiting DMCA'}
                time={v.dmca_sent_at}
                active={v.enforcement_status === 'dmca_sent'} />
              <TimelineItem icon="📧"
                title={v.enforcement_status === 'dmca_sent' ? 'Takedown Email Sent' : 'Email Pending'}
                time={v.dmca_sent_at}
                active={v.enforcement_status === 'dmca_sent'} />
              <TimelineItem icon="🔒" title="Platform Action" time={null}
                active={!!v.platform_response?.status} />
            </div>
          </div>

          {v.platform_response && v.platform_response.status === 'content_locked' && (
            <div className="glass-card-static mt-2" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                    Revenue Rerouted to Owner
                  </div>
                  <div className="text-xs text-muted">
                    {v.platform_response.note}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, highlight, color }) {
  return (
    <div>
      <div className="input-label">{label}</div>
      <div style={{
        fontWeight: highlight ? 700 : 500,
        fontFamily: mono ? 'var(--font-mono)' : 'inherit',
        fontSize: mono ? '0.85rem' : '0.95rem',
        color: color || (highlight ? 'var(--accent-cyan)' : 'var(--text-primary)'),
        wordBreak: 'break-all'
      }}>
        {String(value || 'N/A')}
      </div>
    </div>
  );
}

function EvidenceCard({ label, value, subtitle, color }) {
  return (
    <div className="glass-card" style={{ textAlign: 'center' }}>
      <div className="input-label">{label}</div>
      <div className="font-mono" style={{ fontSize: '1.8rem', fontWeight: 800, color }}>{value}</div>
      <div className="text-xs text-muted">{subtitle}</div>
    </div>
  );
}

function TimelineItem({ icon, title, time, active }) {
  return (
    <div className="flex items-center gap-2" style={{ opacity: active ? 1 : 0.4 }}>
      <div style={{
        width: '32px', height: '32px', borderRadius: '50%',
        background: active ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.9rem', border: `1px solid ${active ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{title}</div>
        {time && <div className="text-xs text-muted">{new Date(time).toLocaleString()}</div>}
      </div>
    </div>
  );
}
