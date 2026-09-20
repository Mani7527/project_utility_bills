const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const Tariff = require('../models/Tariff');
const Bill = require('../models/Bill');
const Reading = require('../models/Reading');
const User = require('../models/User');
const { calculateLateSurcharge } = require('../utils/surchargeCalculator');

// ================= ADMIN CONSUMER MANAGEMENT ================= //

// GET /admin/consumers (Admin view)
exports.getAdminConsumers = async (req, res) => {
  try {
    const [consumers, unassignedMeters, tariffs] = await Promise.all([
      Consumer.find().populate('meterId').populate('tariffId').sort({ createdAt: -1 }),
      Meter.find({ consumerId: null, status: 'Active' }),
      Tariff.find()
    ]);

    res.render('admin/consumers', {
      title: 'Manage Consumers - Admin',
      user: req.session.user,
      consumers,
      unassignedMeters,
      tariffs
    });
  } catch (error) {
    console.error('Get consumers error:', error);
    req.session.errorMessage = 'Failed to load consumers.';
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/consumers (Create consumer)
exports.createConsumer = async (req, res) => {
  try {
    const { name, email, phone, address, connectionType, meterId, tariffId, password } = req.body;

    if (!name || !email || !phone || !address) {
      req.session.errorMessage = 'Name, email, phone, and address are mandatory.';
      return res.redirect('/admin/consumers');
    }

    // Auto-generate consumerId e.g. CON001
    const count = await Consumer.countDocuments();
    const consumerId = `CON${(count + 1).toString().padStart(3, '0')}`;

    const consumer = new Consumer({
      consumerId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      connectionType: connectionType || 'Electricity',
      meterId: meterId || null,
      tariffId: tariffId || null
    });

    await consumer.save();

    // If meter was assigned, update the meter doc with this consumer's id
    if (meterId) {
      await Meter.findByIdAndUpdate(meterId, { consumerId: consumer._id });
    }

    // Create a login User for this consumer if email doesn't exist
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (!existingUser) {
      await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password || 'Consumer@123',
        role: 'consumer',
        consumerRef: consumer._id
      });
    }

    req.session.successMessage = `Consumer ${consumer.name} (${consumerId}) added successfully.`;
    res.redirect('/admin/consumers');
  } catch (error) {
    console.error('Create consumer error:', error);
    req.session.errorMessage = 'Error adding consumer: ' + error.message;
    res.redirect('/admin/consumers');
  }
};

// POST /admin/consumers/:id/edit (Update consumer)
exports.updateConsumer = async (req, res) => {
  try {
    const { name, email, phone, address, connectionType, meterId, tariffId } = req.body;
    const consumer = await Consumer.findById(req.params.id);

    if (!consumer) {
      req.session.errorMessage = 'Consumer not found.';
      return res.redirect('/admin/consumers');
    }

    // If meter changed, update old and new meter docs
    if (consumer.meterId && consumer.meterId.toString() !== meterId) {
      await Meter.findByIdAndUpdate(consumer.meterId, { consumerId: null });
    }
    if (meterId) {
      await Meter.findByIdAndUpdate(meterId, { consumerId: consumer._id });
    }

    consumer.name = name.trim();
    consumer.email = email.toLowerCase().trim();
    consumer.phone = phone.trim();
    consumer.address = address.trim();
    consumer.connectionType = connectionType;
    consumer.meterId = meterId || null;
    consumer.tariffId = tariffId || null;

    await consumer.save();

    req.session.successMessage = `Consumer ${consumer.consumerId} updated successfully.`;
    res.redirect('/admin/consumers');
  } catch (error) {
    console.error('Update consumer error:', error);
    req.session.errorMessage = 'Error updating consumer: ' + error.message;
    res.redirect('/admin/consumers');
  }
};

// POST /admin/consumers/:id/delete
exports.deleteConsumer = async (req, res) => {
  try {
    const consumer = await Consumer.findById(req.params.id);
    if (!consumer) {
      req.session.errorMessage = 'Consumer not found.';
      return res.redirect('/admin/consumers');
    }

    // Unlink meter if assigned
    if (consumer.meterId) {
      await Meter.findByIdAndUpdate(consumer.meterId, { consumerId: null });
    }

    // Delete associated user account
    await User.deleteMany({ consumerRef: consumer._id });

    await Consumer.findByIdAndDelete(req.params.id);

    req.session.successMessage = `Consumer ${consumer.consumerId} deleted successfully.`;
    res.redirect('/admin/consumers');
  } catch (error) {
    console.error('Delete consumer error:', error);
    req.session.errorMessage = 'Error deleting consumer.';
    res.redirect('/admin/consumers');
  }
};

