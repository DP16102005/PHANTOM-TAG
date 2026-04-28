/**
 * Scout Routes — Suspect Video Analysis
 *
 * POST /api/suspect/analyze — Upload suspect video → call Flask /scout → log violation
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const {
  getAllAssets,
  createViolation,
} = require('../services/firestore');

const ENGINE_URL = process.env.ENGINE_URL || 'http://localhost:5001';
const STORAGE_ROOT = path.join(__dirname, '..', '..', 'storage');

// POST /api/suspect/analyze
router.post('/analyze', async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No suspect video uploaded' });
    }

    const { suspect_url } = req.body;

    // Save suspect file
    const suspectDir = path.join(STORAGE_ROOT, 'suspects');
    fs.mkdirSync(suspectDir, { recursive: true });
    const suspectFilename = `suspect_${Date.now()}.mp4`;
    const suspectPath = path.join(suspectDir, suspectFilename);
    fs.copyFileSync(req.file.path, suspectPath);

    console.log('[SCOUT] Analyzing suspect video...');

    // Get all registered assets for comparison
    const assets = await getAllAssets();
    if (assets.length === 0) {
      return res.status(400).json({
        error: 'No registered assets to compare against. Register an asset first.',
      });
    }

    // Build the channels_map and test_asset_ids for the engine
    const testAssetIds = assets.map((a) => a.asset_id);
    const channelsMap = {};
    assets.forEach((a) => {
      channelsMap[String(a.asset_id)] = (a.channels || []).map((ch) => ({
        channel_id: ch.channel_id,
        channel_name: ch.channel_name,
        watermark_bits: ch.watermark_bits,
      }));
    });

    // Call Flask /scout engine
    const form = new FormData();
    form.append('video', fs.createReadStream(suspectPath));
    form.append('test_asset_ids', JSON.stringify(testAssetIds));
    form.append('channels_map', JSON.stringify(channelsMap));
    form.append('delta', String(assets[0]?.delta || 25));
    form.append('watermark_length', String(assets[0]?.watermark_length || 80));

    const scoutResponse = await axios.post(`${ENGINE_URL}/scout`, form, {
      headers: form.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 300000,
    });

    const result = scoutResponse.data;

    // If match found, create a violation record
    if (result.status === 'match_found') {
      // Find the matched asset for metadata
      const matchedAsset = assets.find(
        (a) => a.asset_id === result.matched_asset_id
      );

      const violation = {
        suspect_url: suspect_url || 'Direct Upload',
        suspect_file: suspectFilename,
        suspect_path: suspectPath,
        matched_asset_id: result.matched_asset_id,
        matched_asset_title: matchedAsset?.title || `Asset ${result.matched_asset_id}`,
        matched_channel_id: result.matched_channel_id,
        matched_channel_name: result.matched_channel_name,
        confidence: result.confidence,
        watermark_hamming_distance: result.watermark_hamming_distance,
        fingerprint_hamming_distance: result.fingerprint_hamming_distance || null,
        evidence_hash: result.evidence_hash,
        interpretation: result.interpretation,
        owner_org: matchedAsset?.owner_org || 'Unknown',
        owner_email: matchedAsset?.owner_contact_email || '',
      };

      const created = await createViolation(violation);
      console.log(`[SCOUT] Violation logged: ${created.id}`);

      res.json({
        ...result,
        violation_id: created.id,
        matched_asset_title: violation.matched_asset_title,
      });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error('[SCOUT] Error:', err.message);
    res.status(500).json({
      error: 'Analysis failed',
      details: err.response?.data?.error || err.message,
    });
  }
});

module.exports = router;
