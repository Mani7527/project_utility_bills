const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

router.use(requireAuth, requireRole('meter_reader', 'admin'));

router.get('/dashboard', readingController.getReaderDashboard);
router.get('/readings/new', readingController.getReadingForm);
router.post('/readings', readingController.postReading);

module.exports = router;
