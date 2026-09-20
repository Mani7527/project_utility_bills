const Bill = require('../models/Bill');
const Consumer = require('../models/Consumer');
const { calculateLateSurcharge } = require('../utils/surchargeCalculator');

// GET /bills/:id
exports.getBillDetails = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('consumerId')
      .populate('meterId');

    if (!bill) {
      return res.status(404).render('error', {
        title: 'Bill Not Found',
        statusCode: 404,
        message: 'The requested utility bill does not exist.',
        user: req.session.user
      });
    }

    // Authorization check: If consumer, verify this bill belongs to them
    if (req.session.user.role === 'consumer') {
      const consumer = await Consumer.findOne({
        $or: [
          { _id: req.session.user.consumerRef },
          { email: req.session.user.email }
        ]
      });

      if (!consumer || bill.consumerId._id.toString() !== consumer._id.toString()) {
        return res.status(403).render('error', {
          title: 'Unauthorized',
          statusCode: 403,
          message: 'You are not authorized to view this bill.',
          user: req.session.user
        });
      }
    }

    // Apply late surcharge if overdue and unpaid (without duplicate compounding)
    if (bill.status === 'UNPAID') {
      const surchargeCheck = calculateLateSurcharge(bill);
      if (surchargeCheck.hasSurchargeApplied && bill.surcharge !== surchargeCheck.surchargeAmount) {
        bill.surcharge = surchargeCheck.surchargeAmount;
        bill.totalAmount = surchargeCheck.updatedTotal;
        await bill.save();
      }
    }

    res.render('consumer/current-bill', {
      title: `Utility Bill #${bill.billId}`,
      user: req.session.user,
      bill
    });
  } catch (error) {
    console.error('Get bill details error:', error);
    req.session.errorMessage = 'Failed to load bill details.';
    res.redirect('/');
  }
};

// POST /bills/:id/pay (Simulated Payment)
exports.payBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('consumerId');

    if (!bill) {
      req.session.errorMessage = 'Bill not found.';
      return res.redirect('/consumer/dashboard');
    }

    // Authorization check for consumer
    if (req.session.user.role === 'consumer') {
      const consumer = await Consumer.findOne({
        $or: [
          { _id: req.session.user.consumerRef },
          { email: req.session.user.email }
        ]
      });

      if (!consumer || bill.consumerId._id.toString() !== consumer._id.toString()) {
        req.session.errorMessage = 'You cannot pay a bill that does not belong to you.';
        return res.redirect('/consumer/dashboard');
      }
    }

    if (bill.status === 'PAID') {
      req.session.errorMessage = 'This bill has already been paid.';
      return res.redirect(`/bills/${bill._id}`);
    }

    // Check if late fee applies prior to payment
    const surchargeCheck = calculateLateSurcharge(bill);
    if (surchargeCheck.hasSurchargeApplied && bill.surcharge !== surchargeCheck.surchargeAmount) {
      bill.surcharge = surchargeCheck.surchargeAmount;
      bill.totalAmount = surchargeCheck.updatedTotal;
    }

    // Update to PAID
    bill.status = 'PAID';
    bill.paymentDate = new Date();
    await bill.save();

    req.session.successMessage = `Payment of ₹${bill.totalAmount} recorded successfully for Bill #${bill.billId}! (Simulated Payment)`;
    res.redirect(`/bills/${bill._id}`);
  } catch (error) {
    console.error('Pay bill error:', error);
    req.session.errorMessage = 'Payment processing failed. Please try again.';
    res.redirect(`/bills/${req.params.id}`);
  }
};
