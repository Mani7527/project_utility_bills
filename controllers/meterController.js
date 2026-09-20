const Meter = require('../models/Meter');
const Consumer = require('../models/Consumer');

// GET /admin/meters (List meters)
exports.getAdminMeters = async (req, res) => {
  try {
    const [meters, unassignedConsumers] = await Promise.all([
      Meter.find().populate('consumerId').sort({ meterNumber: 1 }),
      Consumer.find({ meterId: null })
    ]);

    res.render('admin/meters', {
      title: 'Meter Management - Admin',
      user: req.session.user,
      meters,
      unassignedConsumers
    });
  } catch (error) {
    console.error('Get meters error:', error);
    req.session.errorMessage = 'Failed to load meters.';
    res.redirect('/admin/dashboard');
  }
};

// POST /admin/meters (Create meter)
exports.createMeter = async (req, res) => {
  try {
    const { meterNumber, connectionType, installationDate, lastReading, status, consumerId } = req.body;

    if (!meterNumber) {
      req.session.errorMessage = 'Meter number is required.';
      return res.redirect('/admin/meters');
    }

    const existing = await Meter.findOne({ meterNumber: meterNumber.toUpperCase().trim() });
    if (existing) {
      req.session.errorMessage = `Meter number ${meterNumber.toUpperCase()} already exists.`;
      return res.redirect('/admin/meters');
    }

    const meter = new Meter({
      meterNumber: meterNumber.toUpperCase().trim(),
      connectionType: connectionType || 'Electricity',
      installationDate: installationDate ? new Date(installationDate) : new Date(),
      lastReading: Number(lastReading) || 0,
      status: status || 'Active',
      consumerId: consumerId || null
    });

    await meter.save();

    // If assigned to consumer, link in consumer doc
    if (consumerId) {
      await Consumer.findByIdAndUpdate(consumerId, { meterId: meter._id });
    }

    req.session.successMessage = `Meter ${meter.meterNumber} created successfully.`;
    res.redirect('/admin/meters');
  } catch (error) {
    console.error('Create meter error:', error);
    req.session.errorMessage = 'Error adding meter: ' + error.message;
    res.redirect('/admin/meters');
  }
};

// POST /admin/meters/:id/edit (Update meter)
exports.updateMeter = async (req, res) => {
  try {
    const { connectionType, lastReading, status, consumerId } = req.body;
    const meter = await Meter.findById(req.params.id);

    if (!meter) {
      req.session.errorMessage = 'Meter not found.';
      return res.redirect('/admin/meters');
    }

    // Handle consumer assignment change
    if (meter.consumerId && meter.consumerId.toString() !== consumerId) {
      await Consumer.findByIdAndUpdate(meter.consumerId, { meterId: null });
    }
    if (consumerId) {
      await Consumer.findByIdAndUpdate(consumerId, { meterId: meter._id });
    }

    meter.connectionType = connectionType;
    if (lastReading !== undefined && lastReading !== '') {
      meter.lastReading = Number(lastReading);
    }
    meter.status = status;
    meter.consumerId = consumerId || null;

    await meter.save();

    req.session.successMessage = `Meter ${meter.meterNumber} updated successfully.`;
    res.redirect('/admin/meters');
  } catch (error) {
    console.error('Update meter error:', error);
    req.session.errorMessage = 'Error updating meter: ' + error.message;
    res.redirect('/admin/meters');
  }
};

// POST /admin/meters/:id/delete
exports.deleteMeter = async (req, res) => {
  try {
    const meter = await Meter.findById(req.params.id);
    if (!meter) {
      req.session.errorMessage = 'Meter not found.';
      return res.redirect('/admin/meters');
    }

    // Unlink consumer
    if (meter.consumerId) {
      await Consumer.findByIdAndUpdate(meter.consumerId, { meterId: null });
    }

    await Meter.findByIdAndDelete(req.params.id);

    req.session.successMessage = `Meter ${meter.meterNumber} deleted successfully.`;
    res.redirect('/admin/meters');
  } catch (error) {
    console.error('Delete meter error:', error);
    req.session.errorMessage = 'Error deleting meter.';
    res.redirect('/admin/meters');
  }
};

// GET /meters/api/:id/details (Used by Meter Reader dynamic form)
exports.getMeterApiDetails = async (req, res) => {
  try {
    const meter = await Meter.findById(req.params.id).populate('consumerId');
    if (!meter) {
      return res.status(404).json({ success: false, message: 'Meter not found' });
    }

    res.json({
      success: true,
      meterNumber: meter.meterNumber,
      lastReading: meter.lastReading,
      connectionType: meter.connectionType,
      consumer: meter.consumerId ? {
        id: meter.consumerId._id,
        consumerId: meter.consumerId.consumerId,
        name: meter.consumerId.name,
        address: meter.consumerId.address
      } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
