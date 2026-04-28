/**
 * Mock Social Platform API
 *
 * Simulates what a platform-level partnership (YouTube Content ID, etc.)
 * would enable. Returns a mock "content locked" response.
 *
 * IMPORTANT: This is a simulation. Real platform API integration requires
 * a business partnership agreement (YouTube Content ID, etc.).
 */

const express = require('express');
const router = express.Router();

// POST /platform/claim
router.post('/claim', (req, res) => {
  const { asset_id, violation_id, evidence_hash, channel_id } = req.body;

  console.log('\n' + '='.repeat(60));
  console.log('🛡️  [MOCK PLATFORM] Content Claim Received');
  console.log('='.repeat(60));
  console.log(`  Asset ID:      ${asset_id}`);
  console.log(`  Violation ID:  ${violation_id}`);
  console.log(`  Evidence Hash: ${evidence_hash}`);
  console.log(`  Channel ID:    ${channel_id}`);
  console.log(`  Action:        Content locked + Revenue rerouted`);
  console.log('='.repeat(60) + '\n');

  res.json({
    status: 'content_locked',
    action: 'revenue_rerouted_to_owner',
    platform: 'MockTube',
    claim_id: `claim_${Date.now()}`,
    message: 'Content has been flagged and revenue redirected to the rights holder.',
    note: 'This is a simulation of platform-level M2M integration.',
  });
});

module.exports = router;
