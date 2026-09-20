/**
 * Calculates late payment surcharge (5%) if the bill is UNPAID and overdue.
 * Prevents duplicate surcharge calculations.
 *
 * @param {Object} bill - Mongoose Bill document or bill plain object
 * @param {Date} [currentDate] - Reference date, defaults to now
 * @returns {Object} { hasSurchargeApplied, surchargeAmount, updatedTotal }
 */
function calculateLateSurcharge(bill, currentDate = new Date()) {
  const isUnpaid = bill.status === 'UNPAID';
  const isPastDue = new Date(currentDate) > new Date(bill.dueDate);
  const baseAmount = Number(bill.energyCharge || 0) + Number(bill.fixedCharge || 0);

  // If already has surcharge applied, return existing values without compounding
  if (bill.surcharge && bill.surcharge > 0) {
    return {
      hasSurchargeApplied: true,
      surchargeAmount: bill.surcharge,
      updatedTotal: Math.round((baseAmount + bill.surcharge) * 100) / 100
    };
  }

  // If unpaid and past due, apply 5% surcharge
  if (isUnpaid && isPastDue) {
    const surchargeRate = 0.05; // 5% late fee
    const surchargeAmount = Math.round((baseAmount * surchargeRate) * 100) / 100;
    const updatedTotal = Math.round((baseAmount + surchargeAmount) * 100) / 100;

    return {
      hasSurchargeApplied: true,
      surchargeAmount,
      updatedTotal
    };
  }

  // No surcharge
  return {
    hasSurchargeApplied: false,
    surchargeAmount: 0,
    updatedTotal: Math.round(baseAmount * 100) / 100
  };
}

module.exports = { calculateLateSurcharge };
