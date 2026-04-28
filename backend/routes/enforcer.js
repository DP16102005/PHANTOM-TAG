/**
 * Enforcer Routes — DMCA Takedown Enforcement
 *
 * POST /api/enforce — Generate DMCA PDF + simulate email + call mock platform
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { simulateEmailSend } = require('../services/email-simulator');
const { getViolation, updateViolation } = require('../services/firestore');

// POST /api/enforce
router.post('/', async (req, res) => {
  try {
    const { violation_id } = req.body;
    if (!violation_id) {
      return res.status(400).json({ error: 'violation_id is required' });
    }

    // Get violation data
    const violation = await getViolation(violation_id);
    if (!violation) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    console.log(`[ENFORCER] Processing takedown for violation: ${violation_id}`);

    // 1. Generate DMCA PDF and simulate email
    const emailResult = await simulateEmailSend(violation);

    // 2. Call mock platform API
    let platformResult = { status: 'skipped' };
    try {
      const platformResponse = await axios.post(
        `http://localhost:${process.env.PORT || 3001}/platform/claim`,
        {
          asset_id: violation.matched_asset_id,
          violation_id: violation_id,
          evidence_hash: violation.evidence_hash,
          channel_id: violation.matched_channel_id,
        },
        { timeout: 5000 }
      );
      platformResult = platformResponse.data;
    } catch (platformErr) {
      console.warn('[ENFORCER] Mock platform call failed:', platformErr.message);
    }

    // 3. Update violation status in Firestore
    await updateViolation(violation_id, {
      enforcement_status: 'dmca_sent',
      dmca_sent_at: new Date().toISOString(),
      dmca_pdf_path: emailResult.pdf_path,
      email_message_id: emailResult.message_id,
      platform_response: platformResult,
    });

    console.log(`[ENFORCER] Takedown completed for ${violation_id}`);

    res.json({
      status: 'success',
      violation_id,
      enforcement: {
        dmca_pdf: emailResult.pdf_filename,
        email_status: emailResult.status,
        email_details: emailResult.email,
        platform_response: platformResult,
      },
    });
  } catch (err) {
    console.error('[ENFORCER] Error:', err.message);
    res.status(500).json({ error: 'Enforcement failed', details: err.message });
  }
});

module.exports = router;
