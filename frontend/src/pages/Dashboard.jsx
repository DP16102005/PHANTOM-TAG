import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase.js';
import StatsCard from '../components/StatsCard.jsx';
import ViolationFeed from '../components/ViolationFeed.jsx';

export default function Dashboard() {
  const [stats, setStats] = useState({ assets_secured: 0, violations_detected: 0, dmca_sent: 0, total_channels: 0 });
  const [violations, setViolations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time Firestore listeners
    const unsubViolations = onSnapshot(
      collection(db, 'violations'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        docs.sort((a, b) => (b.detected_at || '').localeCompare(a.detected_at || ''));
        setViolations(docs);
        const dmcaSent = docs.filter(d => d.enforcement_status === 'dmca_sent').length;
        setStats(prev => ({ ...prev, violations_detected: docs.length, dmca_sent: dmcaSent }));
        setLoading(false);
      },
      (err) => { console.error('Firestore violations listener error:', err); setLoading(false); }
    );

    const unsubAssets = onSnapshot(
      collection(db, 'assets'),
      (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAssets(docs);
        let totalChannels = 0;
        docs.forEach(d => { if (Array.isArray(d.channels)) totalChannels += d.channels.length; });
        setStats(prev => ({ ...prev, assets_secured: docs.length, total_channels: totalChannels }));
      },
      (err) => console.error('Firestore assets listener error:', err)
    );

    return () => { unsubViolations(); unsubAssets(); };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <h1>
          <span className="text-gradient">Command Center</span>
        </h1>
        <p>Real-time asset protection monitoring and violation tracking</p>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mb-3">
        <StatsCard icon="🛡️" value={stats.assets_secured} label="Assets Secured" delay={0} color="var(--accent-cyan)" />
        <StatsCard icon="📡" value={stats.total_channels} label="Channel Variants" delay={100} color="var(--accent-purple)" />
        <StatsCard icon="🚨" value={stats.violations_detected} label="Violations Detected" delay={200} color="var(--accent-red)" />
        <StatsCard icon="⚡" value={stats.dmca_sent} label="DMCAs Enforced" delay={300} color="var(--accent-green)" />
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Violation Feed */}
        <div className="animate-fade-in-up delay-200" style={{ opacity: 0 }}>
          <h3 className="mb-2 flex items-center gap-1">
            <span className="status-dot active"></span>
            Live Violation Feed
          </h3>
          <ViolationFeed violations={violations.slice(0, 10)} />
        </div>

        {/* System Status + Recent Assets */}
        <div className="animate-fade-in-up delay-300" style={{ opacity: 0 }}>
          <h3 className="mb-2">System Architecture</h3>
          <div className="glass-card-static" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre', overflowX: 'auto' }}>
{`┌─────────────────────────────┐
│      PHANTOM-TAG SYSTEM     │
├─────────────────────────────┤
│                             │
│  📹 Asset Upload            │
│    │                        │
│    ▼                        │
│  🔨 THE FORGE               │
│  │ QIM-DCT Watermarking     │
│  │ Per-Channel Variants     │
│  │ CNN Fingerprinting       │
│  │                          │
│  ▼                          │
│  🔍 THE SCOUT               │
│  │ Blind Extraction         │
│  │ Hamming Distance Match   │
│  │ Channel Attribution      │
│  │                          │
│  ▼                          │
│  ⚡ THE ENFORCER             │
│    DMCA PDF Generation      │
│    Automated Takedown       │
│    Platform Integration     │
└─────────────────────────────┘`}
          </div>

          <h3 className="mt-3 mb-2">Protected Assets</h3>
          {assets.length === 0 ? (
            <div className="glass-card-static text-center" style={{ padding: '2rem' }}>
              <p className="text-muted">No assets registered yet</p>
              <p className="text-xs text-muted mt-1">Go to Forge to register your first asset</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {assets.slice(0, 5).map((a, i) => (
                <div key={a.id || i} className="glass-card" style={{ padding: '0.8rem 1rem' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</div>
                      <div className="text-xs text-muted">
                        {a.channels?.length || 0} channels · ID: {a.asset_id}
                      </div>
                    </div>
                    <span className="badge badge-success">Protected</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
