const express = require('express');
const router = express.Router();
const meterController = require('../controllers/meterController');
const { requireAuth } = require('../middleware/authMiddleware');

// API to get meter details (for meter reading auto-fill)
router.get('/api/:id/details', requireAuth, meterController.getMeterApiDetails);

module.exports = router;
