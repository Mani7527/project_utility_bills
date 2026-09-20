const express = require('express');
const router = express.Router();
const consumerController = require('../controllers/consumerController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Consumer portal accessible by consumer role (or admin testing)
router.use(requireAuth, requireRole('consumer', 'admin'));

router.get('/dashboard', consumerController.getConsumerDashboard);
router.get('/bills', consumerController.getConsumerBillHistory);
router.get('/consumption', consumerController.getConsumerConsumptionHistory);

module.exports = router;