// ================= CONSUMER SELF PORTAL ================= //

// GET /consumer/dashboard
exports.getConsumerDashboard = async (req, res) => {
  try {
    // Find consumer by session's consumerRef or email
    let consumer = null;
    if (req.session.user.consumerRef) {
      consumer = await Consumer.findById(req.session.user.consumerRef).populate('meterId').populate('tariffId');
    }
    if (!consumer) {
      consumer = await Consumer.findOne({ email: req.session.user.email }).populate('meterId').populate('tariffId');
    }

    if (!consumer) {
      return res.render('consumer/dashboard', {
        title: 'Consumer Portal',
        user: req.session.user,
        consumer: null,
        currentBill: null,
        recentReadings: [],
        stats: { totalBilled: 0, pendingBills: 0 }
      });
    }

    // Fetch latest bill
    const latestBill = await Bill.findOne({ consumerId: consumer._id }).sort({ createdAt: -1 });

    // Check & apply late surcharge dynamically if unpaid and past due
    if (latestBill && latestBill.status === 'UNPAID') {
      const surchargeCheck = calculateLateSurcharge(latestBill);
      if (surchargeCheck.hasSurchargeApplied && latestBill.surcharge !== surchargeCheck.surchargeAmount) {
        latestBill.surcharge = surchargeCheck.surchargeAmount;
        latestBill.totalAmount = surchargeCheck.updatedTotal;
        await latestBill.save();
      }
    }

    // Fetch recent readings for consumption preview
    const recentReadings = await Reading.find({ consumerId: consumer._id })
      .sort({ createdAt: -1 })
      .limit(5);

    // Summary stats
    const allBills = await Bill.find({ consumerId: consumer._id });
    const pendingBillsCount = allBills.filter(b => b.status === 'UNPAID').length;
    const totalBilled = allBills.reduce((acc, b) => acc + b.totalAmount, 0);

    res.render('consumer/dashboard', {
      title: 'Consumer Dashboard - Smart Utility Portal',
      user: req.session.user,
      consumer,
      currentBill: latestBill,
      recentReadings,
      stats: {
        totalBilled,
        pendingBills: pendingBillsCount
      }
    });
  } catch (error) {
    console.error('Consumer dashboard error:', error);
    req.session.errorMessage = 'Could not load consumer dashboard.';
    res.redirect('/auth/login');
  }
};

// GET /consumer/bills
exports.getConsumerBillHistory = async (req, res) => {
  try {
    let consumer = null;
    if (req.session.user.consumerRef) {
      consumer = await Consumer.findById(req.session.user.consumerRef);
    }
    if (!consumer) {
      consumer = await Consumer.findOne({ email: req.session.user.email });
    }

    if (!consumer) {
      req.session.errorMessage = 'Consumer record not found.';
      return res.redirect('/consumer/dashboard');
    }

    const bills = await Bill.find({ consumerId: consumer._id }).sort({ createdAt: -1 });

    // Update surcharges on any unpaid overdue bills
    for (const bill of bills) {
      if (bill.status === 'UNPAID') {
        const surchargeCheck = calculateLateSurcharge(bill);
        if (surchargeCheck.hasSurchargeApplied && bill.surcharge !== surchargeCheck.surchargeAmount) {
          bill.surcharge = surchargeCheck.surchargeAmount;
          bill.totalAmount = surchargeCheck.updatedTotal;
          await bill.save();
        }
      }
    }

    res.render('consumer/bill-history', {
      title: 'Bill History - Consumer Portal',
      user: req.session.user,
      consumer,
      bills
    });
  } catch (error) {
    console.error('Bill history error:', error);
    req.session.errorMessage = 'Failed to load bill history.';
    res.redirect('/consumer/dashboard');
  }
};

// GET /consumer/consumption
exports.getConsumerConsumptionHistory = async (req, res) => {
  try {
    let consumer = null;
    if (req.session.user.consumerRef) {
      consumer = await Consumer.findById(req.session.user.consumerRef);
    }
    if (!consumer) {
      consumer = await Consumer.findOne({ email: req.session.user.email });
    }

    if (!consumer) {
      req.session.errorMessage = 'Consumer record not found.';
      return res.redirect('/consumer/dashboard');
    }

    const readings = await Reading.find({ consumerId: consumer._id }).sort({ createdAt: -1 });

    res.render('consumer/consumption-history', {
      title: 'Consumption History - Consumer Portal',
      user: req.session.user,
      consumer,
      readings
    });
  } catch (error) {
    console.error('Consumption history error:', error);
    req.session.errorMessage = 'Failed to load consumption history.';
    res.redirect('/consumer/dashboard');
  }
};
