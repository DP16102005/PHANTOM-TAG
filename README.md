<p align="center">
  <img src="frontend/public/phantom-tag.svg" width="80" alt="Phantom-Tag Logo"/>
</p>

<h1 align="center">PHANTOM-TAG</h1>
<h3 align="center">Digital Asset Protection for Sports Media</h3>

<p align="center">
  <strong>Forensic Distribution Watermarking · CNN Fingerprinting · Automated DMCA Enforcement</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.13-blue?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/Node.js-Express-green?logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-Vite-purple?logo=react&logoColor=white" alt="React"/>
  <img src="https://img.shields.io/badge/Firebase-Firestore-orange?logo=firebase&logoColor=white" alt="Firebase"/>
  <img src="https://img.shields.io/badge/PyTorch-CPU-red?logo=pytorch&logoColor=white" alt="PyTorch"/>
</p>

---

## Problem Statement

Sports organizations lose **billions annually** to unauthorized redistribution of licensed media. A single leaked broadcast clip can go viral within minutes, making it nearly impossible to identify *which* distribution partner violated their licensing agreement.

**Phantom-Tag** solves this by embedding **invisible, per-channel forensic watermarks** into every distributed copy. When pirated content surfaces, the system extracts the watermark to identify the **exact leak source channel** — providing cryptographic evidence for automated DMCA takedowns.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        PHANTOM-TAG SYSTEM                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│   │   FRONTEND   │    │   BACKEND   │    │       ENGINE        │ │
│   │  Vite+React  │───▶│  Express.js │───▶│    Flask+Python     │ │
│   │  Port 5173   │    │  Port 3001  │    │    Port 5001        │ │
│   └─────────────┘    └──────┬──────┘    └─────────────────────┘ │
│                             │                                    │
│                    ┌────────▼────────┐                           │
│                    │    FIRESTORE    │                           │
│                    │  (Real-time DB) │                           │
│                    └─────────────────┘                           │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────────┤
│   │                    LOCAL STORAGE                             │
│   │  /storage/originals/   — Source videos                      │
│   │  /storage/watermarked/ — Per-channel watermarked variants   │
│   │  /storage/suspects/    — Uploaded suspect clips             │
│   │  /storage/dmca_pdfs/   — Generated DMCA takedown notices    │
│   └─────────────────────────────────────────────────────────────┘
└──────────────────────────────────────────────────────────────────┘
```

---

## Core Pipeline

### 1. 🔨 The Forge — Asset Registration & Watermarking

```
Original Video
      │
      ▼
┌─────────────────────────────────────────┐
│  For each distribution channel:         │
│                                         │
│  1. Generate 80-bit payload             │
│     SHA-256(asset_id + channel_id)      │
│                                         │
│  2. Process frame-by-frame:             │
│     RGB → YUV → Y-channel              │
│       → 8×8 block DCT                  │
│       → QIM on mid-frequency coeffs    │
│       → Inverse DCT → YUV → RGB        │
│                                         │
│  3. CNN Fingerprint (ResNet-50 + PCA)   │
│     2048-dim features → 128-bit hash   │
│                                         │
│  4. Save watermarked variant + metadata │
└─────────────────────────────────────────┘
      │
      ▼
N watermarked video files (one per channel)
```

**Key Algorithm — QIM-DCT (Quantization Index Modulation):**

- Color space: RGB → YUV, watermark embedded in **Y (luminance)** channel only
- Transform: 8×8 block **DCT** (Discrete Cosine Transform)
- Target: Mid-frequency coefficients (robust to compression, invisible to eye)
- Embedding: `QIM(coefficient, bit, delta)` — quantizes to nearest grid point
- Extraction: **Blind** — no original needed, majority voting across frames

### 2. 🔍 The Scout — Suspect Analysis & Attribution

```
Suspect Video (possibly compressed/cropped)
      │
      ▼
┌────────────────────────────────────────────┐
│  1. Extract keyframes (every 15th frame)   │
│                                            │
│  2. CNN fingerprint → Hamming distance     │
│     Compare against all registered assets  │
│                                            │
│  3. Blind QIM watermark extraction         │
│     Majority voting across all frames      │
│                                            │
│  4. Hamming distance to each channel's     │
│     known watermark bits                   │
│                                            │
│  5. Match threshold: < 20/80 bits flipped  │
│     → Identifies exact leak source         │
└────────────────────────────────────────────┘
      │
      ▼
