const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const consumerController = require('../controllers/consumerController');
const meterController = require('../controllers/meterController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

// Apply auth and admin-role enforcement across all admin routes
router.use(requireAuth, requireRole('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// Consumers CRUD
router.get('/consumers', consumerController.getAdminConsumers);
router.post('/consumers', consumerController.createConsumer);
router.post('/consumers/:id/edit', consumerController.updateConsumer);
router.post('/consumers/:id/delete', consumerController.deleteConsumer);

// Meters CRUD
router.get('/meters', meterController.getAdminMeters);
router.post('/meters', meterController.createMeter);
router.post('/meters/:id/edit', meterController.updateMeter);
router.post('/meters/:id/delete', meterController.deleteMeter);

// Tariffs
router.get('/tariffs', adminController.getTariffs);
router.post('/tariffs', adminController.createTariff);
router.post('/tariffs/:id/delete', adminController.deleteTariff);

// Bills & Users Overview
router.get('/bills', adminController.getAllBills);
router.get('/users', adminController.getUsers);

module.exports = router;
