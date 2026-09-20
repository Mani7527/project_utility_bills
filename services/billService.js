const Bill = require('../models/Bill');
const Consumer = require('../models/Consumer');
const Meter = require('../models/Meter');
const TariffService = require('./tariffService');
const { calculateBill } = require('../utils/billCalculator');

/**
 * Service handling automatic bill generation.
 */
class BillService {
  /**
   * Generates an official utility bill for a completed meter reading.
   *
   * @param {Object} reading - Reading document
   * @returns {Promise<Object>} Created Bill document
   */
  static async generateBillForReading(reading) {
    const consumer = await Consumer.findById(reading.consumerId);
    if (!consumer) {
      throw new Error(`Consumer not found for reading ID: ${reading._id}`);
    }

    const meter = await Meter.findById(reading.meterId);
    if (!meter) {
      throw new Error(`Meter not found for reading ID: ${reading._id}`);
    }

    // Resolve applicable tariff
    const tariff = await TariffService.getTariffForConsumer(consumer);

    // Calculate slab-wise billing
    const calc = calculateBill(reading.unitsConsumed, tariff.slabs, tariff.fixedCharge);

    // Calculate due date (15 days after reading date)
    const dueDate = new Date(reading.readingDate || Date.now());
    dueDate.setDate(dueDate.getDate() + 15);

    // Generate unique readable bill ID e.g. BIL1001
    const count = await Bill.countDocuments();
    const billNumber = (count + 1).toString().padStart(4, '0');
    const billId = `BIL${billNumber}`;

    // Create and save the bill
    const bill = new Bill({
      billId,
      consumerId: consumer._id,
      meterId: meter._id,
      readingId: reading._id,
      billingMonth: reading.month,
      billingYear: reading.year,
      previousReading: reading.previousReading,
      currentReading: reading.currentReading,
      unitsConsumed: reading.unitsConsumed,
      energyCharge: calc.energyCharge,
      fixedCharge: calc.fixedCharge,
      surcharge: 0,
      totalAmount: calc.totalAmount,
      dueDate,
      status: 'UNPAID',
      breakdown: calc.breakdown
    });

    await bill.save();
    return bill;
  }
}

module.exports = BillService;
