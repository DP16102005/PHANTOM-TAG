/**
 * Phantom-Tag Backend Server
 *
 * Express API gateway connecting the frontend to the Flask engine.
 * Handles file uploads, Firestore operations, and the Enforcer agent.
 *
 * Port: 3001 (configurable via PORT env var)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// === Middleware ===

app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer config for file uploads
const uploadDir = path.join(__dirname, '..', 'storage', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
  fileFilter: (req, file, cb) => {
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('video/') || videoExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  },
});

// === Routes ===

// Asset routes (with file upload middleware)
const assetsRouter = require('./routes/assets');
app.use('/api/assets', upload.single('video'), assetsRouter);
// Alias for convenience
app.post('/api/asset/register', upload.single('video'), (req, res, next) => {
  req.url = '/register';
  assetsRouter.handle(req, res, next);
});

// Scout routes (with file upload middleware)
const scoutRouter = require('./routes/scout');
app.use('/api/suspect', upload.single('video'), scoutRouter);

// Dashboard routes
const dashboardRouter = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRouter);

// Enforcer routes
const enforcerRouter = require('./routes/enforcer');
app.use('/api/enforce', enforcerRouter);

// Mock platform routes
const mockPlatformRouter = require('./routes/mock-platform');
app.use('/platform', mockPlatformRouter);

// Serve stored files (for frontend to display watermarked videos, PDFs, etc.)
app.use('/storage', express.static(path.join(__dirname, '..', 'storage')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'phantom-tag-backend',
    timestamp: new Date().toISOString(),
    engine_url: process.env.ENGINE_URL || 'http://localhost:5001',
  });
});

// === Error Handler ===

app.use((err, req, res, next) => {
  console.error('[SERVER] Error:', err.message);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// === Start ===

app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(55));
  console.log('  🔮 Phantom-Tag Backend Server');
  console.log('='.repeat(55));
  console.log(`  Port:     ${PORT}`);
  console.log(`  Engine:   ${process.env.ENGINE_URL || 'http://localhost:5001'}`);
  console.log(`  Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`  Storage:  ${path.resolve(path.join(__dirname, '..', 'storage'))}`);
  console.log('='.repeat(55));
  console.log('');
});

module.exports = app;