Result: "Leaked from Channel X with Y% confidence"
```

### 3. ⚡ The Enforcer — Automated DMCA Takedown

```
Confirmed Violation
      │
      ├──▶ Generate DMCA PDF (pdf-lib)
      │      Legal notice with evidence hash,
      │      channel attribution, timestamps
      │
      ├──▶ Email Simulation
      │      Console log + PDF archive
      │      (Production: Gmail API integration)
      │
      └──▶ Mock Platform API
             Simulates Content ID response
             "Content locked, revenue rerouted"
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Engine** | Python 3.13, Flask, OpenCV, NumPy, SciPy | QIM-DCT watermarking, video processing |
| **Fingerprinting** | PyTorch (CPU), ResNet-50, scikit-learn PCA | Perceptual hashing for content matching |
| **Video I/O** | MoviePy, imageio-ffmpeg | Frame extraction, audio preservation |
| **Backend** | Node.js, Express.js | API gateway, orchestration |
| **Database** | Firebase Firestore (Spark tier) | Real-time asset & violation storage |
| **PDF Generation** | pdf-lib | DMCA takedown notices |
| **Frontend** | React 18, Vite 5 | Dashboard, Forge, Scout UI |
| **Styling** | Vanilla CSS, Google Sans | Glassmorphism dark theme |
| **Package Mgmt** | uv (Python), npm (Node.js) | Dependency management |

---

## Project Structure

```
PhantomTAG/
├── engine/                     # Python Flask — Watermark & Fingerprint Engine
│   ├── app.py                  # Flask API (/forge, /scout, /health)
│   ├── watermark/
│   │   ├── qim_dct.py          # QIM-DCT embed/extract algorithms
│   │   ├── payload.py          # SHA-256 payload generation
│   │   └── video.py            # Frame-by-frame video processing
│   ├── fingerprint/
│   │   ├── cnn_hash.py         # ResNet-50 feature extraction + binary hash
│   │   └── pca_model.py        # PCA model save/load utilities
│   ├── storage/
│   │   └── local_store.py      # GCS-compatible local filesystem adapter
│   ├── models/                 # PCA model (generated, gitignored)
│   └── pyproject.toml          # uv project config
│
├── backend/                    # Node.js Express — API Gateway
│   ├── server.js               # Express server with multer uploads
│   ├── routes/
│   │   ├── assets.js           # POST /api/assets/register, GET /api/assets
│   │   ├── scout.js            # POST /api/suspect/analyze
│   │   ├── enforcer.js         # POST /api/enforce
│   │   ├── dashboard.js        # GET /api/dashboard/stats
│   │   └── mock-platform.js    # POST /platform/claim (Content ID sim)
│   ├── services/
│   │   ├── firestore.js        # Firebase Admin SDK + in-memory fallback
│   │   ├── pdf-generator.js    # DMCA PDF generation (pdf-lib)
│   │   └── email-simulator.js  # Email simulation service
│   └── package.json
│
├── frontend/                   # Vite + React — Dashboard UI
│   ├── index.html              # Entry with Google Sans fonts
│   ├── vite.config.js          # Dev server + API proxy config
│   ├── src/
│   │   ├── App.jsx             # Router (Dashboard, Forge, Scout, ViolationDetail)
│   │   ├── main.jsx            # React entry
│   │   ├── index.css           # Design system (glassmorphism, dark theme)
│   │   ├── config/firebase.js  # Firebase client SDK (env vars)
│   │   ├── components/         # Navbar, StatsCard, ViolationFeed, etc.
│   │   └── pages/              # Dashboard, Register, Scout, ViolationDetail
│   └── package.json
│
├── scripts/
│   ├── generate_test_video.py  # Synthetic sports test video generator
│   └── fit_pca_model.py        # PCA model fitting (run once before engine)
│
├── storage/                    # Local storage (gitignored)
│   ├── originals/
│   ├── watermarked/
│   ├── suspects/
│   └── dmca_pdfs/
│
└── .gitignore
```

---

## Getting Started

### Prerequisites

