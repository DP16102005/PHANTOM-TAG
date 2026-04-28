/**
 * Dashboard Routes
 *
 * GET /api/dashboard/stats — Aggregated stats from Firestore
 */

const express = require('express');
const router = express.Router();
const { getDashboardStats, getAllViolations } = require('../services/firestore');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getDashboardStats();
    res.json(stats);
  } catch (err) {
    console.error('[DASHBOARD] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/violations
router.get('/violations', async (req, res) => {
  try {
    const violations = await getAllViolations();
    // Sort by detected_at descending
    violations.sort((a, b) => {
      const dateA = a.detected_at || '';
      const dateB = b.detected_at || '';
      return dateB.localeCompare(dateA);
    });
    res.json({ violations, count: violations.length });
  } catch (err) {
    console.error('[DASHBOARD] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

module.exports = router;
