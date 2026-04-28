/**
 * Asset Registration Routes
 *
 * POST /api/asset/register — Upload video + channels → trigger Forge
 * GET  /api/assets         — List all registered assets
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { createAsset, getAllAssets, getAsset } = require('../services/firestore');

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:5001';
const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage');

// POST /api/asset/register
router.post('/register', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const { title, owner_org, owner_email, channels, delta } = req.body;
    const parsedChannels = typeof channels === 'string' ? JSON.parse(channels) : channels;

    if (!parsedChannels || parsedChannels.length === 0) {
      return res.status(400).json({ error: 'At least one distribution channel required' });
    }

    // Generate asset ID
    const assetId = Date.now() % 100000;

    // Save uploaded file to originals
    const origDir = path.join(STORAGE_ROOT, 'originals');
    fs.mkdirSync(origDir, { recursive: true });
    const origFilename = `asset_${assetId}.mp4`;
    const origPath = path.join(origDir, origFilename);
    fs.copyFileSync(req.file.path, origPath);

    console.log(`[ASSETS] Registered asset ${assetId}: ${title}`);
    console.log(`[ASSETS] Calling Forge engine for ${parsedChannels.length} channels...`);

    // Call Flask /forge engine
    const form = new FormData();
    form.append('video', fs.createReadStream(origPath));
    form.append('asset_id', String(assetId));
    form.append('delta', String(delta || 25));
    form.append('channels', JSON.stringify(parsedChannels));

    const forgeResponse = await axios.post(`${ENGINE_URL}/forge`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000, // 5 min timeout for video processing
    });

    const forgeResult = forgeResponse.data;

    // Save to Firestore
    const assetDoc = {
      asset_id: assetId,
      title: title || `Asset ${assetId}`,
      owner_org: owner_org || 'Unknown',
      owner_contact_email: owner_email || '',
      original_path: origPath,
      delta: parseFloat(delta) || 25,
      watermark_length: 80,
      channels: forgeResult.channels.map((ch) => ({
        channel_id: ch.channel_id,
        channel_name: ch.channel_name,
        output_path: ch.output_path,
        watermark_bits: ch.watermark_bits,
        watermark_bits_hash: ch.watermark_bits_hash,
        fingerprint_hash: ch.fingerprint_hash || null,
        distributed_at: new Date().toISOString(),
      })),
      evidence_hash: forgeResult.evidence_hash,
      processing_time_seconds: forgeResult.processing_time_seconds,
    };

    await createAsset(assetDoc);
    console.log(`[ASSETS] Asset ${assetId} saved to Firestore`);

    res.json({
      status: 'success',
      asset_id: assetId,
      title: assetDoc.title,
      variants_created: forgeResult.variants_created,
      channels: forgeResult.channels,
      processing_time_seconds: forgeResult.processing_time_seconds,
    });
  } catch (err) {
    console.error('[ASSETS] Error:', err.message);
    if (err.response) {
      console.error('[ASSETS] Engine response:', err.response.data);
    }
    res.status(500).json({
      error: 'Asset registration failed',
      details: err.response?.data?.error || err.message,
    });
  }
});

// GET /api/assets
router.get('/', async (req, res) => {
  try {
    const assets = await getAllAssets();
    res.json({ assets, count: assets.length });
  } catch (err) {
    console.error('[ASSETS] Error fetching assets:', err.message);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', async (req, res) => {
  try {
    const asset = await getAsset(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

module.exports = router;
