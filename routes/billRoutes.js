const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/:id', billController.getBillDetails);
router.post('/:id/pay', billController.payBill);

module.exports = router;
