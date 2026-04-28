import { useState } from 'react';
import FileUploader from '../components/FileUploader.jsx';
import ChannelBuilder from '../components/ChannelBuilder.jsx';

export default function Register() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [ownerOrg, setOwnerOrg] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [channels, setChannels] = useState([
    { channel_id: 1, channel_name: 'Official YouTube' },
    { channel_id: 2, channel_name: 'Broadcast Partner ESPN' },
    { channel_id: 3, channel_name: 'Internal Press Kit' },
  ]);
  const [delta, setDelta] = useState(25);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please upload a video file'); return; }
    if (channels.length === 0) { setError('Add at least one channel'); return; }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(10);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));
      formData.append('owner_org', ownerOrg || 'Phantom-Tag User');
      formData.append('owner_email', ownerEmail || '');
      formData.append('channels', JSON.stringify(channels));
      formData.append('delta', String(delta));

      setProgress(30);

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setProgress(30 + Math.round((e.loaded / e.total) * 30));
        }
      });

      const response = await new Promise((resolve, reject) => {
        xhr.open('POST', '/api/assets/register');
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || 'Registration failed')); }
            catch { reject(new Error(`HTTP ${xhr.status}: Registration failed`)); }
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
        setProgress(70);
      });

      setProgress(100);
      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in-up">
        <h1><span className="text-gradient">🔨 The Forge</span></h1>
        <p>Register a digital asset and generate per-channel watermarked variants</p>
      </div>

      {result ? (
        /* Success Result */
        <div className="animate-fade-in-up">
          <div className="glass-card-static" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ fontSize: '2rem' }}>✅</span>
              <div>
                <h3 style={{ color: 'var(--accent-green)' }}>Asset Registered Successfully</h3>
                <p className="text-sm text-secondary">
                  {result.variants_created} watermarked variants created in {result.processing_time_seconds}s
                </p>
              </div>
            </div>

            <div className="section-divider"></div>

            <div className="grid-2 mt-2">
              <div>
                <div className="input-label">Asset ID</div>
                <div className="font-mono" style={{ color: 'var(--accent-cyan)' }}>{result.asset_id}</div>
              </div>
              <div>
                <div className="input-label">Title</div>
                <div>{result.title}</div>
              </div>
            </div>

            <h3 className="mt-3 mb-2">Channel Variants</h3>
            <div className="flex flex-col gap-1">
              {result.channels?.map((ch) => (
                <div key={ch.channel_id} className="glass-card" style={{ padding: '0.8rem 1rem' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="badge badge-info">CH-{ch.channel_id}</span>{' '}
                      <strong>{ch.channel_name}</strong>
                    </div>
                    <span className="badge badge-success">✓ Watermarked</span>
                  </div>
                  <div className="text-xs text-muted mt-1 font-mono">
                    Hash: {ch.watermark_bits_hash} · {ch.embedded_frames} frames embedded
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary mt-3" onClick={() => { setResult(null); setFile(null); }}>
              Register Another Asset
            </button>
          </div>
        </div>
      ) : (
        /* Registration Form */
        <form onSubmit={handleSubmit} className="animate-fade-in-up">
          <div className="grid-2">
            <div>
              <FileUploader onFileSelect={setFile} />

              <div className="mt-3">
                <label className="input-label">Asset Title</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., UCL Final 2026 — Mbappe Goal 73rd Minute"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid-2 mt-2">
                <div>
                  <label className="input-label">Organization</label>
                  <input type="text" className="input-field" placeholder="e.g., UEFA"
                    value={ownerOrg} onChange={(e) => setOwnerOrg(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Contact Email</label>
                  <input type="email" className="input-field" placeholder="ip@organization.com"
                    value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} />
                </div>
              </div>

              <div className="mt-2">
                <label className="input-label">QIM Delta (Quantization Step)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="15" max="50" value={delta}
                    onChange={(e) => setDelta(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-purple)' }} />
                  <span className="font-mono badge badge-info">{delta}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Higher = more robust watermark, lower = less visible. Recommended: 25
                </p>
              </div>
            </div>

            <div>
              <ChannelBuilder channels={channels} onChange={setChannels} />

              <div className="mt-3">
                <button type="submit" className="btn btn-primary btn-lg w-full"
                  disabled={loading || !file || channels.length === 0}>
                  {loading ? '⏳ Processing...' : '🔨 Forge Watermarked Variants'}
                </button>

                {loading && (
                  <div className="mt-2">
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-muted mt-1 text-center">
                      {progress < 60 ? 'Uploading video...' :
                       progress < 90 ? 'Embedding watermarks & generating fingerprints...' :
                       'Saving to Firestore...'}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="mt-2" style={{
                    padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)'
                  }}>
                    <p style={{ color: 'var(--accent-red)', fontSize: '0.85rem' }}>❌ {error}</p>
                  </div>
                )}
              </div>

              <div className="glass-card-static mt-3" style={{ fontSize: '0.8rem' }}>
                <h4 className="mb-1" style={{ color: 'var(--accent-cyan)' }}>ℹ️ How Forge Works</h4>
                <ul style={{ color: 'var(--text-secondary)', paddingLeft: '1rem', lineHeight: 2 }}>
                  <li>Video is processed frame-by-frame through QIM-DCT</li>
                  <li>Each channel gets a <strong>unique 80-bit watermark</strong></li>
                  <li>Watermark embedded in mid-frequency DCT coefficients</li>
                  <li>Survives transcoding, compression, and re-encoding</li>
                  <li>CNN fingerprint (ResNet-50 + PCA) generated for detection</li>
                </ul>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
