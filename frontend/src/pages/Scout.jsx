import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FileUploader from '../components/FileUploader.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';

export default function Scout() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [suspectUrl, setSuspectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [scanPhase, setScanPhase] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please upload a suspect video'); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    const phases = [
      'Extracting keyframes...',
      'Computing CNN fingerprint...',
      'Running blind QIM extraction...',
      'Matching watermark patterns...',
      'Identifying leak source...',
    ];

    let phaseIdx = 0;
    setScanPhase(phases[0]);
    const phaseTimer = setInterval(() => {
      phaseIdx = Math.min(phaseIdx + 1, phases.length - 1);
      setScanPhase(phases[phaseIdx]);
    }, 2000);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('suspect_url', suspectUrl || 'Direct Upload');

      const response = await fetch('/api/suspect/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis failed');

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      clearInterval(phaseTimer);
      setLoading(false);
      setScanPhase('');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <h1><span className="text-gradient">🔍 The Scout</span></h1>
        <p>Analyze suspect videos for watermark extraction and channel attribution</p>
      </div>

      {!result ? (
        <div className="grid-2 animate-fade-in-up">
          <div>
            <form onSubmit={handleAnalyze}>
              <FileUploader onFileSelect={setFile} />

              <div className="mt-2">
                <label className="input-label">Suspect URL (Optional)</label>
                <input type="text" className="input-field"
                  placeholder="https://youtube.com/watch?v=..."
                  value={suspectUrl} onChange={(e) => setSuspectUrl(e.target.value)} />
                <p className="text-xs text-muted mt-1">
                  Where did you find this video? URL is stored as evidence.
                </p>
              </div>

              <button type="submit" className="btn btn-danger btn-lg w-full mt-3"
                disabled={loading || !file}>
                {loading ? '🔍 Analyzing...' : '🔍 Analyze Suspect Video'}
              </button>

              {error && (
                <div className="mt-2" style={{
                  padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)',
                }}>
                  <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>❌ {error}</p>
                </div>
              )}
            </form>
          </div>

          <div>
            {loading ? (
              /* Scanning Animation */
              <div className="glass-card-static scan-effect" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }} className="animate-pulse">
                  🔍
                </div>
                <h3 style={{ color: 'var(--accent-cyan)' }}>Scanning...</h3>
                <p className="text-sm text-secondary mt-1 font-mono">{scanPhase}</p>
                <div className="progress-bar mt-3" style={{ maxWidth: '300px' }}>
                  <div className="progress-bar-fill" style={{
                    width: '100%',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    background: 'var(--accent-cyan)',
                  }}></div>
                </div>
              </div>
            ) : (
              <div className="glass-card-static" style={{ minHeight: '300px' }}>
                <h4 className="mb-2" style={{ color: 'var(--accent-cyan)' }}>ℹ️ How Scout Works</h4>
                <ol style={{ color: 'var(--text-secondary)', paddingLeft: '1.2rem', lineHeight: 2.2, fontSize: '0.85rem' }}>
                  <li>Upload a suspect video clip</li>
                  <li>Engine extracts keyframes and computes CNN fingerprint</li>
                  <li>Fingerprint compared against registered assets (Hamming distance)</li>
                  <li>QIM blind extraction recovers embedded watermark bits</li>
                  <li>Watermark matched against all channel variants</li>
                  <li>If match found → identifies <strong>exact leak source channel</strong></li>
                </ol>
                <div className="mt-2" style={{
                  padding: '0.8rem', background: 'rgba(139, 92, 246, 0.05)',
                  borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139, 92, 246, 0.15)'
                }}>
                  <p className="text-xs text-muted">
                    💡 <strong>Tip:</strong> For best results, upload at least a 5-second clip
                    at the original resolution. The system can handle compressed/transcoded video.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results */
        <div className="animate-fade-in-up">
          {result.status === 'match_found' ? (
            <div className="glass-card-static" style={{ borderColor: 'rgba(239, 68, 68, 0.4)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '2.5rem' }}>🚨</span>
                  <div>
                    <h2 style={{ color: 'var(--accent-red)' }}>Match Found</h2>
                    <p className="text-secondary">{result.interpretation}</p>
                  </div>
                </div>
                <ConfidenceMeter confidence={result.confidence} size={100} />
              </div>

              <div className="section-divider"></div>

              <div className="grid-3 mt-2">
                <div className="glass-card">
                  <div className="input-label">Matched Asset</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {result.matched_asset_title}
                  </div>
                  <div className="text-xs text-muted mt-1">ID: {result.matched_asset_id}</div>
                </div>
                <div className="glass-card" style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <div className="input-label">Leak Source</div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-red)' }}>
                    {result.matched_channel_name}
                  </div>
                  <div className="text-xs text-muted mt-1">Channel ID: {result.matched_channel_id}</div>
                </div>
                <div className="glass-card">
                  <div className="input-label">Evidence Hash</div>
                  <div className="font-mono text-sm" style={{ wordBreak: 'break-all', color: 'var(--accent-purple)' }}>
                    {result.evidence_hash}
                  </div>
                </div>
              </div>

              <div className="grid-2 mt-2">
                <div className="glass-card">
                  <div className="input-label">Watermark Hamming Distance</div>
                  <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                    {result.watermark_hamming_distance}
                    <span className="text-xs text-muted"> / 80 bits</span>
                  </div>
                </div>
                <div className="glass-card">
                  <div className="input-label">Confidence Score</div>
                  <div className="font-mono" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button className="btn btn-danger btn-lg"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/enforce', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ violation_id: result.violation_id }),
                      });
                      const data = await res.json();
                      if (data.status === 'success') {
                        alert('⚡ DMCA Takedown executed! PDF generated and email sent.');
                        navigate(`/violation/${result.violation_id}`);
                      }
                    } catch (err) {
                      alert('Enforcement error: ' + err.message);
                    }
                  }}
                >
                  ⚡ Execute Takedown
                </button>
                <button className="btn btn-outline btn-lg"
                  onClick={() => navigate(`/violation/${result.violation_id}`)}>
                  View Details
                </button>
                <button className="btn btn-ghost btn-lg" onClick={() => { setResult(null); setFile(null); }}>
                  Scan Another
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card-static text-center" style={{ padding: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <h2 style={{ color: 'var(--accent-green)' }}>No Match Found</h2>
              <p className="text-secondary mt-1">
                {result.message || 'This video does not match any registered assets.'}
              </p>
              {result.closest_match && (
                <p className="text-xs text-muted mt-2 font-mono">
                  Closest: Asset {result.closest_match.matched_asset_id} —
                  Distance {result.closest_match.watermark_hamming_distance} (threshold: {result.threshold})
                </p>
              )}
              <button className="btn btn-primary mt-3" onClick={() => { setResult(null); setFile(null); }}>
                Scan Another Video
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
