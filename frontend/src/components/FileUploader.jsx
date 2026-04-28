import { useState, useRef } from 'react';

export default function FileUploader({ onFileSelect, accept = 'video/*', label = 'Upload Video' }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (f && f.type.startsWith('video/')) {
      setFile(f);
      onFileSelect?.(f);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleChange = (e) => {
    handleFile(e.target.files[0]);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="animate-fade-in">
            <div className="upload-icon">🎬</div>
            <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{file.name}</div>
            <div className="text-sm text-muted mt-1">{formatSize(file.size)}</div>
          </div>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <strong>Click or drag & drop</strong> to upload video
            </div>
            <div className="text-xs text-muted mt-1">MP4, WebM, MOV — Max 500MB</div>
          </>
        )}
      </div>
    </div>
  );
}
