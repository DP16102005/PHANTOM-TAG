/**
 * Phantom-Tag Backend — Firebase Admin SDK Service
 *
 * Initializes Firebase Admin and provides CRUD helpers for
 * assets and violations collections.
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './serviceAccountKey.json';

let db;
try {
  const serviceAccount = require(path.resolve(serviceAccountPath));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  db = admin.firestore();
  console.log('[FIRESTORE] Connected successfully');
} catch (err) {
  console.warn('[FIRESTORE] WARNING: Could not initialize Firebase Admin.');
  console.warn('[FIRESTORE] Error:', err.message);
  console.warn('[FIRESTORE] Running with in-memory mock. Place serviceAccountKey.json in backend/');

  // In-memory mock for development without Firebase
  const mockData = { assets: new Map(), violations: new Map() };
  db = {
    collection: (name) => ({
      doc: (id) => ({
        set: async (data) => { mockData[name]?.set(id, { ...data, id }); },
        get: async () => ({
          exists: mockData[name]?.has(id),
          data: () => mockData[name]?.get(id),
          id,
        }),
        update: async (data) => {
          const existing = mockData[name]?.get(id) || {};
          mockData[name]?.set(id, { ...existing, ...data });
        },
      }),
      add: async (data) => {
        const id = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        mockData[name]?.set(id, { ...data, id });
        return { id };
      },
      get: async () => ({
        docs: Array.from(mockData[name]?.entries() || []).map(([id, data]) => ({
          id,
          data: () => data,
        })),
        size: mockData[name]?.size || 0,
      }),
      where: () => ({
        get: async () => ({
          docs: [],
          size: 0,
        }),
      }),
      orderBy: () => ({
        limit: () => ({
          get: async () => ({
            docs: Array.from(mockData[name]?.entries() || [])
              .slice(0, 10)
              .map(([id, data]) => ({ id, data: () => data })),
          }),
        }),
      }),
    }),
    _mock: true,
  };
}

// ===== Asset CRUD =====

async function createAsset(assetData) {
  const docRef = db.collection('assets').doc(String(assetData.asset_id));
  await docRef.set({
    ...assetData,
    registered_at: new Date().toISOString(),
  });
  return { id: String(assetData.asset_id), ...assetData };
}

async function getAsset(assetId) {
  const doc = await db.collection('assets').doc(String(assetId)).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function getAllAssets() {
  const snapshot = await db.collection('assets').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function updateAsset(assetId, data) {
  await db.collection('assets').doc(String(assetId)).update(data);
}

// ===== Violation CRUD =====

async function createViolation(violationData) {
  const id = `vio_${Date.now()}`;
  const docRef = db.collection('violations').doc(id);
  await docRef.set({
    ...violationData,
    violation_id: id,
    detected_at: new Date().toISOString(),
    enforcement_status: 'pending',
    dmca_sent_at: null,
  });
  return { id, ...violationData };
}

async function getViolation(violationId) {
  const doc = await db.collection('violations').doc(violationId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function getAllViolations() {
  const snapshot = await db.collection('violations').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function updateViolation(violationId, data) {
  await db.collection('violations').doc(violationId).update(data);
}

// ===== Stats =====

async function getDashboardStats() {
  const assetsSnap = await db.collection('assets').get();
  const violationsSnap = await db.collection('violations').get();

  let dmcaSent = 0;
  let totalChannels = 0;
  violationsSnap.docs.forEach((doc) => {
    if (doc.data().enforcement_status === 'dmca_sent') dmcaSent++;
  });
  assetsSnap.docs.forEach((doc) => {
    const channels = doc.data().channels;
    if (Array.isArray(channels)) totalChannels += channels.length;
  });

  return {
    assets_secured: assetsSnap.size,
    total_channels: totalChannels,
    violations_detected: violationsSnap.size,
    dmca_sent: dmcaSent,
  };
}

module.exports = {
  db,
  createAsset,
  getAsset,
  getAllAssets,
  updateAsset,
  createViolation,
  getViolation,
  getAllViolations,
  updateViolation,
  getDashboardStats,
};