- **Python 3.11+** with [uv](https://docs.astral.sh/uv/)
- **Node.js 18+** with npm
- **ffmpeg** installed and on PATH
- **Firebase project** (free Spark tier) with Firestore in Native mode

### 1. Clone & Install

```bash
git clone https://github.com/DP16102005/PHANTOM-TAG.git
cd PHANTOM-TAG

# Python engine dependencies
cd engine
uv sync
uv pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
cd ..

# Node.js backend
cd backend
npm install
cd ..

# React frontend
cd frontend
npm install
cd ..
```

### 2. Configure Environment

```bash
# Backend — copy and fill in values
cp backend/.env.example backend/.env
# Place your Firebase Admin SDK key as backend/serviceAccountKey.json

# Frontend — copy and fill in Firebase web config
cp frontend/.env.example frontend/.env
```

**backend/.env:**
```env
ENGINE_URL=http://127.0.0.1:5001
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
PORT=3001
FRONTEND_URL=http://localhost:5173
```

**frontend/.env:**
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 3. Generate PCA Model (One-Time)

```bash
cd engine
uv run python ../scripts/generate_test_video.py
uv run python ../scripts/fit_pca_model.py
cd ..
```

### 4. Start All Services

Open 3 terminals:

```bash
# Terminal 1 — Engine (Port 5001)
cd engine
uv run python app.py

# Terminal 2 — Backend (Port 3001)
cd backend
node server.js

# Terminal 3 — Frontend (Port 5173)
cd frontend
npm run dev
```

Visit **http://localhost:5173** to access the dashboard.

---

## API Reference

### Engine (Flask — Port 5001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/forge` | Embed watermarks for all channels, return variants |
| `POST` | `/scout` | Extract watermark from suspect, match against channels |
| `GET`  | `/health` | Engine health + PCA model status |

### Backend (Express — Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/assets/register` | Upload video + channels → trigger Forge |
| `GET`  | `/api/assets` | List all registered assets |
| `GET`  | `/api/assets/:id` | Get single asset details |
| `POST` | `/api/suspect/analyze` | Upload suspect → trigger Scout |
| `POST` | `/api/enforce` | Generate DMCA PDF + send takedown |
| `GET`  | `/api/dashboard/stats` | Aggregated stats from Firestore |
| `GET`  | `/api/dashboard/violations` | All violations sorted by date |
| `GET`  | `/api/health` | Backend health check |

---

## Watermark Robustness

The QIM-DCT watermark is designed to survive common piracy attacks:

| Attack | Robustness |
|--------|-----------|
| H.264/H.265 Recompression | ✅ Survives (mid-frequency DCT coefficients) |
| Resolution Downscaling | ✅ Survives (watermark in spatial blocks) |
| Bitrate Reduction (CRF 35+) | ✅ Survives (quantization-resistant embedding) |
| Frame Cropping | ⚠️ Partial (depends on crop percentage) |
| Frame Rate Change | ✅ Survives (majority voting across frames) |
| Color Correction | ✅ Survives (embedded in luminance channel only) |
| Screenshot/Re-recording | ⚠️ Limited (geometric distortions) |

---

## Security Notes

- **Firebase API keys** in the frontend are restricted by Firebase Security Rules (not a secret per se, but kept in `.env` as best practice)
- **Service Account Key** (`serviceAccountKey.json`) is gitignored and must never be committed
- **All `.env` files** are gitignored — only `.env.example` templates are tracked
- **Firestore rules** should be hardened from test mode before any production use
- **Evidence hashes** use SHA-256 for tamper-proof forensic chain of custody

---

## Google Solution Challenge

This project was built for the **Google Solution Challenge** — a sprint to solve real-world problems using Google technologies.

**UN SDG Alignment:** SDG 16 — Peace, Justice, and Strong Institutions  
Protecting intellectual property rights of sports organizations and content creators.

**Google Technologies Used:**
- Firebase Firestore (real-time database)
- Firebase Admin SDK (server-side auth)
- Google Sans (typography)

---

## License

This project is built for educational and competition purposes. The watermarking algorithms (QIM-DCT) are based on published academic research.

---

<p align="center">
  Built with 🔮 by <strong>Howlers</strong>
</p>
