const Meter = require('../models/Meter');
const Consumer = require('../models/Consumer');
const Reading = require('../models/Reading');
const Bill = require('../models/Bill');
const BillService = require('../services/billService');

// GET /meter-reader/dashboard
exports.getReaderDashboard = async (req, res) => {
  try {
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    const [totalMeters, allReadings, activeMeters] = await Promise.all([
      Meter.countDocuments({ status: 'Active' }),
      Reading.find({ enteredBy: req.session.user._id })
        .populate('meterId')
        .populate('consumerId')
        .sort({ createdAt: -1 }),
      Meter.find({ status: 'Active' }).populate('consumerId')
    ]);

    // Check which meters have had a reading entered this month
    const thisMonthReadings = await Reading.find({
      month: currentMonth,
      year: currentYear
    });
    const readMeterIds = new Set(thisMonthReadings.map(r => r.meterId.toString()));
    const pendingReadingsCount = activeMeters.filter(m => !readMeterIds.has(m._id.toString())).length;

    res.render('meterReader/dashboard', {
      title: 'Meter Reader Dashboard',
      user: req.session.user,
      stats: {
        totalMeters,
        readingsEntered: allReadings.length,
        pendingReadings: pendingReadingsCount
      },
      recentReadings: allReadings.slice(0, 8),
      currentMonth,
      currentYear
    });
  } catch (error) {
    console.error('Reader dashboard error:', error);
    req.session.errorMessage = 'Failed to load meter reader dashboard.';
    res.redirect('/auth/login');
  }
};

// GET /meter-reader/readings/new
exports.getReadingForm = async (req, res) => {
  try {
    const meters = await Meter.find({ status: 'Active', consumerId: { $ne: null } })
      .populate('consumerId')
      .sort({ meterNumber: 1 });

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    res.render('meterReader/reading-form', {
      title: 'Enter Meter Reading',
      user: req.session.user,
      meters,
      currentMonth,
      currentYear,
      selectedMeterId: req.query.meterId || ''
    });
  } catch (error) {
    console.error('Get reading form error:', error);
    req.session.errorMessage = 'Failed to open reading form.';
    res.redirect('/meter-reader/dashboard');
  }
};

// POST /meter-reader/readings (Submit meter reading)
exports.postReading = async (req, res) => {
  try {
    const { meterId, currentReading, readingDate, month, year } = req.body;

    if (!meterId || currentReading === undefined || currentReading === '') {
      req.session.errorMessage = 'Please select a meter and provide a valid reading.';
      return res.redirect('/meter-reader/readings/new');
    }

    const meter = await Meter.findById(meterId).populate('consumerId');
    if (!meter) {
      req.session.errorMessage = 'Meter not found.';
      return res.redirect('/meter-reader/readings/new');
    }

    if (!meter.consumerId) {
      req.session.errorMessage = 'Cannot enter reading: this meter is not assigned to any consumer.';
      return res.redirect('/meter-reader/readings/new');
    }

    const previousReading = Number(meter.lastReading) || 0;
    const newReading = Number(currentReading);

    // ========================================================
    // CRITICAL BUSINESS RULE:
    // newReading MUST NOT be smaller than previousReading.
    // If newReading < previousReading, reject and do not save!
    // ========================================================
    if (newReading < previousReading) {
      req.session.errorMessage =
        'Invalid reading: New meter reading cannot be lower than the previous reading.';
      return res.redirect(`/meter-reader/readings/new?meterId=${meter._id}`);
    }

    // Check if reading for this meter, month and year was already submitted
    const existingReading = await Reading.findOne({
      meterId: meter._id,
      month: month || new Date().toLocaleString('default', { month: 'long' }),
      year: Number(year) || new Date().getFullYear()
    });
    if (existingReading) {
      req.session.errorMessage = `A reading has already been recorded for ${meter.meterNumber} in ${month} ${year}.`;
      return res.redirect('/meter-reader/readings/new');
    }

    const unitsConsumed = newReading - previousReading;

    // 1. Create and save Reading record
    const reading = new Reading({
      meterId: meter._id,
      consumerId: meter.consumerId._id,
      previousReading,
      currentReading: newReading,
      unitsConsumed,
      readingDate: readingDate ? new Date(readingDate) : new Date(),
      month: month || new Date().toLocaleString('default', { month: 'long' }),
      year: Number(year) || new Date().getFullYear(),
      enteredBy: req.session.user._id
    });

    await reading.save();

    // 2. Update meter's lastReading
    meter.lastReading = newReading;
    await meter.save();

    // 3. Automatic Bill Generation
    const bill = await BillService.generateBillForReading(reading);

    req.session.successMessage = `Reading recorded successfully! Consumed: ${unitsConsumed} units. Bill #${bill.billId} generated for ₹${bill.totalAmount}.`;
    res.redirect('/meter-reader/dashboard');
  } catch (error) {
    console.error('Submit reading error:', error);
    req.session.errorMessage = 'Error saving reading: ' + error.message;
    res.redirect('/meter-reader/readings/new');
  }
};
