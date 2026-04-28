import { useState } from 'react';

export default function ChannelBuilder({ channels, onChange }) {
  const [newChannel, setNewChannel] = useState('');

  const addChannel = () => {
    const name = newChannel.trim();
    if (!name) return;
    const newId = channels.length > 0 ? Math.max(...channels.map(c => c.channel_id)) + 1 : 1;
    onChange([...channels, { channel_id: newId, channel_name: name }]);
    setNewChannel('');
  };

  const removeChannel = (id) => {
    onChange(channels.filter(c => c.channel_id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addChannel();
    }
  };

  return (
    <div>
      <label className="input-label">Distribution Channels</label>
      <div className="flex gap-1 mb-2">
        <input
          type="text"
          className="input-field"
          placeholder="e.g., Official YouTube, Broadcast Partner ESPN..."
          value={newChannel}
          onChange={(e) => setNewChannel(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button type="button" className="btn btn-outline" onClick={addChannel}>
          + Add
        </button>
      </div>

      <div className="flex flex-col gap-1">
        {channels.map((ch, i) => (
          <div
            key={ch.channel_id}
            className="flex items-center justify-between animate-fade-in"
            style={{
              padding: '0.6rem 1rem',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1">
              <span className="badge badge-info">CH-{ch.channel_id}</span>
              <span style={{ fontSize: '0.9rem' }}>{ch.channel_name}</span>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => removeChannel(ch.channel_id)}
              style={{ color: 'var(--accent-red)' }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {channels.length === 0 && (
        <p className="text-xs text-muted mt-1" style={{ fontStyle: 'italic' }}>
          Add at least one distribution channel. Each channel gets a unique watermark.
        </p>
      )}
    </div>
  );
}
