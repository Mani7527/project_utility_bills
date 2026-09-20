const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const Bill = require('../models/Bill');
const Reading = require('../models/Reading');
const User = require('../models/User');
const Tariff = require('../models/Tariff');

// GET /admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const [
      totalConsumers,
      totalMeters,
      billsGenerated,
      paidBillsCount,
      unpaidBillsCount,
      bills
    ] = await Promise.all([
      Consumer.countDocuments(),
      Meter.countDocuments(),
      Bill.countDocuments(),
      Bill.countDocuments({ status: 'PAID' }),
      Bill.countDocuments({ status: 'UNPAID' }),
      Bill.find().populate('consumerId').populate('meterId').sort({ createdAt: -1 }).limit(10)
    ]);

    // Aggregate total units billed & total collected revenue
    const allBills = await Bill.find();
    const totalUnitsBilled = allBills.reduce((acc, b) => acc + (b.unitsConsumed || 0), 0);
    const totalRevenuePaid = allBills
      .filter(b => b.status === 'PAID')
      .reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const totalOutstanding = allBills
      .filter(b => b.status === 'UNPAID')
      .reduce((acc, b) => acc + (b.totalAmount || 0), 0);

    // Top Consumers by Units Consumed
    const topConsumersAgg = await Bill.aggregate([
      {
        $group: {
          _id: '$consumerId',
          totalUnits: { $sum: '$unitsConsumed' },
          totalBilled: { $sum: '$totalAmount' },
          billCount: { $sum: 1 }
        }
      },
      { $sort: { totalUnits: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'consumers',
          localField: '_id',
          foreignField: '_id',
          as: 'consumer'
        }
      },
      { $unwind: '$consumer' }
    ]);

    // Monthly data for Chart.js (last 6 months or all months)
    const monthlyAgg = await Bill.aggregate([
      {
        $group: {
          _id: { month: '$billingMonth', year: '$billingYear' },
          totalUnits: { $sum: '$unitsConsumed' },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - Smart Utility Portal',
      user: req.session.user,
      stats: {
        totalConsumers,
        totalMeters,
        billsGenerated,
        paidBillsCount,
        unpaidBillsCount,
        totalUnitsBilled,
        totalRevenuePaid,
        totalOutstanding
      },
      topConsumers: topConsumersAgg,
      monthlyData: monthlyAgg,
      recentBills: bills
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    req.session.errorMessage = 'Could not load admin dashboard statistics.';
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      stats: { totalConsumers: 0, totalMeters: 0, billsGenerated: 0, paidBillsCount: 0, unpaidBillsCount: 0, totalUnitsBilled: 0, totalRevenuePaid: 0, totalOutstanding: 0 },
      topConsumers: [],
      monthlyData: [],
      recentBills: []
    });
  }
};

// GET /admin/tariffs
exports.getTariffs = async (req, res) => {
  try {
    const tariffs = await Tariff.find().sort({ connectionType: 1 });
    res.render('admin/tariffs', {
      title: 'Tariff Slabs Management - Admin',
      user: req.session.user,
      tariffs
    });
  } catch (error) {
    console.error('Tariff load error:', error);
    req.session.errorMessage = 'Error loading tariffs.';
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/tariffs
exports.createTariff = async (req, res) => {
  try {
    const { name, connectionType, fixedCharge, slabFrom, slabTo, slabRate } = req.body;

    const slabs = [];
    const fromArr = Array.isArray(slabFrom) ? slabFrom : [slabFrom];
    const toArr = Array.isArray(slabTo) ? slabTo : [slabTo];
    const rateArr = Array.isArray(slabRate) ? slabRate : [slabRate];

    for (let i = 0; i < fromArr.length; i++) {
      if (fromArr[i] !== undefined && rateArr[i] !== undefined && rateArr[i] !== '') {
        slabs.push({
          from: Number(fromArr[i]),
          to: toArr[i] && toArr[i].trim() !== '' ? Number(toArr[i]) : null,
          rate: Number(rateArr[i])
        });
      }
    }

    if (slabs.length === 0) {
      req.session.errorMessage = 'Please provide at least one valid tariff slab tier.';
      return res.redirect('/admin/tariffs');
    }

    await Tariff.create({
      name: name.trim(),
      connectionType: connectionType || 'Electricity',
      fixedCharge: Number(fixedCharge) || 100,
      slabs
    });

    req.session.successMessage = `Tariff plan '${name}' created successfully.`;
    res.redirect('/admin/tariffs');
  } catch (error) {
    console.error('Create tariff error:', error);
    req.session.errorMessage = 'Error creating tariff: ' + error.message;
    res.redirect('/admin/tariffs');
  }
};

// DELETE /admin/tariffs/:id
exports.deleteTariff = async (req, res) => {
  try {
    await Tariff.findByIdAndDelete(req.params.id);
    req.session.successMessage = 'Tariff slab deleted successfully.';
    res.redirect('/admin/tariffs');
  } catch (error) {
    console.error('Delete tariff error:', error);
    req.session.errorMessage = 'Error deleting tariff.';
    res.redirect('/admin/tariffs');
  }
};

// GET /admin/bills
exports.getAllBills = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['PAID', 'UNPAID'].includes(status.toUpperCase())) {
      filter.status = status.toUpperCase();
    }

    const bills = await Bill.find(filter)
      .populate('consumerId')
      .populate('meterId')
      .sort({ createdAt: -1 });

    res.render('admin/bills', {
      title: 'All Utility Bills - Admin',
      user: req.session.user,
      bills,
      selectedStatus: status || 'ALL'
    });
  } catch (error) {
    console.error('Admin bills error:', error);
    req.session.errorMessage = 'Failed to load bills.';
    res.redirect('/admin/dashboard');
  }
};

// GET /admin/users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, createdAt: -1 });
    res.render('admin/users', {
      title: 'System Users - Admin',
      user: req.session.user,
      users
    });
  } catch (error) {
    console.error('Users load error:', error);
    req.session.errorMessage = 'Failed to load system users.';
    res.redirect('/admin/dashboard');
  }
};
